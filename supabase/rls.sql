-- TradeLogic Row Level Security (segunda capa de aislamiento multiempresa)
--
-- El filtro primario ya vive en cada ruta de apps/api (siempre WHERE
-- organizationId = <org del token>, nunca confiado del cliente). Esto es
-- una segunda capa: si algun query app-level llegara a olvidarlo, RLS
-- bloquea la fila igual.
--
-- packages/db/src/index.ts (scopeToOrganization) fija app.current_org_id
-- por operacion, dentro de una transaccion, antes de cada query. Las
-- politicas de abajo comparan organizationId (directo o via join al padre)
-- contra esa variable de sesion.
--
-- ADVERTENCIA REAL (nos paso en produccion): el SQL editor de Supabase
-- auto-activa RLS, sin ninguna politica, en cualquier tabla creada a
-- traves de el. Eso bloquea TODO acceso no-owner por defecto, no solo
-- lectura entre organizaciones. Si agregas una tabla nueva via SQL editor,
-- verifica su estado con la query de abajo antes de asumir que "no la tocamos
-- así que esta abierta":
--
--   SELECT relname, relrowsecurity, relforcerowsecurity,
--          (SELECT count(*) FROM pg_policies WHERE pg_policies.tablename = pg_class.relname) AS policy_count
--   FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind = 'r' ORDER BY relname;
--
-- Ejecutar en el SQL editor de Supabase despues de supabase/init.sql, y de
-- nuevo cada vez que se agregue una tabla nueva. Re-ejecutable: los
-- "drop policy if exists" evitan errores si ya corrio antes.

create or replace function app_current_org_id() returns uuid as $$
  select nullif(current_setting('app.current_org_id', true), '')::uuid
$$ language sql stable;

-- Tablas con organizationId propio: politica directa.
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'Product', 'ClassificationCase', 'Document', 'Alert', 'CostScenario',
    'AuditEvent', 'IdempotencyRecord'
  ]
  loop
    execute format('alter table %I enable row level security', tbl);
    execute format('alter table %I force row level security', tbl);
    execute format('drop policy if exists %I on %I', tbl || '_org_isolation', tbl);
    execute format(
      'create policy %I on %I using ("organizationId" = app_current_org_id()) with check ("organizationId" = app_current_org_id())',
      tbl || '_org_isolation', tbl
    );
  end loop;
end $$;

-- Tablas hijas sin organizationId propio: heredan el aislamiento de su
-- padre via EXISTS. No usar un loop generico aqui porque cada una referencia
-- una tabla y columna padre distinta.
alter table "ProductVersion" enable row level security;
alter table "ProductVersion" force row level security;
drop policy if exists "ProductVersion_org_isolation" on "ProductVersion";
create policy "ProductVersion_org_isolation" on "ProductVersion"
  using (exists (select 1 from "Product" where "Product".id = "ProductVersion"."productId" and "Product"."organizationId" = app_current_org_id()))
  with check (exists (select 1 from "Product" where "Product".id = "ProductVersion"."productId" and "Product"."organizationId" = app_current_org_id()));

alter table "ClassificationCandidate" enable row level security;
alter table "ClassificationCandidate" force row level security;
drop policy if exists "ClassificationCandidate_org_isolation" on "ClassificationCandidate";
create policy "ClassificationCandidate_org_isolation" on "ClassificationCandidate"
  using (exists (select 1 from "ClassificationCase" where "ClassificationCase".id = "ClassificationCandidate"."caseId" and "ClassificationCase"."organizationId" = app_current_org_id()))
  with check (exists (select 1 from "ClassificationCase" where "ClassificationCase".id = "ClassificationCandidate"."caseId" and "ClassificationCase"."organizationId" = app_current_org_id()));

alter table "EvidenceLink" enable row level security;
alter table "EvidenceLink" force row level security;
drop policy if exists "EvidenceLink_org_isolation" on "EvidenceLink";
create policy "EvidenceLink_org_isolation" on "EvidenceLink"
  using (exists (select 1 from "ClassificationCase" where "ClassificationCase".id = "EvidenceLink"."caseId" and "ClassificationCase"."organizationId" = app_current_org_id()))
  with check (exists (select 1 from "ClassificationCase" where "ClassificationCase".id = "EvidenceLink"."caseId" and "ClassificationCase"."organizationId" = app_current_org_id()));

alter table "HumanReview" enable row level security;
alter table "HumanReview" force row level security;
drop policy if exists "HumanReview_org_isolation" on "HumanReview";
create policy "HumanReview_org_isolation" on "HumanReview"
  using (exists (select 1 from "ClassificationCase" where "ClassificationCase".id = "HumanReview"."caseId" and "ClassificationCase"."organizationId" = app_current_org_id()))
  with check (exists (select 1 from "ClassificationCase" where "ClassificationCase".id = "HumanReview"."caseId" and "ClassificationCase"."organizationId" = app_current_org_id()));

-- organizationId es opcional aqui (un impacto regulatorio puede aplicar a
-- todas las organizaciones): null es visible para todos, no null se filtra.
alter table "RegulatoryImpact" enable row level security;
alter table "RegulatoryImpact" force row level security;
drop policy if exists "RegulatoryImpact_org_isolation" on "RegulatoryImpact";
create policy "RegulatoryImpact_org_isolation" on "RegulatoryImpact"
  using ("organizationId" is null or "organizationId" = app_current_org_id())
  with check ("organizationId" is null or "organizationId" = app_current_org_id());

-- Tablas sin organizationId propio ni scoping significativo: identidad
-- (User/Organization/Membership, ya mediadas por completo por apps/api/src/auth.ts)
-- o catalogos/datos compartidos entre organizaciones (TariffCode = LIGIE,
-- RegulatorySource/RegulatoryProvision = DOF, FxRate = Banxico). RLS no
-- aporta nada aqui y el SQL editor las habilita solo por default; se
-- desactiva explicitamente para que no queden bloqueadas por accidente.
alter table "User" disable row level security;
alter table "Organization" disable row level security;
alter table "Membership" disable row level security;
alter table "TariffCode" disable row level security;
alter table "RegulatorySource" disable row level security;
alter table "RegulatoryProvision" disable row level security;
alter table "FxRate" disable row level security;

-- CRITICO: el usuario "postgres" que trae DATABASE_URL por defecto en
-- Supabase es superusuario y los superusuarios (igual que cualquier rol con
-- BYPASSRLS) ignoran RLS siempre, sin importar cuantas politicas existan.
-- Si la API sigue conectada como "postgres", esta migracion no protege nada
-- en la practica. Por eso se crea un rol de aplicacion dedicado, sin
-- BYPASSRLS, y DATABASE_URL/DIRECT_URL deben apuntar a el (ya se hizo:
-- ver .env local, no commiteado).

do $$ begin
  create role app_user with login password 'REEMPLAZAR_ANTES_DE_USAR' noinherit;
exception when duplicate_object then null; end $$;

grant usage on schema public to app_user;
grant select, insert, update, delete on all tables in schema public to app_user;
grant usage, select on all sequences in schema public to app_user;
grant create on schema public to app_user;
alter default privileges in schema public
  grant select, insert, update, delete on tables to app_user;

-- Despues de correr esto: cambiar la password real con
--   alter role app_user with password '<password-fuerte>';
-- y actualizar DATABASE_URL/DIRECT_URL en .env para usar
-- postgresql://app_user:<password>@<host>:5432/postgres en vez de "postgres".
-- El GRANT CREATE es necesario para que `prisma migrate` pueda gestionar
-- su propia tabla _prisma_migrations conectado como app_user.

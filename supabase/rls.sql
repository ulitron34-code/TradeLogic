-- TradeLogic Row Level Security (segunda capa de aislamiento multiempresa)
--
-- El filtro primario ya vive en cada ruta de apps/api (siempre WHERE
-- organizationId = <org del token>, nunca confiado del cliente). Esto es
-- una segunda capa: si algun query app-level llegara a olvidarlo, RLS
-- bloquea la fila igual.
--
-- packages/db/src/index.ts (scopeToOrganization) fija app.current_org_id
-- por operacion, dentro de una transaccion, antes de cada query. Estas
-- politicas comparan organizationId contra esa variable de sesion.
--
-- Ejecutar en el SQL editor de Supabase despues de supabase/init.sql, y de
-- nuevo cada vez que se agregue una tabla nueva con organizationId.
-- Re-ejecutable: los "drop policy if exists" evitan errores si ya corrio antes.

create or replace function app_current_org_id() returns uuid as $$
  select nullif(current_setting('app.current_org_id', true), '')::uuid
$$ language sql stable;

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

-- CRITICO: el usuario "postgres" que trae DATABASE_URL por defecto en
-- Supabase es superusuario y los superusuarios (igual que cualquier rol con
-- BYPASSRLS) ignoran RLS siempre, sin importar cuantas politicas existan.
-- Si la API sigue conectada como "postgres", esta migracion no protege nada
-- en la practica. Por eso se crea un rol de aplicacion dedicado, sin
-- BYPASSRLS, y DATABASE_URL/DIRECT_URL deben apuntar a el.

do $$ begin
  create role app_user with login password 'REEMPLAZAR_ANTES_DE_USAR' noinherit;
exception when duplicate_object then null; end $$;

grant usage on schema public to app_user;
grant select, insert, update, delete on all tables in schema public to app_user;
grant usage, select on all sequences in schema public to app_user;
alter default privileges in schema public
  grant select, insert, update, delete on tables to app_user;

-- Despues de correr esto: cambiar la password real con
--   alter role app_user with password '<password-fuerte>';
-- y actualizar DATABASE_URL/DIRECT_URL en .env para usar
-- postgresql://app_user:<password>@<host>:5432/postgres en vez de "postgres".

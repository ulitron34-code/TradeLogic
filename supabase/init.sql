-- TradeLogic Supabase bootstrap
-- Run this in Supabase SQL Editor for a fresh project.

create extension if not exists pgcrypto;

do $$ begin
  create type "OrganizationType" as enum ('IMPORTER', 'CUSTOMS_AGENCY', 'TAX_FIRM', 'PARTNER', 'INTERNAL');
exception when duplicate_object then null; end $$;

do $$ begin
  create type "MembershipRole" as enum ('OWNER', 'ADMIN', 'ANALYST', 'REVIEWER', 'VIEWER', 'PARTNER_SUPPORT');
exception when duplicate_object then null; end $$;

do $$ begin
  create type "CaseStatus" as enum ('DRAFT', 'INTAKE', 'IN_ANALYSIS', 'NEEDS_INFORMATION', 'NEEDS_REVIEW', 'APPROVED', 'REJECTED', 'SUPERSEDED', 'ARCHIVED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type "ReviewDecision" as enum ('APPROVED', 'CHANGES_REQUESTED', 'REJECTED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type "AlertSeverity" as enum ('INFO', 'WARNING', 'HIGH', 'CRITICAL');
exception when duplicate_object then null; end $$;

do $$ begin
  create type "AlertStatus" as enum ('OPEN', 'ACKNOWLEDGED', 'SNOOZED', 'RESOLVED', 'DISMISSED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type "SourceAuthority" as enum ('DOF', 'SAT', 'ANAM', 'SNICE', 'BANXICO', 'COFEPRIS', 'SENASICA', 'SEMARNAT', 'SE', 'OTHER');
exception when duplicate_object then null; end $$;

create table if not exists "Organization" (
  "id" uuid primary key default gen_random_uuid(),
  "name" text not null,
  "type" "OrganizationType" not null,
  "taxId" text,
  "timezone" text not null default 'America/Mexico_City',
  "createdAt" timestamp(3) not null default current_timestamp,
  "updatedAt" timestamp(3) not null default current_timestamp
);

create table if not exists "User" (
  "id" uuid primary key default gen_random_uuid(),
  "email" text not null unique,
  "displayName" text not null,
  "createdAt" timestamp(3) not null default current_timestamp
);

create table if not exists "Membership" (
  "id" uuid primary key default gen_random_uuid(),
  "userId" uuid not null references "User"("id") on update cascade on delete restrict,
  "organizationId" uuid not null references "Organization"("id") on update cascade on delete restrict,
  "role" "MembershipRole" not null,
  "createdAt" timestamp(3) not null default current_timestamp,
  constraint "Membership_userId_organizationId_key" unique ("userId", "organizationId")
);
create index if not exists "Membership_organizationId_role_idx" on "Membership"("organizationId", "role");

create table if not exists "Product" (
  "id" uuid primary key default gen_random_uuid(),
  "organizationId" uuid not null references "Organization"("id") on update cascade on delete restrict,
  "name" text not null,
  "sku" text,
  "status" text not null default 'ACTIVE',
  "createdAt" timestamp(3) not null default current_timestamp,
  "updatedAt" timestamp(3) not null default current_timestamp
);
create index if not exists "Product_organizationId_name_idx" on "Product"("organizationId", "name");

create table if not exists "ProductVersion" (
  "id" uuid primary key default gen_random_uuid(),
  "productId" uuid not null references "Product"("id") on update cascade on delete restrict,
  "version" integer not null,
  "description" text not null,
  "attributes" jsonb not null,
  "validFrom" timestamp(3) not null default current_timestamp,
  "validTo" timestamp(3),
  "createdAt" timestamp(3) not null default current_timestamp,
  constraint "ProductVersion_productId_version_key" unique ("productId", "version")
);

create table if not exists "Document" (
  "id" uuid primary key default gen_random_uuid(),
  "organizationId" uuid not null,
  "productVersionId" uuid references "ProductVersion"("id") on update cascade on delete set null,
  "filename" text not null,
  "mimeType" text not null,
  "sizeBytes" bigint not null,
  "sha256" text not null,
  "storageKey" text not null unique,
  "sourceType" text not null,
  "createdAt" timestamp(3) not null default current_timestamp
);
create index if not exists "Document_organizationId_createdAt_idx" on "Document"("organizationId", "createdAt");

create table if not exists "ClassificationCase" (
  "id" uuid primary key default gen_random_uuid(),
  "organizationId" uuid not null references "Organization"("id") on update cascade on delete restrict,
  "productId" uuid not null references "Product"("id") on update cascade on delete restrict,
  "status" "CaseStatus" not null default 'DRAFT',
  "confidence" decimal(5,2),
  "selectedCodeId" uuid,
  "normativeSnapshotId" uuid,
  "assumptions" jsonb,
  "createdById" uuid not null,
  "createdAt" timestamp(3) not null default current_timestamp,
  "updatedAt" timestamp(3) not null default current_timestamp
);
create index if not exists "ClassificationCase_organizationId_status_createdAt_idx" on "ClassificationCase"("organizationId", "status", "createdAt");

create table if not exists "TariffCode" (
  "id" uuid primary key default gen_random_uuid(),
  "countryCode" text not null default 'MX',
  "code" text not null,
  "nico" text,
  "description" text not null,
  "validFrom" timestamp(3) not null,
  "validTo" timestamp(3),
  "sourceVersion" text not null,
  constraint "TariffCode_countryCode_code_nico_validFrom_key" unique ("countryCode", "code", "nico", "validFrom")
);

create table if not exists "ClassificationCandidate" (
  "id" uuid primary key default gen_random_uuid(),
  "caseId" uuid not null references "ClassificationCase"("id") on update cascade on delete restrict,
  "tariffCodeId" uuid not null references "TariffCode"("id") on update cascade on delete restrict,
  "score" decimal(5,2) not null,
  "rationale" jsonb not null,
  "contradictions" jsonb,
  "rank" integer not null,
  "createdAt" timestamp(3) not null default current_timestamp,
  constraint "ClassificationCandidate_caseId_rank_key" unique ("caseId", "rank")
);

create table if not exists "HumanReview" (
  "id" uuid primary key default gen_random_uuid(),
  "caseId" uuid not null references "ClassificationCase"("id") on update cascade on delete restrict,
  "reviewerId" uuid not null references "User"("id") on update cascade on delete restrict,
  "decision" "ReviewDecision" not null,
  "notes" text,
  "createdAt" timestamp(3) not null default current_timestamp
);

create table if not exists "RegulatorySource" (
  "id" uuid primary key default gen_random_uuid(),
  "authority" "SourceAuthority" not null,
  "title" text not null,
  "canonicalUrl" text not null,
  "externalId" text,
  "fetchedAt" timestamp(3) not null,
  "publishedAt" timestamp(3),
  "sha256" text not null,
  "rawStorageKey" text not null,
  "version" text not null,
  constraint "RegulatorySource_authority_canonicalUrl_sha256_key" unique ("authority", "canonicalUrl", "sha256")
);

create table if not exists "RegulatoryProvision" (
  "id" uuid primary key default gen_random_uuid(),
  "sourceId" uuid not null references "RegulatorySource"("id") on update cascade on delete restrict,
  "heading" text,
  "body" text not null,
  "validFrom" timestamp(3),
  "validTo" timestamp(3),
  "normalizedRefs" jsonb not null
);

create table if not exists "RegulatoryImpact" (
  "id" uuid primary key default gen_random_uuid(),
  "provisionId" uuid not null references "RegulatoryProvision"("id") on update cascade on delete restrict,
  "organizationId" uuid,
  "objectType" text not null,
  "objectId" text,
  "severity" "AlertSeverity" not null,
  "explanation" jsonb not null,
  "requiresHumanReview" boolean not null default false,
  "createdAt" timestamp(3) not null default current_timestamp
);

create table if not exists "Alert" (
  "id" uuid primary key default gen_random_uuid(),
  "organizationId" uuid not null references "Organization"("id") on update cascade on delete restrict,
  "severity" "AlertSeverity" not null,
  "status" "AlertStatus" not null default 'OPEN',
  "title" text not null,
  "summary" text not null,
  "impact" jsonb not null,
  "sourceRefs" jsonb not null,
  "dueAt" timestamp(3),
  "createdAt" timestamp(3) not null default current_timestamp
);
create index if not exists "Alert_organizationId_status_severity_idx" on "Alert"("organizationId", "status", "severity");

create table if not exists "FxRate" (
  "id" uuid primary key default gen_random_uuid(),
  "baseCurrency" text not null,
  "quoteCurrency" text not null,
  "rate" decimal(20,8) not null,
  "effectiveDate" date not null,
  "sourceAuthority" "SourceAuthority" not null,
  "sourceRef" text not null,
  "createdAt" timestamp(3) not null default current_timestamp,
  constraint "FxRate_baseCurrency_quoteCurrency_effectiveDate_sourceAuthority_key" unique ("baseCurrency", "quoteCurrency", "effectiveDate", "sourceAuthority")
);

create table if not exists "CostScenario" (
  "id" uuid primary key default gen_random_uuid(),
  "organizationId" uuid not null,
  "caseId" uuid,
  "currency" text not null,
  "inputs" jsonb not null,
  "outputs" jsonb not null,
  "rulesetVersion" text not null,
  "fxSnapshot" jsonb not null,
  "createdAt" timestamp(3) not null default current_timestamp
);
create index if not exists "CostScenario_organizationId_createdAt_idx" on "CostScenario"("organizationId", "createdAt");

create table if not exists "EvidenceLink" (
  "id" uuid primary key default gen_random_uuid(),
  "caseId" uuid not null references "ClassificationCase"("id") on update cascade on delete restrict,
  "documentId" uuid not null references "Document"("id") on update cascade on delete restrict,
  "locator" jsonb not null,
  "claimType" text not null,
  "createdAt" timestamp(3) not null default current_timestamp
);

create table if not exists "AuditEvent" (
  "id" uuid primary key default gen_random_uuid(),
  "organizationId" uuid not null references "Organization"("id") on update cascade on delete restrict,
  "actorId" text,
  "action" text not null,
  "entityType" text not null,
  "entityId" text not null,
  "before" jsonb,
  "after" jsonb,
  "traceId" text not null,
  "occurredAt" timestamp(3) not null default current_timestamp
);
create index if not exists "AuditEvent_organizationId_occurredAt_idx" on "AuditEvent"("organizationId", "occurredAt");

create table if not exists "IdempotencyRecord" (
  "id" uuid primary key default gen_random_uuid(),
  "organizationId" uuid not null references "Organization"("id") on update cascade on delete restrict,
  "key" text not null,
  "scope" text not null,
  "requestHash" text not null,
  "response" jsonb not null,
  "createdAt" timestamp(3) not null default current_timestamp,
  constraint "IdempotencyRecord_organizationId_scope_key_key" unique ("organizationId", "scope", "key")
);
create index if not exists "IdempotencyRecord_organizationId_createdAt_idx" on "IdempotencyRecord"("organizationId", "createdAt");

-- Seed baseline user, organization, membership and deterministic MX tariff candidates.
insert into "User" ("id", "email", "displayName") values
  ('00000000-0000-4000-8000-000000000001', 'owner@example.local', 'Owner local')
on conflict ("id") do update set "email" = excluded."email", "displayName" = excluded."displayName";

insert into "Organization" ("id", "name", "type") values
  ('00000000-0000-4000-8000-000000000010', 'Organizacion piloto', 'IMPORTER')
on conflict ("id") do update set "name" = excluded."name", "type" = excluded."type";

insert into "Membership" ("userId", "organizationId", "role") values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000010', 'OWNER')
on conflict ("userId", "organizationId") do update set "role" = excluded."role";

insert into "TariffCode" ("countryCode", "code", "nico", "description", "validFrom", "sourceVersion") values
  ('MX', '3926.90.99', '99', 'Las demas manufacturas de plastico y articulos de polimeros no expresados ni comprendidos en otra parte.', '2026-01-01T00:00:00.000Z', 'LIGIE-MX-2026-seed'),
  ('MX', '7318.15.99', '99', 'Tornillos, pernos y articulos similares de hierro o acero, incluso con sus tuercas y arandelas.', '2026-01-01T00:00:00.000Z', 'LIGIE-MX-2026-seed'),
  ('MX', '8504.40.99', '99', 'Convertidores electricos estaticos, modulos electronicos de potencia y fuentes de alimentacion.', '2026-01-01T00:00:00.000Z', 'LIGIE-MX-2026-seed'),
  ('MX', '8536.50.99', '99', 'Interruptores, conectores, sensores y aparatos electricos para corte o conexion de circuitos.', '2026-01-01T00:00:00.000Z', 'LIGIE-MX-2026-seed'),
  ('MX', '6204.62.99', '99', 'Prendas textiles para mujer o nina de algodon, pantalones y articulos similares.', '2026-01-01T00:00:00.000Z', 'LIGIE-MX-2026-seed'),
  ('MX', '9026.20.99', '99', 'Instrumentos y aparatos para medida o control de presion de liquidos o gases.', '2026-01-01T00:00:00.000Z', 'LIGIE-MX-2026-seed')
on conflict ("countryCode", "code", "nico", "validFrom") do update set
  "description" = excluded."description",
  "sourceVersion" = excluded."sourceVersion";
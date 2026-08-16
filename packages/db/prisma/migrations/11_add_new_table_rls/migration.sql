-- Keep the same second-layer isolation used by supabase/rls.sql when
-- migrations are applied by Render. Origin rules are a shared catalog;
-- assignments belong to one organization.
-- Repair a historical database where migration 9 was recorded as applied
-- but its table was not present. Every statement below is idempotent. The
-- existing managed tables are intentionally not altered by this repair role.
DO $$
BEGIN
  CREATE TYPE "CaseAssignmentStatus" AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "CaseAssignment" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "caseId" UUID NOT NULL,
  "assigneeId" UUID NOT NULL,
  "assignedById" UUID NOT NULL,
  "status" "CaseAssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
  "note" TEXT,
  "dueAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CaseAssignment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CaseAssignment_organizationId_status_dueAt_idx" ON "CaseAssignment"("organizationId", "status", "dueAt");
CREATE INDEX IF NOT EXISTS "CaseAssignment_caseId_createdAt_idx" ON "CaseAssignment"("caseId", "createdAt");
CREATE INDEX IF NOT EXISTS "CaseAssignment_assigneeId_status_idx" ON "CaseAssignment"("assigneeId", "status");

ALTER TABLE "CaseAssignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CaseAssignment" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "CaseAssignment_org_isolation" ON "CaseAssignment";
CREATE POLICY "CaseAssignment_org_isolation" ON "CaseAssignment"
  USING ("organizationId" = app_current_org_id())
  WITH CHECK ("organizationId" = app_current_org_id());

ALTER TABLE "OriginRuleCatalog" DISABLE ROW LEVEL SECURITY;

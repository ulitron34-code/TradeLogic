-- Keep the same second-layer isolation used by supabase/rls.sql when
-- migrations are applied by Render. Origin rules are a shared catalog;
-- assignments belong to one organization.
-- Repair a historical database where migration 9 was recorded as applied
-- but its table was not present. Every statement below is idempotent.
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

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CaseAssignment_organizationId_fkey') THEN
    ALTER TABLE "CaseAssignment" ADD CONSTRAINT "CaseAssignment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CaseAssignment_caseId_fkey') THEN
    ALTER TABLE "CaseAssignment" ADD CONSTRAINT "CaseAssignment_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ClassificationCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CaseAssignment_assigneeId_fkey') THEN
    ALTER TABLE "CaseAssignment" ADD CONSTRAINT "CaseAssignment_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CaseAssignment_assignedById_fkey') THEN
    ALTER TABLE "CaseAssignment" ADD CONSTRAINT "CaseAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "CaseAssignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CaseAssignment" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "CaseAssignment_org_isolation" ON "CaseAssignment";
CREATE POLICY "CaseAssignment_org_isolation" ON "CaseAssignment"
  USING ("organizationId" = app_current_org_id())
  WITH CHECK ("organizationId" = app_current_org_id());

ALTER TABLE "OriginRuleCatalog" DISABLE ROW LEVEL SECURITY;

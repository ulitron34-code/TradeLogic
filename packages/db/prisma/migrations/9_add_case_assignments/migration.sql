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

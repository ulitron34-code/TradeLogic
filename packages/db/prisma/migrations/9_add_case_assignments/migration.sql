CREATE TYPE "CaseAssignmentStatus" AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

CREATE TABLE "CaseAssignment" (
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

CREATE INDEX "CaseAssignment_organizationId_status_dueAt_idx" ON "CaseAssignment"("organizationId", "status", "dueAt");
CREATE INDEX "CaseAssignment_caseId_createdAt_idx" ON "CaseAssignment"("caseId", "createdAt");
CREATE INDEX "CaseAssignment_assigneeId_status_idx" ON "CaseAssignment"("assigneeId", "status");
ALTER TABLE "CaseAssignment" ADD CONSTRAINT "CaseAssignment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CaseAssignment" ADD CONSTRAINT "CaseAssignment_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ClassificationCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CaseAssignment" ADD CONSTRAINT "CaseAssignment_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CaseAssignment" ADD CONSTRAINT "CaseAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

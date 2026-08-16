CREATE TYPE "CaseReviewRequestStatus" AS ENUM ('REQUESTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

CREATE TABLE "CaseReviewRequest" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "caseId" UUID NOT NULL,
  "requestedById" UUID NOT NULL,
  "assigneeId" UUID,
  "status" "CaseReviewRequestStatus" NOT NULL DEFAULT 'REQUESTED',
  "note" TEXT,
  "response" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CaseReviewRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CaseReviewRequest_organizationId_status_requestedAt_idx" ON "CaseReviewRequest"("organizationId", "status", "requestedAt");
CREATE INDEX "CaseReviewRequest_caseId_requestedAt_idx" ON "CaseReviewRequest"("caseId", "requestedAt");
CREATE INDEX "CaseReviewRequest_assigneeId_status_idx" ON "CaseReviewRequest"("assigneeId", "status");
ALTER TABLE "CaseReviewRequest" ADD CONSTRAINT "CaseReviewRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CaseReviewRequest" ADD CONSTRAINT "CaseReviewRequest_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ClassificationCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CaseReviewRequest" ADD CONSTRAINT "CaseReviewRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CaseReviewRequest" ADD CONSTRAINT "CaseReviewRequest_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CaseReviewRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CaseReviewRequest" FORCE ROW LEVEL SECURITY;
CREATE POLICY "CaseReviewRequest_org_isolation" ON "CaseReviewRequest"
  USING ("organizationId" = app_current_org_id())
  WITH CHECK ("organizationId" = app_current_org_id());

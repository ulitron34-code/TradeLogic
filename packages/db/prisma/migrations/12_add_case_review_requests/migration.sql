DO $$
BEGIN
  CREATE TYPE "CaseReviewRequestStatus" AS ENUM ('REQUESTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "CaseReviewRequest" (
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

CREATE INDEX IF NOT EXISTS "CaseReviewRequest_organizationId_status_requestedAt_idx" ON "CaseReviewRequest"("organizationId", "status", "requestedAt");
CREATE INDEX IF NOT EXISTS "CaseReviewRequest_caseId_requestedAt_idx" ON "CaseReviewRequest"("caseId", "requestedAt");
CREATE INDEX IF NOT EXISTS "CaseReviewRequest_assigneeId_status_idx" ON "CaseReviewRequest"("assigneeId", "status");

ALTER TABLE "CaseReviewRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CaseReviewRequest" FORCE ROW LEVEL SECURITY;
CREATE POLICY "CaseReviewRequest_org_isolation" ON "CaseReviewRequest"
  USING ("organizationId" = app_current_org_id())
  WITH CHECK ("organizationId" = app_current_org_id());

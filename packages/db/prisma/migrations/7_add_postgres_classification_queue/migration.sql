-- Cola de clasificacion respaldada por PostgreSQL.
-- Redis queda fuera del camino critico del flujo API -> worker -> UI.
DO $$
BEGIN
  CREATE TYPE "ClassificationJobStatus" AS ENUM ('WAITING', 'ACTIVE', 'COMPLETED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ClassificationJob" (
  "id" UUID NOT NULL,
  "eventId" TEXT NOT NULL,
  "organizationId" UUID NOT NULL,
  "caseId" UUID NOT NULL,
  "event" JSONB NOT NULL,
  "status" "ClassificationJobStatus" NOT NULL DEFAULT 'WAITING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClassificationJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ClassificationJob_eventId_key" ON "ClassificationJob"("eventId");
CREATE INDEX IF NOT EXISTS "ClassificationJob_status_availableAt_createdAt_idx" ON "ClassificationJob"("status", "availableAt", "createdAt");
CREATE INDEX IF NOT EXISTS "ClassificationJob_organizationId_caseId_createdAt_idx" ON "ClassificationJob"("organizationId", "caseId", "createdAt");

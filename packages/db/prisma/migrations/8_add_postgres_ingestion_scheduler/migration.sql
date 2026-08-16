-- PostgreSQL-backed scheduler for the global DOF and jurisprudence ingestions.
CREATE TYPE "IngestionJobType" AS ENUM ('REGULATORY', 'JURISPRUDENCE');
CREATE TYPE "IngestionJobStatus" AS ENUM ('WAITING', 'ACTIVE', 'COMPLETED', 'FAILED');

CREATE TABLE "IngestionJob" (
    "id" UUID NOT NULL,
    "jobType" "IngestionJobType" NOT NULL,
    "status" "IngestionJobStatus" NOT NULL DEFAULT 'WAITING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "lastRunAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "IngestionJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IngestionJob_jobType_key" ON "IngestionJob"("jobType");
CREATE INDEX "IngestionJob_status_availableAt_idx" ON "IngestionJob"("status", "availableAt");

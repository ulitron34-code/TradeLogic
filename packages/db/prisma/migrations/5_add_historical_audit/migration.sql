CREATE TABLE "HistoricalAuditRun" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "sourceFilename" TEXT NOT NULL,
    "sourceSha256" TEXT NOT NULL,
    "sourceVersion" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ANALYZED',
    "summary" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HistoricalAuditRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HistoricalDeclaration" (
    "id" UUID NOT NULL,
    "runId" UUID NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "tariffCode" TEXT NOT NULL,
    "nico" TEXT,
    "countryOfOrigin" TEXT NOT NULL,
    "customsValue" DECIMAL(20,4) NOT NULL,
    "declaredDutyRatePercent" DECIMAL(8,4),
    "declaredDutyAmount" DECIMAL(20,4) NOT NULL,
    "expectedDutyAmount" DECIMAL(20,4),
    "difference" DECIMAL(20,4),
    "status" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "rateSourceVersion" TEXT,
    "rateSourceUrl" TEXT,
    CONSTRAINT "HistoricalDeclaration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HistoricalAuditRun_sourceSha256_sourceVersion_key" ON "HistoricalAuditRun"("organizationId", "sourceSha256", "sourceVersion");
CREATE UNIQUE INDEX "HistoricalDeclaration_runId_rowNumber_key" ON "HistoricalDeclaration"("runId", "rowNumber");
CREATE INDEX "HistoricalAuditRun_organizationId_createdAt_idx" ON "HistoricalAuditRun"("organizationId", "createdAt");
CREATE INDEX "HistoricalDeclaration_tariffCode_status_idx" ON "HistoricalDeclaration"("tariffCode", "status");
ALTER TABLE "HistoricalAuditRun" ADD CONSTRAINT "HistoricalAuditRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HistoricalDeclaration" ADD CONSTRAINT "HistoricalDeclaration_runId_fkey" FOREIGN KEY ("runId") REFERENCES "HistoricalAuditRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "OriginRuleCatalog" (
  "id" UUID NOT NULL,
  "agreement" TEXT NOT NULL,
  "tariffCode" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "thresholdPercent" DECIMAL(8,4),
  "requiredProcess" TEXT,
  "sourceUrl" TEXT NOT NULL,
  "sourceVersion" TEXT NOT NULL,
  "validFrom" TIMESTAMP(3) NOT NULL,
  "validTo" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OriginRuleCatalog_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OriginRuleCatalog_agreement_tariffCode_type_sourceVersion_validFrom_key" ON "OriginRuleCatalog"("agreement", "tariffCode", "type", "sourceVersion", "validFrom");
CREATE INDEX "OriginRuleCatalog_agreement_tariffCode_validFrom_idx" ON "OriginRuleCatalog"("agreement", "tariffCode", "validFrom");

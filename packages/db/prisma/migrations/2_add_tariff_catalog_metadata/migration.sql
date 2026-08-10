-- Add source and legal metadata required for a versioned tariff catalog.
ALTER TABLE "TariffCode"
  ADD COLUMN "chapter" TEXT,
  ADD COLUMN "heading" TEXT,
  ADD COLUMN "legalNotes" TEXT,
  ADD COLUMN "sourceUrl" TEXT,
  ADD COLUMN "generalRate" DECIMAL(8,4),
  ADD COLUMN "rateUnit" TEXT;

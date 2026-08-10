ALTER TABLE "TariffCode" ADD COLUMN "unitOfMeasure" TEXT;
ALTER TABLE "TariffCode" ADD COLUMN "exportRate" DECIMAL(8,4);
ALTER TABLE "TariffCode" ADD COLUMN "exportRateUnit" TEXT;

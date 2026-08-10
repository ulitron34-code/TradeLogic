CREATE TABLE "RegulatoryRequirement" (
    "id" UUID NOT NULL,
    "tariffCodeId" UUID NOT NULL,
    "authority" "SourceAuthority" NOT NULL,
    "requirementType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "sourceVersion" TEXT NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3),
    "mandatory" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegulatoryRequirement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RegulatoryRequirement_tariffCodeId_requirementType_title_validFrom_key"
ON "RegulatoryRequirement"("tariffCodeId", "requirementType", "title", "validFrom");

CREATE INDEX "RegulatoryRequirement_authority_requirementType_validFrom_idx"
ON "RegulatoryRequirement"("authority", "requirementType", "validFrom");

ALTER TABLE "RegulatoryRequirement"
ADD CONSTRAINT "RegulatoryRequirement_tariffCodeId_fkey"
FOREIGN KEY ("tariffCodeId") REFERENCES "TariffCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

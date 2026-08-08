-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('IMPORTER', 'CUSTOMS_AGENCY', 'TAX_FIRM', 'PARTNER', 'INTERNAL');

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('OWNER', 'ADMIN', 'ANALYST', 'REVIEWER', 'VIEWER', 'PARTNER_SUPPORT');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('DRAFT', 'INTAKE', 'IN_ANALYSIS', 'NEEDS_INFORMATION', 'NEEDS_REVIEW', 'APPROVED', 'REJECTED', 'SUPERSEDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ReviewDecision" AS ENUM ('APPROVED', 'CHANGES_REQUESTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'SNOOZED', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "SourceAuthority" AS ENUM ('DOF', 'SAT', 'ANAM', 'SNICE', 'BANXICO', 'COFEPRIS', 'SENASICA', 'SEMARNAT', 'SE', 'OTHER');

-- CreateTable
CREATE TABLE "Organization" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OrganizationType" NOT NULL,
    "taxId" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Mexico_City',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "authUserId" UUID,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "role" "MembershipRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVersion" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "attributes" JSONB NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "productVersionId" UUID,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "sha256" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassificationCase" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "status" "CaseStatus" NOT NULL DEFAULT 'DRAFT',
    "confidence" DECIMAL(5,2),
    "selectedCodeId" UUID,
    "normativeSnapshotId" UUID,
    "assumptions" JSONB,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassificationCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TariffCode" (
    "id" UUID NOT NULL,
    "countryCode" TEXT NOT NULL DEFAULT 'MX',
    "code" TEXT NOT NULL,
    "nico" TEXT,
    "description" TEXT NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3),
    "sourceVersion" TEXT NOT NULL,

    CONSTRAINT "TariffCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassificationCandidate" (
    "id" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "tariffCodeId" UUID NOT NULL,
    "score" DECIMAL(5,2) NOT NULL,
    "rationale" JSONB NOT NULL,
    "contradictions" JSONB,
    "rank" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassificationCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HumanReview" (
    "id" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "reviewerId" UUID NOT NULL,
    "decision" "ReviewDecision" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HumanReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegulatorySource" (
    "id" UUID NOT NULL,
    "authority" "SourceAuthority" NOT NULL,
    "title" TEXT NOT NULL,
    "canonicalUrl" TEXT NOT NULL,
    "externalId" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "sha256" TEXT NOT NULL,
    "rawStorageKey" TEXT NOT NULL,
    "version" TEXT NOT NULL,

    CONSTRAINT "RegulatorySource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegulatoryProvision" (
    "id" UUID NOT NULL,
    "sourceId" UUID NOT NULL,
    "heading" TEXT,
    "body" TEXT NOT NULL,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "normalizedRefs" JSONB NOT NULL,

    CONSTRAINT "RegulatoryProvision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegulatoryImpact" (
    "id" UUID NOT NULL,
    "provisionId" UUID NOT NULL,
    "organizationId" UUID,
    "objectType" TEXT NOT NULL,
    "objectId" TEXT,
    "severity" "AlertSeverity" NOT NULL,
    "explanation" JSONB NOT NULL,
    "requiresHumanReview" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegulatoryImpact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "impact" JSONB NOT NULL,
    "sourceRefs" JSONB NOT NULL,
    "dueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FxRate" (
    "id" UUID NOT NULL,
    "baseCurrency" TEXT NOT NULL,
    "quoteCurrency" TEXT NOT NULL,
    "rate" DECIMAL(20,8) NOT NULL,
    "effectiveDate" DATE NOT NULL,
    "sourceAuthority" "SourceAuthority" NOT NULL,
    "sourceRef" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FxRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostScenario" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "caseId" UUID,
    "currency" TEXT NOT NULL,
    "inputs" JSONB NOT NULL,
    "outputs" JSONB NOT NULL,
    "rulesetVersion" TEXT NOT NULL,
    "fxSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CostScenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceLink" (
    "id" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "locator" JSONB NOT NULL,
    "claimType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidenceLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "traceId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyRecord" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_authUserId_key" ON "User"("authUserId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Membership_organizationId_role_idx" ON "Membership"("organizationId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_organizationId_key" ON "Membership"("userId", "organizationId");

-- CreateIndex
CREATE INDEX "Product_organizationId_name_idx" ON "Product"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVersion_productId_version_key" ON "ProductVersion"("productId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "Document_storageKey_key" ON "Document"("storageKey");

-- CreateIndex
CREATE INDEX "Document_organizationId_createdAt_idx" ON "Document"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "ClassificationCase_organizationId_status_createdAt_idx" ON "ClassificationCase"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TariffCode_countryCode_code_nico_validFrom_key" ON "TariffCode"("countryCode", "code", "nico", "validFrom");

-- CreateIndex
CREATE UNIQUE INDEX "ClassificationCandidate_caseId_rank_key" ON "ClassificationCandidate"("caseId", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "RegulatorySource_authority_canonicalUrl_sha256_key" ON "RegulatorySource"("authority", "canonicalUrl", "sha256");

-- CreateIndex
CREATE INDEX "Alert_organizationId_status_severity_idx" ON "Alert"("organizationId", "status", "severity");

-- CreateIndex
CREATE UNIQUE INDEX "FxRate_baseCurrency_quoteCurrency_effectiveDate_sourceAutho_key" ON "FxRate"("baseCurrency", "quoteCurrency", "effectiveDate", "sourceAuthority");

-- CreateIndex
CREATE INDEX "CostScenario_organizationId_createdAt_idx" ON "CostScenario"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_organizationId_occurredAt_idx" ON "AuditEvent"("organizationId", "occurredAt");

-- CreateIndex
CREATE INDEX "IdempotencyRecord_organizationId_createdAt_idx" ON "IdempotencyRecord"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyRecord_organizationId_scope_key_key" ON "IdempotencyRecord"("organizationId", "scope", "key");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVersion" ADD CONSTRAINT "ProductVersion_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_productVersionId_fkey" FOREIGN KEY ("productVersionId") REFERENCES "ProductVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassificationCase" ADD CONSTRAINT "ClassificationCase_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassificationCase" ADD CONSTRAINT "ClassificationCase_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassificationCandidate" ADD CONSTRAINT "ClassificationCandidate_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ClassificationCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassificationCandidate" ADD CONSTRAINT "ClassificationCandidate_tariffCodeId_fkey" FOREIGN KEY ("tariffCodeId") REFERENCES "TariffCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HumanReview" ADD CONSTRAINT "HumanReview_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ClassificationCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HumanReview" ADD CONSTRAINT "HumanReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegulatoryProvision" ADD CONSTRAINT "RegulatoryProvision_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "RegulatorySource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegulatoryImpact" ADD CONSTRAINT "RegulatoryImpact_provisionId_fkey" FOREIGN KEY ("provisionId") REFERENCES "RegulatoryProvision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceLink" ADD CONSTRAINT "EvidenceLink_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ClassificationCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceLink" ADD CONSTRAINT "EvidenceLink_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdempotencyRecord" ADD CONSTRAINT "IdempotencyRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


import { PrismaClient, type Prisma } from '@prisma/client';

export type HistoricalAuditRunPersistence = {
  organizationId: string;
  createdById: string;
  sourceFilename: string;
  sourceSha256: string;
  sourceVersion: string;
  status?: string;
  summary: Record<string, unknown>;
  declarations: Array<{
    rowNumber: number;
    entryDate: Date;
    tariffCode: string;
    nico?: string | null;
    countryOfOrigin: string;
    customsValue: number | string;
    declaredDutyRatePercent?: number | string | null;
    declaredDutyAmount: number | string;
    expectedDutyAmount?: number | string | null;
    difference?: number | string | null;
    status: string;
    reason: string;
    rateSourceVersion?: string | null;
    rateSourceUrl?: string | null;
  }>;
};

export async function persistHistoricalAuditRun(client: PrismaClient, input: HistoricalAuditRunPersistence) {
  return client.$transaction(async (transaction) => {
    const existing = await transaction.historicalAuditRun.findFirst({ where: { organizationId: input.organizationId, sourceSha256: input.sourceSha256, sourceVersion: input.sourceVersion }, select: { id: true } });
    const data = { organizationId: input.organizationId, createdById: input.createdById, sourceFilename: input.sourceFilename, sourceSha256: input.sourceSha256, sourceVersion: input.sourceVersion, status: input.status ?? 'ANALYZED', summary: input.summary as Prisma.InputJsonValue };
    const run = existing ? await transaction.historicalAuditRun.update({ where: { id: existing.id }, data }) : await transaction.historicalAuditRun.create({ data });
    if (existing) await transaction.historicalDeclaration.deleteMany({ where: { runId: run.id } });
    if (input.declarations.length > 0) await transaction.historicalDeclaration.createMany({ data: input.declarations.map((declaration) => ({ ...declaration, runId: run.id, nico: declaration.nico ?? null, declaredDutyRatePercent: declaration.declaredDutyRatePercent ?? null, expectedDutyAmount: declaration.expectedDutyAmount ?? null, difference: declaration.difference ?? null, rateSourceVersion: declaration.rateSourceVersion ?? null, rateSourceUrl: declaration.rateSourceUrl ?? null })) });
    return { runId: run.id, created: !existing, declarationCount: input.declarations.length };
  });
}

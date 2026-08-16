import { PrismaClient } from '@prisma/client';

export type OriginRuleCatalogPersistenceRecord = {
  agreement: string;
  tariffCode: string;
  type: 'CTC' | 'RVC' | 'PROCESS';
  thresholdPercent?: number | null;
  requiredProcess?: string | null;
  sourceUrl: string;
  sourceVersion: string;
  validFrom: Date;
  validTo?: Date | null;
};

export async function upsertOriginRuleCatalog(client: PrismaClient, records: OriginRuleCatalogPersistenceRecord[]) {
  return client.$transaction(async transaction => {
    let created = 0;
    let updated = 0;
    for (const record of records) {
      const where = { agreement_tariffCode_type_sourceVersion_validFrom: { agreement: record.agreement, tariffCode: record.tariffCode, type: record.type, sourceVersion: record.sourceVersion, validFrom: record.validFrom } };
      const data = { ...record, thresholdPercent: record.thresholdPercent ?? null, requiredProcess: record.requiredProcess ?? null, validTo: record.validTo ?? null };
      const existing = await transaction.originRuleCatalog.findUnique({ where, select: { id: true } });
      if (existing) {
        await transaction.originRuleCatalog.update({ where: { id: existing.id }, data });
        updated += 1;
      } else {
        await transaction.originRuleCatalog.create({ data });
        created += 1;
      }
    }
    return { created, updated };
  });
}

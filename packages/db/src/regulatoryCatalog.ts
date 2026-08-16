import { PrismaClient, SourceAuthority } from '@prisma/client';

export type RegulatoryCatalogPersistenceRecord = {
  tariffCode: string;
  authority: SourceAuthority;
  requirementType: string;
  title: string;
  description?: string | null;
  sourceUrl: string;
  sourceVersion: string;
  validFrom: Date;
  validTo?: Date | null;
  mandatory?: boolean;
  notes?: string | null;
};

/**
 * Resolves a source catalog's normalized tariff code against every matching
 * FA version (including its NICO rows) and persists requirements idempotently.
 * Unknown tariff codes are reported, never created as fictitious catalog rows.
 */
export async function persistRegulatoryCatalog(client: PrismaClient, records: RegulatoryCatalogPersistenceRecord[]) {
  return client.$transaction(async transaction => {
    let created = 0;
    let updated = 0;
    const skippedTariffCodes: string[] = [];
    for (const record of records) {
      const tariffCodes = await transaction.tariffCode.findMany({ where: { countryCode: 'MX', code: record.tariffCode } });
      if (tariffCodes.length === 0) {
        skippedTariffCodes.push(record.tariffCode);
        continue;
      }
      for (const tariffCode of tariffCodes) {
        const where = { tariffCodeId_requirementType_title_validFrom: { tariffCodeId: tariffCode.id, requirementType: record.requirementType, title: record.title, validFrom: record.validFrom } };
        const data = { tariffCodeId: tariffCode.id, authority: record.authority, requirementType: record.requirementType, title: record.title, description: record.description ?? null, sourceUrl: record.sourceUrl, sourceVersion: record.sourceVersion, validFrom: record.validFrom, validTo: record.validTo ?? null, mandatory: record.mandatory ?? true, notes: record.notes ?? null };
        const existing = await transaction.regulatoryRequirement.findUnique({ where, select: { id: true } });
        if (existing) {
          await transaction.regulatoryRequirement.update({ where: { id: existing.id }, data });
          updated += 1;
        } else {
          await transaction.regulatoryRequirement.create({ data });
          created += 1;
        }
      }
    }
    return { created, updated, skippedTariffCodes: [...new Set(skippedTariffCodes)] };
  });
}

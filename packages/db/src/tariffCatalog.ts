import { PrismaClient } from '@prisma/client';

export type TariffCatalogPersistenceRecord = {
  countryCode: string;
  code: string;
  nico: string | null;
  description: string;
  chapter: string | null;
  heading: string | null;
  legalNotes: string | null;
  sourceUrl: string | null;
  unitOfMeasure?: string | null;
  generalRate: number | string | null;
  rateUnit: string | null;
  exportRate?: number | string | null;
  exportRateUnit?: string | null;
  validFrom: Date;
  validTo: Date | null;
  sourceVersion: string;
};

/**
 * Persists a validated catalog without duplicating effective records. The
 * effective key includes the validity start date, so a new official edition
 * creates a new version while re-running the same import updates metadata of
 * that exact version.
 */
export async function upsertTariffCatalog(
  client: PrismaClient,
  records: TariffCatalogPersistenceRecord[],
): Promise<{ created: number; updated: number }> {
  return client.$transaction(async transaction => {
    let created = 0;
    let updated = 0;

    // The official LIGIE/NICO snapshot contains more than 20,000 rows. A
    // first import must use createMany per source version; the row-by-row
    // fallback remains for partial re-imports and small test doubles.
    const bySourceVersion = new Map<string, TariffCatalogPersistenceRecord[]>();
    for (const record of records) {
      const group = bySourceVersion.get(record.sourceVersion) ?? [];
      group.push(record);
      bySourceVersion.set(record.sourceVersion, group);
    }

    for (const group of bySourceVersion.values()) {
      const existingCount = typeof transaction.tariffCode.count === 'function'
        ? await transaction.tariffCode.count({ where: { sourceVersion: group[0]!.sourceVersion } })
        : null;
      if (existingCount === 0 && typeof transaction.tariffCode.createMany === 'function') {
        await transaction.tariffCode.createMany({ data: group.map(toPersistenceData) });
        created += group.length;
        continue;
      }

      for (const record of group) {
      const existing = await transaction.tariffCode.findFirst({
        where: {
          countryCode: record.countryCode,
          code: record.code,
          nico: record.nico,
          validFrom: record.validFrom,
        },
        select: { id: true },
      });

      const data = toPersistenceData(record);

      if (existing) {
        await transaction.tariffCode.update({ where: { id: existing.id }, data });
        updated += 1;
      } else {
        await transaction.tariffCode.create({ data });
        created += 1;
      }
    }
    }

    return { created, updated };
  });
}

function toPersistenceData(record: TariffCatalogPersistenceRecord) {
  return {
    countryCode: record.countryCode,
    code: record.code,
    nico: record.nico,
    description: record.description,
    chapter: record.chapter,
    heading: record.heading,
    legalNotes: record.legalNotes,
    sourceUrl: record.sourceUrl,
    unitOfMeasure: record.unitOfMeasure ?? null,
    generalRate: record.generalRate,
    rateUnit: record.rateUnit,
    exportRate: record.exportRate ?? null,
    exportRateUnit: record.exportRateUnit ?? null,
    validFrom: record.validFrom,
    validTo: record.validTo,
    sourceVersion: record.sourceVersion,
  };
}

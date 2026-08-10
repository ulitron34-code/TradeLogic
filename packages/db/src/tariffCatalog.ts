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
  generalRate: number | string | null;
  rateUnit: string | null;
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

    for (const record of records) {
      const existing = await transaction.tariffCode.findFirst({
        where: {
          countryCode: record.countryCode,
          code: record.code,
          nico: record.nico,
          validFrom: record.validFrom,
        },
        select: { id: true },
      });

      const data = {
        countryCode: record.countryCode,
        code: record.code,
        nico: record.nico,
        description: record.description,
        chapter: record.chapter,
        heading: record.heading,
        legalNotes: record.legalNotes,
        sourceUrl: record.sourceUrl,
        generalRate: record.generalRate,
        rateUnit: record.rateUnit,
        validFrom: record.validFrom,
        validTo: record.validTo,
        sourceVersion: record.sourceVersion,
      };

      if (existing) {
        await transaction.tariffCode.update({ where: { id: existing.id }, data });
        updated += 1;
      } else {
        await transaction.tariffCode.create({ data });
        created += 1;
      }
    }

    return { created, updated };
  });
}

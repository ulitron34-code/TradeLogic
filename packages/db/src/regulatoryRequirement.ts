import { PrismaClient, SourceAuthority } from '@prisma/client';

export type RegulatoryRequirementPersistenceRecord = {
  tariffCodeId: string;
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

export async function upsertRegulatoryRequirements(
  client: PrismaClient,
  records: RegulatoryRequirementPersistenceRecord[],
): Promise<{ created: number; updated: number }> {
  return client.$transaction(async transaction => {
    let created = 0;
    let updated = 0;
    for (const record of records) {
      const where = {
        tariffCodeId: record.tariffCodeId,
        requirementType: record.requirementType,
        title: record.title,
        validFrom: record.validFrom,
      };
      const data = {
        ...record,
        description: record.description ?? null,
        validTo: record.validTo ?? null,
        mandatory: record.mandatory ?? true,
        notes: record.notes ?? null,
      };
      const existing = await transaction.regulatoryRequirement.findFirst({ where, select: { id: true } });
      if (existing) {
        await transaction.regulatoryRequirement.update({ where: { id: existing.id }, data });
        updated += 1;
      } else {
        await transaction.regulatoryRequirement.create({ data });
        created += 1;
      }
    }
    return { created, updated };
  });
}

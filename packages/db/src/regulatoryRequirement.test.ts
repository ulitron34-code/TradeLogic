import { describe, expect, it } from 'vitest';
import { upsertRegulatoryRequirements } from './regulatoryRequirement';

describe('upsertRegulatoryRequirements', () => {
  it('updates the same version and creates a new effective version', async () => {
    const rows: any[] = [];
    let sequence = 0;
    const transaction = {
      regulatoryRequirement: {
        findFirst: async ({ where }: any) => rows.find(row => row.tariffCodeId === where.tariffCodeId
          && row.requirementType === where.requirementType && row.title === where.title
          && row.validFrom.getTime() === where.validFrom.getTime()) ?? null,
        create: async ({ data }: any) => { const row = { id: `req-${++sequence}`, ...data }; rows.push(row); return row; },
        update: async ({ where, data }: any) => { const row = rows.find(item => item.id === where.id); Object.assign(row, data); return row; },
      },
    };
    const client: any = { $transaction: async (callback: any) => callback(transaction) };
    const first = { tariffCodeId: 'code-1', authority: 'SAT', requirementType: 'PERMIT', title: 'Permiso', sourceUrl: 'https://sat.gob.mx', sourceVersion: '2026.1', validFrom: new Date('2026-01-01') };
    expect(await upsertRegulatoryRequirements(client, [first])).toEqual({ created: 1, updated: 0 });
    expect(await upsertRegulatoryRequirements(client, [{ ...first, notes: 'actualizado' }])).toEqual({ created: 0, updated: 1 });
    expect(await upsertRegulatoryRequirements(client, [{ ...first, validFrom: new Date('2027-01-01'), sourceVersion: '2027.1' }])).toEqual({ created: 1, updated: 0 });
    expect(rows).toHaveLength(2);
  });
});

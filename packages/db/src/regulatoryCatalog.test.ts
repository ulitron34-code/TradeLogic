import { describe, expect, it } from 'vitest';
import { persistRegulatoryCatalog } from './regulatoryCatalog.js';

describe('persistRegulatoryCatalog', () => {
  it('expands a source fraction across matching NICO rows and reports unknown codes', async () => {
    const created: any[] = [];
    const client = {
      $transaction: async (callback: any) => callback({
        tariffCode: { findMany: async ({ where }: any) => where.code === '3926.90.99' ? [{ id: 'tariff-1' }, { id: 'tariff-2' }] : [] },
        regulatoryRequirement: {
          findUnique: async () => null,
          create: async ({ data }: any) => { created.push(data); return data; },
          update: async () => undefined,
        },
      }),
    } as any;
    const result = await persistRegulatoryCatalog(client, [{ tariffCode: '3926.90.99', authority: 'COFEPRIS', requirementType: 'PERMIT', title: 'Aviso', sourceUrl: 'https://www.gob.mx/cofepris', sourceVersion: '2026.1', validFrom: new Date('2026-01-01') }, { tariffCode: '9999.99.99', authority: 'COFEPRIS', requirementType: 'PERMIT', title: 'No existe', sourceUrl: 'https://www.gob.mx/cofepris', sourceVersion: '2026.1', validFrom: new Date('2026-01-01') }]);
    expect(result).toEqual({ created: 2, updated: 0, skippedTariffCodes: ['9999.99.99'] });
    expect(created).toHaveLength(2);
  });
});

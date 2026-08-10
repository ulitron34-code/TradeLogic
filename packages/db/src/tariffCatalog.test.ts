import { describe, expect, it } from 'vitest';
import { upsertTariffCatalog } from './tariffCatalog.js';

const record = {
  countryCode: 'MX',
  code: '3926.90.99',
  nico: '99',
  description: 'Manufacturas de plastico.',
  chapter: '39',
  heading: '3926',
  legalNotes: null,
  sourceUrl: 'https://example.test/ligie',
  generalRate: 10,
  rateUnit: 'PERCENT',
  validFrom: new Date('2026-01-01T00:00:00.000Z'),
  validTo: null,
  sourceVersion: 'LIGIE-MX-2026',
};

describe('upsertTariffCatalog', () => {
  it('creates new effective records and updates an existing version on re-import', async () => {
    const rows: Array<typeof record & { id: string }> = [];
    let nextId = 1;
    const fakeClient = {
      $transaction: async (callback: (transaction: any) => Promise<unknown>) =>
        callback({
          tariffCode: {
            findFirst: async ({ where }: any) =>
              rows.find(
                row =>
                  row.countryCode === where.countryCode &&
                  row.code === where.code &&
                  row.nico === where.nico &&
                  row.validFrom.getTime() === where.validFrom.getTime(),
              ) ?? null,
            create: async ({ data }: any) => rows.push({ ...data, id: String(nextId++) }),
            update: async ({ where, data }: any) => {
              const row = rows.find(item => item.id === where.id);
              Object.assign(row, data);
            },
          },
        }),
    } as any;

    await expect(upsertTariffCatalog(fakeClient, [record])).resolves.toEqual({ created: 1, updated: 0 });
    await expect(upsertTariffCatalog(fakeClient, [{ ...record, description: 'Updated description.' }])).resolves.toEqual({
      created: 0,
      updated: 1,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.description).toBe('Updated description.');
  });
});

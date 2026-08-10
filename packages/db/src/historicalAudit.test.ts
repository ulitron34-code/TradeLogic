import { describe, expect, it } from 'vitest';
import { persistHistoricalAuditRun } from './historicalAudit.js';

describe('historical audit persistence', () => {
  it('replaces declarations idempotently for the same source fingerprint', async () => {
    const state = { run: null as any, declarations: [] as any[] };
    const client = {
      $transaction: async (callback: (transaction: any) => Promise<unknown>) => callback({
        historicalAuditRun: {
          findFirst: async () => state.run ? { id: state.run.id } : null,
          create: async ({ data }: any) => { state.run = { id: 'run-1', ...data }; return state.run; },
          update: async ({ data }: any) => { state.run = { ...state.run, ...data }; return state.run; },
        },
        historicalDeclaration: {
          deleteMany: async () => { state.declarations = []; },
          createMany: async ({ data }: any) => { state.declarations.push(...data); },
        },
      }),
    } as any;
    const input = { organizationId: 'org-1', createdById: 'user-1', sourceFilename: 'import.csv', sourceSha256: 'a'.repeat(64), sourceVersion: 'audit-1', summary: { total: 1 }, declarations: [{ rowNumber: 2, entryDate: new Date('2026-01-01'), tariffCode: '8501.10.01', countryOfOrigin: 'US', customsValue: 100, declaredDutyAmount: 10, status: 'NO_DIFFERENCE', reason: 'same' }] };
    expect((await persistHistoricalAuditRun(client, input)).created).toBe(true);
    expect((await persistHistoricalAuditRun(client, input)).created).toBe(false);
    expect(state.declarations).toHaveLength(1);
  });
});

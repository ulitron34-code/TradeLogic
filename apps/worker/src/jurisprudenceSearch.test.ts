import { describe, expect, it } from 'vitest';
import { findSimilarPrecedents } from './jurisprudenceSearch.js';

describe('jurisprudence vector search', () => {
  it('passes a pgvector literal and returns ranked matches', async () => {
    const calls: unknown[] = [];
    const db = { $queryRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => { calls.push({ strings: Array.from(strings), values }); return [{ id: 'case-1', ius: 1, claveTesis: 'I.1', rubro: 'Clasificacion', sourceUrl: 'https://example.test/tesis', similarity: 0.91 }]; } } as any;
    const matches = await findSimilarPrecedents([0.1, 0.2], 5, db);
    expect(matches[0]).toMatchObject({ ius: 1, similarity: 0.91 });
    expect(calls[0]).toMatchObject({ values: ['[0.1,0.2]', '[0.1,0.2]', 5] });
  });
});

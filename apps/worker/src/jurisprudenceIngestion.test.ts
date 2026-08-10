import { describe, expect, it, vi } from 'vitest';
vi.hoisted(() => {
  const values = {
    APP_BASE_URL: 'http://localhost:3000', API_BASE_URL: 'http://localhost:4000', DATABASE_URL: 'postgresql://test:test@localhost:5432/test', REDIS_URL: 'redis://localhost:6379', SUPABASE_URL: 'https://example.supabase.co', S3_ENDPOINT: 'http://localhost:9000', S3_REGION: 'us-east-1', S3_BUCKET: 'test', S3_ACCESS_KEY: 'test', S3_SECRET_KEY: 'test', JWT_ISSUER: 'test', JWT_AUDIENCE: 'test', JWT_SECRET: 'test-secret-at-least-32-characters-long', ENCRYPTION_KEY: 'test-encryption-key', FX_PROVIDER: 'banxico', REGULATORY_POLL_CRON: '0 * * * 1-5',
  };
  for (const [key, value] of Object.entries(values)) process.env[key] ??= value;
});
import { runJurisprudenceIngestion } from './jurisprudenceIngestion.js';

const summary = { id: '1', ius: 123, claveTesis: 'I.1', rubro: 'Clasificación arancelaria', localizacion: null, tipoTesis: 'TA' as const, sala: null, fuente: 'SJF', fechaPublicacion: null };
const detail = { ...summary, texto: 'La fracción arancelaria aplicable es 8501.10.01.', sourceUrl: 'https://example.test/tesis/123' };

describe('jurisprudence ingestion', () => {
  it('is idempotent and stores optional embeddings without requiring them', async () => {
    const records = new Map<number, any>();
    const updates: unknown[] = [];
    const db = {
      jurisprudenceCase: {
        findUnique: async ({ where }: any) => records.get(where.ius) ?? null,
        create: async ({ data }: any) => { const created = { id: 'row-1', ...data }; records.set(data.ius, created); return created; },
      },
      $executeRaw: async (...args: unknown[]) => { updates.push(args); },
    } as any;
    const dependencies = {
      db,
      searchTesis: async () => ({ results: [summary], total: 1 }),
      fetchTesisDetail: async () => detail,
      generateEmbedding: async () => null,
    } as any;
    expect(await runJurisprudenceIngestion(['clasificación'], dependencies)).toMatchObject({ queriesRun: 1, found: 1, ingested: 1, embedded: 0 });
    expect(await runJurisprudenceIngestion(['clasificación'], dependencies)).toMatchObject({ queriesRun: 1, found: 1, ingested: 0, embedded: 0 });
    expect(records.get(123).tariffFractionRefs).toContain('8501.10.01');
    expect(updates).toHaveLength(0);
  });

  it('persists a vector when the embedding provider returns one', async () => {
    const db = { jurisprudenceCase: { findUnique: async () => null, create: async ({ data }: any) => ({ id: 'row-2', ...data }) }, $executeRaw: async (...args: unknown[]) => args } as any;
    const result = await runJurisprudenceIngestion(['query'], { db, searchTesis: async () => ({ results: [summary], total: 1 }), fetchTesisDetail: async () => detail, generateEmbedding: async () => [0.1, 0.2] } as any);
    expect(result.embedded).toBe(1);
  });
});

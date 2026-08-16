import { describe, expect, it, vi } from 'vitest';
vi.hoisted(() => {
  const values = {
    APP_BASE_URL: 'http://localhost:3000', API_BASE_URL: 'http://localhost:4000', DATABASE_URL: 'postgresql://test:test@localhost:5432/test', REDIS_URL: 'redis://localhost:6379', SUPABASE_URL: 'https://example.supabase.co', S3_ENDPOINT: 'http://localhost:9000', S3_REGION: 'us-east-1', S3_BUCKET: 'test', S3_ACCESS_KEY: 'test', S3_SECRET_KEY: 'test', JWT_ISSUER: 'test', JWT_AUDIENCE: 'test', JWT_SECRET: 'test-secret-at-least-32-characters-long', ENCRYPTION_KEY: 'test-encryption-key', FX_PROVIDER: 'banxico', REGULATORY_POLL_CRON: '0 * * * 1-5',
  };
  for (const [key, value] of Object.entries(values)) process.env[key] ??= value;
});
import { runRegulatoryIngestion } from './regulatoryIngestion.js';

function makeDb(options: { duplicate?: boolean } = {}) {
  const sources: any[] = [];
  const provisions: any[] = [];
  const impacts: any[] = [];
  const alerts: any[] = [];
  const rawObjects: any[] = [];
  const db = {
    regulatorySource: {
      findUnique: async () => (options.duplicate ? { id: 'existing-source' } : null),
      create: async ({ data }: any) => {
        const source = { id: 'source-1', ...data };
        sources.push(source);
        return source;
      },
    },
    regulatoryProvision: {
      create: async ({ data }: any) => {
        const provision = { id: 'provision-1', ...data };
        provisions.push(provision);
        return provision;
      },
    },
    tariffCode: {
      findMany: async () => [{ id: 'tariff-1', code: '8501.10.01', validTo: null }],
    },
    classificationCase: {
      findMany: async () => [{ id: 'case-1', organizationId: 'org-1', selectedCodeId: 'tariff-1' }],
    },
    regulatoryImpact: {
      create: async ({ data }: any) => {
        const impact = { id: 'impact-1', ...data };
        impacts.push(impact);
        return impact;
      },
    },
    alert: {
      create: async ({ data }: any) => {
        alerts.push(data);
        return data;
      },
    },
  };
  return { db, sources, provisions, impacts, alerts, rawObjects };
}

const date = { year: 2026, month: 8, day: 10 };
const listings = [
  { codigo: '123', fecha: '10/08/2026', secretaria: 'Secretaría de Hacienda y Crédito Público', titulo: 'Acuerdo aduanero' },
  { codigo: '456', fecha: '10/08/2026', secretaria: 'Secretaría de Economía', titulo: 'Aviso comercial' },
  { codigo: '789', fecha: '10/08/2026', secretaria: 'SECRETARIA DE SALUD', titulo: 'Aviso sanitario' },
];

describe('regulatory ingestion worker', () => {
  it('filters relevant secretarias, stores raw source/provision, and creates impacts and alerts', async () => {
    const { db, sources, provisions, impacts, alerts, rawObjects } = makeDb();
    const result = await runRegulatoryIngestion(date, {
      db: db as any,
      fetchDailyEditions: async () => listings,
      fetchNoteDetail: async (codigo) => ({
        detail: { titulo: `Detalle ${codigo}`, cuerpo: 'Se modifica la fraccion 8501.10.01.' },
        rawHtml: `<html>${codigo}</html>`,
        url: `https://dof.example/${codigo}`,
      }),
      putRawObject: async (object) => { rawObjects.push(object); return { storageKey: object.storageKey }; },
    });

    expect(result).toEqual({ editionsFound: 3, relevantNotes: 3, ingested: 3 });
    expect(sources).toHaveLength(3);
    expect(provisions).toHaveLength(3);
    expect(rawObjects).toHaveLength(3);
    expect(impacts).toHaveLength(3);
    expect(alerts).toHaveLength(3);
    expect(alerts[0].impact.tariffCode).toBe('8501.10.01');
  });

  it('skips an already persisted source by authority, URL, and content hash', async () => {
    const { db, sources, provisions, impacts, alerts, rawObjects } = makeDb({ duplicate: true });
    const result = await runRegulatoryIngestion(date, {
      db: db as any,
      fetchDailyEditions: async () => [listings[0]!],
      fetchNoteDetail: async () => ({
        detail: { titulo: 'Detalle', cuerpo: '8501.10.01' },
        rawHtml: '<html>same</html>',
        url: 'https://dof.example/123',
      }),
      putRawObject: async (object) => { rawObjects.push(object); return { storageKey: object.storageKey }; },
    });

    expect(result).toEqual({ editionsFound: 1, relevantNotes: 1, ingested: 0 });
    expect(sources).toHaveLength(0);
    expect(provisions).toHaveLength(0);
    expect(impacts).toHaveLength(0);
    expect(alerts).toHaveLength(0);
    expect(rawObjects).toHaveLength(0);
  });
});

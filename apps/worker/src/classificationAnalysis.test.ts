import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const values = {
    APP_BASE_URL: 'http://localhost:3000', API_BASE_URL: 'http://localhost:4000', DATABASE_URL: 'postgresql://test:test@localhost:5432/test', REDIS_URL: 'redis://localhost:6379', SUPABASE_URL: 'https://example.supabase.co', S3_ENDPOINT: 'http://localhost:9000', S3_REGION: 'us-east-1', S3_BUCKET: 'test', S3_ACCESS_KEY: 'test', S3_SECRET_KEY: 'test', JWT_ISSUER: 'test', JWT_AUDIENCE: 'test', JWT_SECRET: 'test-secret-at-least-32-characters-long', ENCRYPTION_KEY: 'test-encryption-key', FX_PROVIDER: 'banxico', REGULATORY_POLL_CRON: '0 * * * 1-5', JURISPRUDENCE_POLL_CRON: '0 3 * * 1',
  };
  for (const [key, value] of Object.entries(values)) process.env[key] ??= value;
});

import { recoverClassificationAnalysisFailure, runClassificationAnalysis } from './classificationAnalysis.js';

const event = { event_id: 'evt-1', organization_id: 'org-1', actor_id: 'user-1', trace_id: 'trace-1', payload: { case_id: 'case-1', product_id: 'product-1' } };

function makeDb(withVersion = true) {
  const updates: any[] = [];
  const candidates: any[] = [];
  const audits: any[] = [];
  const db: any = {
    classificationCase: {
      findFirst: async () => ({ id: 'case-1', status: 'INTAKE', product: { versions: withVersion ? [{ id: 'version-1', description: 'Sensor electronico para conexion de circuitos', attributes: { function: 'sensor electrico' } }] : [] } }),
      update: async ({ data }: any) => { updates.push(data); return data; },
    },
    tariffCode: {
      findMany: async ({ where }: any) => {
        expect(where.countryCode).toBe('MX');
        expect(where.validFrom.lte).toBeInstanceOf(Date);
        return [{ id: 'tariff-1', code: '8536.50.99', nico: '99', description: 'Interruptores, conectores, sensores y aparatos electricos para corte o conexion de circuitos', sourceUrl: 'https://snice.gob.mx', legalNotes: null, validFrom: new Date('2020-01-01'), validTo: null, sourceVersion: 'LIGIE-MX-2026' }];
      },
    },
    classificationCandidate: {
      deleteMany: async () => undefined,
      createMany: async ({ data }: any) => { candidates.push(...data); },
    },
    auditEvent: { create: async ({ data }: any) => { audits.push(data); } },
  };
  return { db, updates, candidates, audits };
}

describe('classification analysis worker', () => {
  it('ranks current MX tariff candidates and persists the review outcome', async () => {
    const state = makeDb();
    const result = await runClassificationAnalysis(event, { db: state.db });
    expect(result.status).toBe('APPROVED');
    expect(result.candidateCount).toBe(1);
    expect(state.candidates[0].tariffCodeId).toBe('tariff-1');
    expect(state.updates.at(-1)).toMatchObject({ status: 'APPROVED', selectedCodeId: 'tariff-1' });
    expect(state.audits.map((audit) => audit.action)).toEqual(['classification.analysis.started', 'classification.analysis.completed']);
  });

  it('moves an intake case to NEEDS_INFORMATION when its product version is missing', async () => {
    const state = makeDb(false);
    const result = await runClassificationAnalysis(event, { db: state.db });
    expect(result).toEqual({ status: 'NEEDS_INFORMATION' });
    expect(state.updates.at(-1)).toMatchObject({ status: 'NEEDS_INFORMATION', assumptions: { analysis_blocker: expect.stringContaining('No product version') } });
    expect(state.audits.at(-1).action).toBe('classification.analysis.needs_information');
  });

  it('returns a failed analysis to intake while retries remain', async () => {
    const state = makeDb();
    const result = await recoverClassificationAnalysisFailure(event, new Error('temporary AI outage'), 1, { db: state.db });
    expect(result).toEqual({ status: 'INTAKE', retryable: true });
    expect(state.updates.at(-1)).toMatchObject({ status: 'INTAKE', assumptions: { retryable: true, attempts: 1 } });
    expect(state.audits.at(-1)).toMatchObject({ action: 'classification.analysis.failed', after: { status: 'INTAKE', retryable: true } });
  });

  it('leaves a visible blocker after the final failed attempt', async () => {
    const state = makeDb();
    const result = await recoverClassificationAnalysisFailure(event, 'permanent failure', 3, { db: state.db });
    expect(result).toEqual({ status: 'NEEDS_INFORMATION', retryable: false });
    expect(state.updates.at(-1)).toMatchObject({ status: 'NEEDS_INFORMATION', assumptions: { retryable: false, attempts: 3 } });
  });
});

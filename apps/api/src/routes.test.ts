import { describe, expect, it } from 'vitest';
process.env.APP_BASE_URL ??= 'http://localhost:3000';
process.env.API_BASE_URL ??= 'http://localhost:4000';
process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_URL ??= 'redis://localhost:6379';
process.env.S3_ENDPOINT ??= 'http://localhost:9000';
process.env.S3_REGION ??= 'us-east-1';
process.env.S3_BUCKET ??= 'platform-test';
process.env.S3_ACCESS_KEY ??= 'test';
process.env.S3_SECRET_KEY ??= 'test';
process.env.JWT_ISSUER ??= 'platform-test';
process.env.JWT_AUDIENCE ??= 'platform-test';
process.env.JWT_SECRET ??= 'test-secret-at-least-32-characters-long';
process.env.ENCRYPTION_KEY ??= 'test-encryption-key';
process.env.FX_PROVIDER ??= 'banxico';
process.env.REGULATORY_POLL_CRON ??= '0 * * * 1-5';
process.env.LOG_LEVEL ??= 'silent';
import type { FastifyInstance } from 'fastify';
import { DEV_ORG_ID, DEV_USER_ID, electronicProductFixture } from './test/fixtures.js';

type RecordMap<T> = Map<string, T>;

type FakeState = {
  products: RecordMap<any>;
  versions: RecordMap<any>;
  cases: RecordMap<any>;
  idempotency: RecordMap<any>;
  auditEvents: any[];
  queuedEvents: any[];
  nextProduct: number;
  nextVersion: number;
  nextCase: number;
};

function makeUuid(label: string, value: number) {
  return `00000000-0000-4000-8000-${label}${String(value).padStart(7, '0')}`;
}

function createHarness() {
  const state: FakeState = {
    products: new Map(),
    versions: new Map(),
    cases: new Map(),
    idempotency: new Map(),
    auditEvents: [],
    queuedEvents: [],
    nextProduct: 1,
    nextVersion: 1,
    nextCase: 1,
  };

  const now = new Date();
  const organization = {
    id: DEV_ORG_ID,
    name: 'Organizacion piloto',
    type: 'IMPORTER' as const,
    taxId: null,
    timezone: 'America/Mexico_City',
    createdAt: now,
    updatedAt: now,
  };
  const user = {
    id: DEV_USER_ID,
    email: 'owner@example.local',
    displayName: 'Owner local',
    createdAt: now,
  };

  const db = {
    product: {
      findMany: async () => Array.from(state.products.values()).map((product) => ({
        ...product,
        versions: Array.from(state.versions.values()).filter((version) => version.productId === product.id),
      })),
      create: async ({ data }: any) => {
        const product = {
          id: makeUuid('10000', state.nextProduct++),
          organizationId: data.organizationId,
          name: data.name,
          sku: data.sku,
          status: 'ACTIVE',
        };
        const version = {
          id: makeUuid('20000', state.nextVersion++),
          productId: product.id,
          version: data.versions.create.version,
          description: data.versions.create.description,
          attributes: data.versions.create.attributes,
        };
        state.products.set(product.id, product);
        state.versions.set(version.id, version);
        return { ...product, versions: [version] };
      },
      findFirst: async ({ where }: any) => {
        const product = state.products.get(where.id);
        if (!product || product.organizationId !== where.organizationId) return null;
        const versions = Array.from(state.versions.values()).filter((version) => version.productId === product.id);
        return { ...product, versions };
      },
    },
    productVersion: {
      findFirst: async ({ where }: any) => {
        const version = state.versions.get(where.id);
        if (!version || version.productId !== where.productId) return null;
        return version;
      },
    },
    classificationCase: {
      create: async ({ data }: any) => {
        const classificationCase = {
          id: makeUuid('30000', state.nextCase++),
          organizationId: data.organizationId,
          productId: data.productId,
          createdById: data.createdById,
          status: data.status,
          assumptions: data.assumptions,
        };
        state.cases.set(classificationCase.id, classificationCase);
        return classificationCase;
      },
      findFirst: async ({ where }: any) => {
        const classificationCase = state.cases.get(where.id);
        if (!classificationCase || classificationCase.organizationId !== where.organizationId) return null;
        return classificationCase;
      },
      update: async ({ where, data }: any) => {
        const existing = state.cases.get(where.id);
        if (!existing) throw new Error('case not found');
        const updated = { ...existing, ...data };
        state.cases.set(where.id, updated);
        return updated;
      },
    },
    idempotencyRecord: {
      findUnique: async ({ where }: any) => {
        const key = `${where.organizationId_scope_key.organizationId}:${where.organizationId_scope_key.scope}:${where.organizationId_scope_key.key}`;
        return state.idempotency.get(key) ?? null;
      },
      create: async ({ data }: any) => {
        const key = `${data.organizationId}:${data.scope}:${data.key}`;
        const record = { ...data, id: makeUuid('40000', state.idempotency.size + 1) };
        state.idempotency.set(key, record);
        return record;
      },
    },
    auditEvent: {
      create: async ({ data }: any) => {
        state.auditEvents.push(data);
        return data;
      },
    },
  };

  async function makeApp() {
    const { buildApp } = await import('./app.js');
    const app = await buildApp({
      db: db as any,
      ensureDevContext: async () => ({ user, organization, roles: ['OWNER'] as const }),
      enqueueClassificationSubmitted: async (event) => {
        state.queuedEvents.push(event);
      },
    });
    return app;
  }

  return { state, makeApp };
}

async function createProduct(app: FastifyInstance) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/products',
    payload: electronicProductFixture,
  });
  expect(response.statusCode).toBe(201);
  return response.json();
}

describe('classification case flow', () => {
  it('creates products and cases with idempotent replay', async () => {
    const { makeApp } = createHarness();
    const app = await makeApp();

    const product = await createProduct(app);
    const payload = { product_id: product.id };

    const first = await app.inject({
      method: 'POST',
      url: '/api/v1/classification-cases',
      headers: { 'Idempotency-Key': 'case-create-1' },
      payload,
    });
    const second = await app.inject({
      method: 'POST',
      url: '/api/v1/classification-cases',
      headers: { 'Idempotency-Key': 'case-create-1' },
      payload,
    });

    expect(first.statusCode).toBe(202);
    expect(second.statusCode).toBe(202);
    expect(second.json()).toEqual(first.json());
  });

  it('rejects idempotency key reuse with a different payload', async () => {
    const { makeApp } = createHarness();
    const app = await makeApp();
    const product = await createProduct(app);

    await app.inject({
      method: 'POST',
      url: '/api/v1/classification-cases',
      headers: { 'Idempotency-Key': 'case-create-conflict' },
      payload: { product_id: product.id },
    });

    const conflict = await app.inject({
      method: 'POST',
      url: '/api/v1/classification-cases',
      headers: { 'Idempotency-Key': 'case-create-conflict' },
      payload: { product_id: product.id, assumptions: { forced: true } },
    });

    expect(conflict.statusCode).toBe(409);
    expect(conflict.json().code).toBe('IDEMPOTENCY_CONFLICT');
  });

  it('submits a draft case and enqueues classification analysis', async () => {
    const { state, makeApp } = createHarness();
    const app = await makeApp();
    const product = await createProduct(app);

    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/classification-cases',
      headers: { 'Idempotency-Key': 'case-submit-create' },
      payload: { product_id: product.id },
    });
    const caseId = created.json().id;

    const submitted = await app.inject({
      method: 'POST',
      url: `/api/v1/classification-cases/${caseId}/submit`,
      headers: { 'Idempotency-Key': 'case-submit-1' },
    });

    expect(submitted.statusCode).toBe(202);
    expect(submitted.json().status).toBe('INTAKE');
    expect(submitted.json().queued).toBe(true);
    expect(state.queuedEvents).toHaveLength(1);
    expect(state.queuedEvents[0]!.payload.case_id).toBe(caseId);
    expect(state.cases.get(caseId)!.status).toBe('INTAKE');
  });
});
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
process.env.SUPABASE_URL ??= 'https://example.supabase.co';
process.env.LOG_LEVEL ??= 'silent';
import type { FastifyInstance } from 'fastify';
import { DEV_ORG_ID, DEV_USER_ID, electronicProductFixture } from './test/fixtures.js';

type RecordMap<T> = Map<string, T>;

type FakeState = {
  products: RecordMap<any>;
  versions: RecordMap<any>;
  cases: RecordMap<any>;
  idempotency: RecordMap<any>;
  documents: RecordMap<any>;
  candidates: RecordMap<any>;
  evidence: RecordMap<any>;
  reviews: RecordMap<any>;
  alerts: RecordMap<any>;
  costScenarios: RecordMap<any>;
  tariffCodes: RecordMap<any>;
  auditEvents: any[];
  queuedEvents: any[];
  nextProduct: number;
  nextVersion: number;
  nextCase: number;
  nextDocument: number;
  nextCandidate: number;
  nextReview: number;
  nextAlert: number;
  nextCostScenario: number;
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
    documents: new Map(),
    candidates: new Map(),
    evidence: new Map(),
    reviews: new Map(),
    alerts: new Map(),
    costScenarios: new Map(),
    tariffCodes: new Map(),
    auditEvents: [],
    queuedEvents: [],
    nextProduct: 1,
    nextVersion: 1,
    nextCase: 1,
    nextDocument: 1,
    nextCandidate: 1,
    nextReview: 1,
    nextAlert: 1,
    nextCostScenario: 1,
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
  const ownerIdentity = { user, organization, roles: ['OWNER'] as const };

  const otherOrganization = {
    id: makeUuid('90000', 1),
    name: 'Organizacion competidora',
    type: 'IMPORTER' as const,
    taxId: null,
    timezone: 'America/Mexico_City',
    createdAt: now,
    updatedAt: now,
  };
  const otherUser = {
    id: makeUuid('91000', 1),
    email: 'owner@competitor.local',
    displayName: 'Owner competidor',
    createdAt: now,
  };
  const otherIdentity = { user: otherUser, organization: otherOrganization, roles: ['OWNER'] as const };

  const db = {
    product: {
      findMany: async ({ where }: any = {}) => Array.from(state.products.values())
        .filter((product) => !where?.organizationId || product.organizationId === where.organizationId)
        .map((product) => ({
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
        const versions = Array.from(state.versions.values())
          .filter((version) => version.productId === product.id)
          .map((version) => ({
            ...version,
            documents: Array.from(state.documents.values())
              .filter((document) => document.productVersionId === version.id)
              .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
          }));
        return { ...product, versions };
      },
    },
    productVersion: {
      findFirst: async ({ where }: any) => {
        const version = state.versions.get(where.id);
        if (!version) return null;
        if (where.productId && version.productId !== where.productId) return null;
        if (where.product?.organizationId) {
          const product = state.products.get(version.productId);
          if (!product || product.organizationId !== where.product.organizationId) return null;
        }
        return version;
      },
    },
    document: {
      create: async ({ data }: any) => {
        const sequence = state.nextDocument++;
        const document = { id: makeUuid('50000', sequence), createdAt: new Date(now.getTime() + sequence * 1000), ...data };
        state.documents.set(document.id, document);
        return document;
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
      findFirst: async ({ where, include }: any) => {
        const classificationCase = state.cases.get(where.id);
        if (!classificationCase || classificationCase.organizationId !== where.organizationId) return null;
        if (!include?.candidates) return classificationCase;
        const candidates = Array.from(state.candidates.values())
          .filter((candidate) => candidate.caseId === classificationCase.id)
          .sort((a, b) => a.rank - b.rank);
        const limit = include.candidates.take;
        const evidence = Array.from(state.evidence.values()).filter((item) => item.caseId === classificationCase.id);
        return {
          ...classificationCase,
          candidates: typeof limit === 'number' ? candidates.slice(0, limit) : candidates,
          ...(include.evidence ? { evidence } : {}),
        };
      },
      update: async ({ where, data }: any) => {
        const existing = state.cases.get(where.id);
        if (!existing) throw new Error('case not found');
        const updated = { ...existing, ...data };
        state.cases.set(where.id, updated);
        return updated;
      },
    },
    classificationCandidate: {
      create: async ({ data }: any) => {
        const candidate = { id: makeUuid('60000', state.nextCandidate++), ...data };
        state.candidates.set(candidate.id, candidate);
        return candidate;
      },
    },
    humanReview: {
      create: async ({ data }: any) => {
        const review = { id: makeUuid('70000', state.nextReview++), createdAt: now, ...data };
        state.reviews.set(review.id, review);
        return review;
      },
    },
    alert: {
      findMany: async ({ where }: any) => {
        return Array.from(state.alerts.values())
          .filter((alert) => !where?.organizationId || alert.organizationId === where.organizationId)
          .filter((alert) => !where?.status || alert.status === where.status)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      },
      findFirst: async ({ where }: any) => {
        const alert = state.alerts.get(where.id);
        if (!alert || alert.organizationId !== where.organizationId) return null;
        return alert;
      },
      update: async ({ where, data }: any) => {
        const existing = state.alerts.get(where.id);
        if (!existing) throw new Error('alert not found');
        const updated = { ...existing, ...data };
        state.alerts.set(where.id, updated);
        return updated;
      },
    },
    costScenario: {
      create: async ({ data }: any) => {
        const sequence = state.nextCostScenario++;
        // Timestamp creciente por secuencia (no `now` fijo) para que las
        // pruebas de "mas reciente primero" tengan un orden real que probar.
        const scenario = { id: makeUuid('80000', sequence), createdAt: new Date(now.getTime() + sequence * 1000), ...data };
        state.costScenarios.set(scenario.id, scenario);
        return scenario;
      },
      findMany: async ({ where }: any) => {
        return Array.from(state.costScenarios.values())
          .filter((scenario) => scenario.caseId === where.caseId && scenario.organizationId === where.organizationId)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      },
    },
    tariffCode: {
      findFirst: async ({ where }: any) => Array.from(state.tariffCodes.values()).find((record: any) =>
        record.id === where.id && record.countryCode === where.countryCode && record.validFrom <= where.validFrom.lte &&
        (record.validTo === null || record.validTo > where.OR[1].validTo.gt)) ?? null,
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

  // Simula lo que headObject veria en el bucket real despues de que el
  // cliente sube el archivo con la URL presignada (paso que las pruebas no
  // ejecutan, ya que no hay S3/MinIO real corriendo en la suite).
  const storageObjects = new Map<string, { sizeBytes: number }>();

  async function makeApp(identity: typeof ownerIdentity = ownerIdentity, options: { databaseReady?: boolean } = {}) {
    const { buildApp } = await import('./app.js');
    const app = await buildApp({
      db: db as any,
      readinessCheck: async () => {
        if (options.databaseReady === false) throw new Error('database unavailable');
      },
      resolveContext: async () => identity,
      enqueueClassificationSubmitted: async (event) => {
        state.queuedEvents.push(event);
      },
      presignUpload: async ({ storageKey }) => ({
        uploadUrl: `https://fake-upload.local/${storageKey}`,
        expiresInSeconds: 300,
      }),
      headObject: async (storageKey) => {
        const object = storageObjects.get(storageKey);
        return object ? { exists: true as const, sizeBytes: object.sizeBytes } : { exists: false as const, sizeBytes: 0 };
      },
    });
    return app;
  }

  return { state, makeApp, ownerIdentity, otherIdentity, storageObjects };
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
  it('reports API liveness separately from database readiness', async () => {
    const { makeApp } = createHarness();
    const readyApp = await makeApp();
    expect((await readyApp.inject({ method: 'GET', url: '/health' })).statusCode).toBe(200);
    expect((await readyApp.inject({ method: 'GET', url: '/ready' })).json()).toMatchObject({ status: 'ready', database: 'ok' });

    const unavailableApp = await makeApp(undefined, { databaseReady: false });
    const response = await unavailableApp.inject({ method: 'GET', url: '/ready' });
    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ status: 'not_ready', database: 'unavailable', retryable: true });
  });

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

describe('multi-tenant isolation (T-012)', () => {
  it('never lists another organization\'s products', async () => {
    const { makeApp, ownerIdentity, otherIdentity } = createHarness();
    const ownerApp = await makeApp(ownerIdentity);
    await createProduct(ownerApp);

    const otherApp = await makeApp(otherIdentity);
    const response = await otherApp.inject({ method: 'GET', url: '/api/v1/products' });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toEqual([]);
  });

  it('returns 404, not the record, when reading another organization\'s product by id', async () => {
    const { makeApp, ownerIdentity, otherIdentity } = createHarness();
    const ownerApp = await makeApp(ownerIdentity);
    const product = await createProduct(ownerApp);

    const otherApp = await makeApp(otherIdentity);
    const response = await otherApp.inject({ method: 'GET', url: `/api/v1/products/${product.id}` });

    expect(response.statusCode).toBe(404);
  });

  it('refuses to create a classification case against another organization\'s product', async () => {
    const { makeApp, ownerIdentity, otherIdentity } = createHarness();
    const ownerApp = await makeApp(ownerIdentity);
    const product = await createProduct(ownerApp);

    const otherApp = await makeApp(otherIdentity);
    const response = await otherApp.inject({
      method: 'POST',
      url: '/api/v1/classification-cases',
      headers: { 'Idempotency-Key': 'cross-org-case-create' },
      payload: { product_id: product.id },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().code).toBe('PRODUCT_NOT_FOUND');
  });

  it('returns 404, not the record, when reading another organization\'s classification case', async () => {
    const { makeApp, ownerIdentity, otherIdentity } = createHarness();
    const ownerApp = await makeApp(ownerIdentity);
    const product = await createProduct(ownerApp);
    const created = await ownerApp.inject({
      method: 'POST',
      url: '/api/v1/classification-cases',
      headers: { 'Idempotency-Key': 'cross-org-case-read' },
      payload: { product_id: product.id },
    });
    const caseId = created.json().id;

    const otherApp = await makeApp(otherIdentity);
    const response = await otherApp.inject({ method: 'GET', url: `/api/v1/classification-cases/${caseId}` });

    expect(response.statusCode).toBe(404);
  });

  it('returns an explainable legal-risk assessment with case details', async () => {
    const { makeApp, ownerIdentity } = createHarness();
    const app = await makeApp(ownerIdentity);
    const product = await createProduct(app);
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/classification-cases',
      headers: { 'Idempotency-Key': 'case-risk-assessment' },
      payload: { product_id: product.id },
    });
    const response = await app.inject({ method: 'GET', url: `/api/v1/classification-cases/${created.json().id}` });

    expect(response.statusCode).toBe(200);
    expect(response.json().riskAssessment).toMatchObject({
      rulesetVersion: 'mx-tradelogic-risk-2026.1',
      requiresHumanReview: true,
    });
    expect(Array.isArray(response.json().riskAssessment.factors)).toBe(true);
  });

  it('refuses to submit another organization\'s classification case', async () => {
    const { makeApp, ownerIdentity, otherIdentity } = createHarness();
    const ownerApp = await makeApp(ownerIdentity);
    const product = await createProduct(ownerApp);
    const created = await ownerApp.inject({
      method: 'POST',
      url: '/api/v1/classification-cases',
      headers: { 'Idempotency-Key': 'cross-org-case-submit' },
      payload: { product_id: product.id },
    });
    const caseId = created.json().id;

    const otherApp = await makeApp(otherIdentity);
    const response = await otherApp.inject({
      method: 'POST',
      url: `/api/v1/classification-cases/${caseId}/submit`,
      headers: { 'Idempotency-Key': 'cross-org-case-submit-attempt' },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().code).toBe('CLASSIFICATION_CASE_NOT_FOUND');
  });
});

describe('document upload (block 3: storage)', () => {
  it('presigns an upload key scoped to the organization', async () => {
    const { makeApp, ownerIdentity } = createHarness();
    const app = await makeApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/documents/presign',
      payload: { filename: 'invoice.pdf', mimeType: 'application/pdf' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.storage_key.startsWith(`org/${ownerIdentity.organization.id}/`)).toBe(true);
    expect(body.upload_url).toContain(body.storage_key);
  });

  it('registers a document once the object exists in storage with a matching size', async () => {
    const { makeApp, storageObjects } = createHarness();
    const app = await makeApp();

    const presigned = await app.inject({
      method: 'POST',
      url: '/api/v1/documents/presign',
      payload: { filename: 'invoice.pdf', mimeType: 'application/pdf' },
    });
    const { storage_key: storageKey } = presigned.json();
    storageObjects.set(storageKey, { sizeBytes: 1024 });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/documents',
      payload: {
        storage_key: storageKey,
        filename: 'invoice.pdf',
        mime_type: 'application/pdf',
        size_bytes: 1024,
        sha256: 'a'.repeat(64),
        source_type: 'PRODUCT_EVIDENCE',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().storageKey).toBe(storageKey);
    expect(response.json().sizeBytes).toBe(1024);
  });

  it('returns product evidence documents from product detail', async () => {
    const { makeApp, storageObjects } = createHarness();
    const app = await makeApp();
    const product = await createProduct(app);
    const versionId = product.versions[0].id;

    const presigned = await app.inject({
      method: 'POST',
      url: '/api/v1/documents/presign',
      payload: { filename: 'ficha-tecnica.pdf', mimeType: 'application/pdf' },
    });
    const { storage_key: storageKey } = presigned.json();
    storageObjects.set(storageKey, { sizeBytes: 2048 });

    const documentResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/documents',
      payload: {
        storage_key: storageKey,
        filename: 'ficha-tecnica.pdf',
        mime_type: 'application/pdf',
        size_bytes: 2048,
        sha256: 'b'.repeat(64),
        source_type: 'PRODUCT_EVIDENCE',
        product_version_id: versionId,
      },
    });
    expect(documentResponse.statusCode).toBe(201);

    const detailResponse = await app.inject({ method: 'GET', url: `/api/v1/products/${product.id}` });

    expect(detailResponse.statusCode).toBe(200);
    expect(detailResponse.json().versions[0].documents).toEqual([
      expect.objectContaining({ filename: 'ficha-tecnica.pdf', mimeType: 'application/pdf', sizeBytes: 2048 }),
    ]);
  });
  it('rejects registration when the object was never uploaded', async () => {
    const { makeApp, ownerIdentity } = createHarness();
    const app = await makeApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/documents',
      payload: {
        storage_key: `org/${ownerIdentity.organization.id}/never-uploaded.pdf`,
        filename: 'invoice.pdf',
        mime_type: 'application/pdf',
        size_bytes: 1024,
        sha256: 'a'.repeat(64),
        source_type: 'PRODUCT_EVIDENCE',
      },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().code).toBe('DOCUMENT_NOT_UPLOADED');
  });

  it('rejects registration when the claimed size does not match the uploaded object', async () => {
    const { makeApp, storageObjects } = createHarness();
    const app = await makeApp();

    const presigned = await app.inject({
      method: 'POST',
      url: '/api/v1/documents/presign',
      payload: { filename: 'invoice.pdf', mimeType: 'application/pdf' },
    });
    const { storage_key: storageKey } = presigned.json();
    storageObjects.set(storageKey, { sizeBytes: 2048 });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/documents',
      payload: {
        storage_key: storageKey,
        filename: 'invoice.pdf',
        mime_type: 'application/pdf',
        size_bytes: 1024,
        sha256: 'a'.repeat(64),
        source_type: 'PRODUCT_EVIDENCE',
      },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().code).toBe('DOCUMENT_SIZE_MISMATCH');
  });

  it('refuses to register a storage_key belonging to another organization', async () => {
    const { makeApp, storageObjects, otherIdentity } = createHarness();
    const ownerApp = await makeApp();

    const presigned = await ownerApp.inject({
      method: 'POST',
      url: '/api/v1/documents/presign',
      payload: { filename: 'invoice.pdf', mimeType: 'application/pdf' },
    });
    const { storage_key: storageKey } = presigned.json();
    storageObjects.set(storageKey, { sizeBytes: 1024 });

    const otherApp = await makeApp(otherIdentity);
    const response = await otherApp.inject({
      method: 'POST',
      url: '/api/v1/documents',
      payload: {
        storage_key: storageKey,
        filename: 'invoice.pdf',
        mime_type: 'application/pdf',
        size_bytes: 1024,
        sha256: 'a'.repeat(64),
        source_type: 'PRODUCT_EVIDENCE',
      },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().code).toBe('STORAGE_KEY_FORBIDDEN');
  });

  it('rejects a product_version_id that belongs to another organization', async () => {
    const { makeApp, storageObjects, otherIdentity } = createHarness();
    const ownerApp = await makeApp();
    const product = await createProduct(ownerApp);
    const versionId = product.versions[0].id;

    const otherApp = await makeApp(otherIdentity);
    const otherPresigned = await otherApp.inject({
      method: 'POST',
      url: '/api/v1/documents/presign',
      payload: { filename: 'invoice.pdf', mimeType: 'application/pdf' },
    });
    const { storage_key: otherStorageKey } = otherPresigned.json();
    storageObjects.set(otherStorageKey, { sizeBytes: 1024 });

    const response = await otherApp.inject({
      method: 'POST',
      url: '/api/v1/documents',
      payload: {
        storage_key: otherStorageKey,
        filename: 'invoice.pdf',
        mime_type: 'application/pdf',
        size_bytes: 1024,
        sha256: 'a'.repeat(64),
        source_type: 'PRODUCT_EVIDENCE',
        product_version_id: versionId,
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().code).toBe('PRODUCT_VERSION_NOT_FOUND');
  });
});

describe('classification case review (block 5: human review)', () => {
  it('refuses to review when the caller role is not OWNER/ADMIN/REVIEWER', async () => {
    const { makeApp, ownerIdentity } = createHarness();
    const ownerApp = await makeApp();
    const product = await createProduct(ownerApp);
    const created = await ownerApp.inject({
      method: 'POST',
      url: '/api/v1/classification-cases',
      headers: { 'Idempotency-Key': 'review-rbac-create' },
      payload: { product_id: product.id },
    });
    const caseId = created.json().id;

    const analystIdentity = { ...ownerIdentity, roles: ['ANALYST'] as const } as unknown as typeof ownerIdentity;
    const analystApp = await makeApp(analystIdentity);
    const response = await analystApp.inject({
      method: 'POST',
      url: `/api/v1/classification-cases/${caseId}/review`,
      headers: { 'Idempotency-Key': 'review-rbac-attempt' },
      payload: { decision: 'APPROVED' },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().code).toBe('FORBIDDEN_ROLE');
  });

  it('refuses to review a case that is not in NEEDS_REVIEW status', async () => {
    const { makeApp } = createHarness();
    const app = await makeApp();
    const product = await createProduct(app);
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/classification-cases',
      headers: { 'Idempotency-Key': 'review-status-create' },
      payload: { product_id: product.id },
    });
    const caseId = created.json().id; // status DRAFT right after create

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/classification-cases/${caseId}/review`,
      headers: { 'Idempotency-Key': 'review-status-attempt' },
      payload: { decision: 'APPROVED' },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().code).toBe('INVALID_CASE_STATUS');
  });

  it('approves a case in NEEDS_REVIEW and selects the top-ranked candidate', async () => {
    const { state, makeApp } = createHarness();
    const app = await makeApp();
    const product = await createProduct(app);
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/classification-cases',
      headers: { 'Idempotency-Key': 'review-approve-create' },
      payload: { product_id: product.id },
    });
    const caseId = created.json().id;

    state.cases.get(caseId).status = 'NEEDS_REVIEW';
    const topTariffCodeId = makeUuid('80000', 1);
    state.candidates.set('cand-1', { id: 'cand-1', caseId, tariffCodeId: topTariffCodeId, rank: 1 });
    state.evidence.set('evidence-1', { id: 'evidence-1', caseId, documentId: makeUuid('50000', 1), claimType: 'PRODUCT_IDENTITY' });

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/classification-cases/${caseId}/review`,
      headers: { 'Idempotency-Key': 'review-approve-attempt' },
      payload: { decision: 'APPROVED', notes: 'Se revisaron los candidatos, coincide con la fraccion.' },
    });

    expect(response.statusCode).toBe(202);
    expect(response.json().status).toBe('APPROVED');
    expect(state.cases.get(caseId).status).toBe('APPROVED');
    expect(state.cases.get(caseId).selectedCodeId).toBe(topTariffCodeId);
    expect(state.reviews.size).toBe(1);
  });

  it('rejects a case in NEEDS_REVIEW without setting a selected code', async () => {
    const { state, makeApp } = createHarness();
    const app = await makeApp();
    const product = await createProduct(app);
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/classification-cases',
      headers: { 'Idempotency-Key': 'review-reject-create' },
      payload: { product_id: product.id },
    });
    const caseId = created.json().id;
    state.cases.get(caseId).status = 'NEEDS_REVIEW';

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/classification-cases/${caseId}/review`,
      headers: { 'Idempotency-Key': 'review-reject-attempt' },
      payload: { decision: 'REJECTED', notes: 'No coincide con la descripcion del producto.' },
    });

    expect(response.statusCode).toBe(202);
    expect(response.json().status).toBe('REJECTED');
    expect(state.cases.get(caseId).selectedCodeId).toBeUndefined();
  });

  it('sends a case with changes requested back to NEEDS_INFORMATION', async () => {
    const { state, makeApp } = createHarness();
    const app = await makeApp();
    const product = await createProduct(app);
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/classification-cases',
      headers: { 'Idempotency-Key': 'review-changes-create' },
      payload: { product_id: product.id },
    });
    const caseId = created.json().id;
    state.cases.get(caseId).status = 'NEEDS_REVIEW';

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/classification-cases/${caseId}/review`,
      headers: { 'Idempotency-Key': 'review-changes-attempt' },
      payload: { decision: 'CHANGES_REQUESTED', notes: 'Falta evidencia de composicion del material.' },
    });

    expect(response.statusCode).toBe(202);
    expect(response.json().status).toBe('NEEDS_INFORMATION');
    expect(state.cases.get(caseId).status).toBe('NEEDS_INFORMATION');
  });
});

describe('alerts', () => {
  it('lists alerts scoped to the caller organization, newest first', async () => {
    const { state, makeApp, ownerIdentity, otherIdentity } = createHarness();
    const app = await makeApp();
    const now = Date.now();
    state.alerts.set('alert-1', {
      id: 'alert-1',
      organizationId: ownerIdentity.organization.id,
      severity: 'WARNING',
      status: 'OPEN',
      title: 'Posible cambio normativo sobre 8517.62',
      summary: 'DOF publico un acuerdo relevante',
      impact: {},
      sourceRefs: {},
      createdAt: new Date(now - 1000),
    });
    state.alerts.set('alert-2', {
      id: 'alert-2',
      organizationId: ownerIdentity.organization.id,
      severity: 'INFO',
      status: 'OPEN',
      title: 'Alerta mas reciente',
      summary: 'Otra publicacion',
      impact: {},
      sourceRefs: {},
      createdAt: new Date(now),
    });
    state.alerts.set('alert-other-org', {
      id: 'alert-other-org',
      organizationId: otherIdentity.organization.id,
      severity: 'CRITICAL',
      status: 'OPEN',
      title: 'No deberia verse',
      summary: '...',
      impact: {},
      sourceRefs: {},
      createdAt: new Date(now),
    });

    const response = await app.inject({ method: 'GET', url: '/api/v1/alerts' });

    expect(response.statusCode).toBe(200);
    const ids = response.json().data.map((alert: { id: string }) => alert.id);
    expect(ids).toEqual(['alert-2', 'alert-1']);
  });

  it('filters alerts by status', async () => {
    const { state, makeApp, ownerIdentity } = createHarness();
    const app = await makeApp();
    state.alerts.set('alert-open', {
      id: 'alert-open',
      organizationId: ownerIdentity.organization.id,
      severity: 'WARNING',
      status: 'OPEN',
      title: 'Abierta',
      summary: '...',
      impact: {},
      sourceRefs: {},
      createdAt: new Date(),
    });
    state.alerts.set('alert-resolved', {
      id: 'alert-resolved',
      organizationId: ownerIdentity.organization.id,
      severity: 'WARNING',
      status: 'RESOLVED',
      title: 'Resuelta',
      summary: '...',
      impact: {},
      sourceRefs: {},
      createdAt: new Date(),
    });

    const response = await app.inject({ method: 'GET', url: '/api/v1/alerts?status=RESOLVED' });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toHaveLength(1);
    expect(response.json().data[0].id).toBe('alert-resolved');
  });

  it('updates an alert status', async () => {
    const { state, makeApp, ownerIdentity } = createHarness();
    const app = await makeApp();
    const alertId = makeUuid('95000', 1);
    state.alerts.set(alertId, {
      id: alertId,
      organizationId: ownerIdentity.organization.id,
      severity: 'WARNING',
      status: 'OPEN',
      title: 'Abierta',
      summary: '...',
      impact: {},
      sourceRefs: {},
      createdAt: new Date(),
    });

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/alerts/${alertId}/status`,
      payload: { status: 'ACKNOWLEDGED' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().status).toBe('ACKNOWLEDGED');
    expect(state.alerts.get(alertId).status).toBe('ACKNOWLEDGED');
  });

  it('returns 404 when updating an alert from another organization', async () => {
    const { state, makeApp, otherIdentity } = createHarness();
    const app = await makeApp();
    const alertId = makeUuid('95000', 2);
    state.alerts.set(alertId, {
      id: alertId,
      organizationId: otherIdentity.organization.id,
      severity: 'WARNING',
      status: 'OPEN',
      title: 'Ajena',
      summary: '...',
      impact: {},
      sourceRefs: {},
      createdAt: new Date(),
    });

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/alerts/${alertId}/status`,
      payload: { status: 'DISMISSED' },
    });

    expect(response.statusCode).toBe(404);
  });
});

describe('cost scenarios', () => {
  it('uses the selected current official IGI rate when no manual rate is supplied', async () => {
    const { makeApp, state } = createHarness();
    const app = await makeApp();
    const product = await createProduct(app);
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/classification-cases',
      headers: { 'Idempotency-Key': 'cost-scenario-official-rate' },
      payload: { product_id: product.id },
    });
    const caseId = created.json().id;
    const tariffCodeId = makeUuid('88000', 1);
    state.cases.get(caseId).selectedCodeId = tariffCodeId;
    state.tariffCodes.set(tariffCodeId, {
      id: tariffCodeId,
      countryCode: 'MX',
      generalRate: 10,
      rateUnit: 'PERCENT',
      validFrom: new Date('2021-11-19'),
      validTo: null,
      sourceVersion: 'SNICE-LIGIE-BASE-2021-11-19',
      sourceUrl: 'https://www.snice.gob.mx/ligie',
    });

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/classification-cases/${caseId}/cost-scenarios`,
      payload: { customs_value: 1000 },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().inputs.duty_rate_percent).toBe(10);
    expect(response.json().inputs.duty_rate_source).toContain('SNICE-LIGIE-BASE-2021-11-19');
  });

  it('creates a cost scenario with the deterministic landed cost breakdown', async () => {
    const { makeApp } = createHarness();
    const app = await makeApp();
    const product = await createProduct(app);
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/classification-cases',
      headers: { 'Idempotency-Key': 'cost-scenario-create' },
      payload: { product_id: product.id },
    });
    const caseId = created.json().id;

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/classification-cases/${caseId}/cost-scenarios`,
      payload: {
        customs_value: 10000,
        freight: 500,
        insurance: 100,
        duty_rate_percent: 15,
        duty_rate_source: 'Criterio manual documentado',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.currency).toBe('MXN');
    expect(body.outputs.totalLandedCost).toBe(14238.77);
    expect(body.rulesetVersion).toBe(body.outputs.rulesetVersion);
  });

  it('returns 404 for a cost scenario request against a case in another organization', async () => {
    const { makeApp, otherIdentity } = createHarness();
    const ownerApp = await makeApp();
    const product = await createProduct(ownerApp);
    const created = await ownerApp.inject({
      method: 'POST',
      url: '/api/v1/classification-cases',
      headers: { 'Idempotency-Key': 'cost-scenario-cross-org' },
      payload: { product_id: product.id },
    });
    const caseId = created.json().id;

    const otherApp = await makeApp(otherIdentity);
    const response = await otherApp.inject({
      method: 'POST',
      url: `/api/v1/classification-cases/${caseId}/cost-scenarios`,
      payload: { customs_value: 1000, duty_rate_percent: 10, duty_rate_source: 'Criterio manual documentado' },
    });

    expect(response.statusCode).toBe(404);
  });

  it('requires a source when a manual duty rate is supplied', async () => {
    const { makeApp } = createHarness();
    const app = await makeApp();
    const product = await createProduct(app);
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/classification-cases',
      headers: { 'Idempotency-Key': 'cost-scenario-manual-source-required' },
      payload: { product_id: product.id },
    });

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/classification-cases/${created.json().id}/cost-scenarios`,
      payload: { customs_value: 1000, duty_rate_percent: 10 },
    });

    expect(response.statusCode).toBe(422);
    expect(response.json().code).toBe('MANUAL_RATE_SOURCE_REQUIRED');
  });
  it('does not silently assume zero when no official or manual rate exists', async () => {
    const { makeApp } = createHarness();
    const app = await makeApp();
    const product = await createProduct(app);
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/classification-cases',
      headers: { 'Idempotency-Key': 'cost-scenario-rate-required' },
      payload: { product_id: product.id },
    });

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/classification-cases/${created.json().id}/cost-scenarios`,
      payload: { customs_value: 1000 },
    });

    expect(response.statusCode).toBe(422);
    expect(response.json().code).toBe('OFFICIAL_RATE_UNAVAILABLE');
  });

  it('lists cost scenarios for a case, newest first', async () => {
    const { makeApp } = createHarness();
    const app = await makeApp();
    const product = await createProduct(app);
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/classification-cases',
      headers: { 'Idempotency-Key': 'cost-scenario-list' },
      payload: { product_id: product.id },
    });
    const caseId = created.json().id;

    await app.inject({
      method: 'POST',
      url: `/api/v1/classification-cases/${caseId}/cost-scenarios`,
      payload: { customs_value: 1000, duty_rate_percent: 5, duty_rate_source: 'Criterio manual documentado' },
    });
    await app.inject({
      method: 'POST',
      url: `/api/v1/classification-cases/${caseId}/cost-scenarios`,
      payload: { customs_value: 2000, duty_rate_percent: 5, duty_rate_source: 'Criterio manual documentado' },
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/classification-cases/${caseId}/cost-scenarios`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toHaveLength(2);
    expect(response.json().data[0].inputs.customs_value).toBe(2000);
  });
});

describe('historical audit import', () => {
  it('rejects a CSV whose claimed SHA-256 does not match the content', async () => {
    const { makeApp, ownerIdentity } = createHarness();
    const app = await makeApp(ownerIdentity);
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/historical-audits',
      payload: {
        source_filename: 'historical.csv',
        source_sha256: 'a'.repeat(64),
        source_version: 'audit-2026.1',
        csv: 'entry_date,tariff_code,country_of_origin,customs_value,declared_duty_amount\n2026-01-01,85011001,US,1000,50',
      },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe('SOURCE_SHA256_MISMATCH');
  });
});

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
  reviews: RecordMap<any>;
  auditEvents: any[];
  queuedEvents: any[];
  nextProduct: number;
  nextVersion: number;
  nextCase: number;
  nextDocument: number;
  nextCandidate: number;
  nextReview: number;
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
    reviews: new Map(),
    auditEvents: [],
    queuedEvents: [],
    nextProduct: 1,
    nextVersion: 1,
    nextCase: 1,
    nextDocument: 1,
    nextCandidate: 1,
    nextReview: 1,
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
        const versions = Array.from(state.versions.values()).filter((version) => version.productId === product.id);
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
        const document = { id: makeUuid('50000', state.nextDocument++), ...data };
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
        return { ...classificationCase, candidates: typeof limit === 'number' ? candidates.slice(0, limit) : candidates };
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

  async function makeApp(identity: typeof ownerIdentity = ownerIdentity) {
    const { buildApp } = await import('./app.js');
    const app = await buildApp({
      db: db as any,
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
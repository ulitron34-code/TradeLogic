import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { env } from '@platform/config';
import { db as defaultDb, scopeToOrganization, type Prisma } from '@platform/db';
import {
  buildStorageKey,
  headObject as defaultHeadObject,
  presignUpload as defaultPresignUpload,
} from '@platform/storage';
import { resolveAuthContext, type AuthContext } from './auth.js';
import { ensureDevContext } from './context.js';
import { hashPayload, replayOrStore } from './idempotency.js';
import { enqueueClassificationSubmitted as defaultEnqueueClassificationSubmitted } from './queue.js';

async function defaultResolveContext(request: FastifyRequest, db: typeof defaultDb): Promise<AuthContext> {
  if (env.DEV_AUTH_BYPASS) return ensureDevContext();
  return resolveAuthContext(request.headers.authorization, db);
}

const createProductBody = z.object({
  name: z.string().min(1).max(200),
  sku: z.string().max(80).optional(),
  description: z.string().min(1).max(4000),
  attributes: z.record(z.unknown()).default({}),
});

const createCaseBody = z.object({
  product_id: z.string().uuid(),
  product_version_id: z.string().uuid().optional(),
  assumptions: z.record(z.unknown()).optional(),
});

const paramsWithId = z.object({ id: z.string().uuid() });
const paramsWithCaseId = z.object({ caseId: z.string().uuid() });

const MAX_DOCUMENT_SIZE_BYTES = 50 * 1024 * 1024;

const presignDocumentBody = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(200),
});

const createDocumentBody = z.object({
  storage_key: z.string().min(1),
  filename: z.string().min(1).max(255),
  mime_type: z.string().min(1).max(200),
  size_bytes: z.number().int().positive().max(MAX_DOCUMENT_SIZE_BYTES),
  sha256: z.string().regex(/^[a-f0-9]{64}$/i, 'sha256 must be a 64-char hex digest'),
  source_type: z.string().min(1).max(80),
  product_version_id: z.string().uuid().optional(),
});

export type RouteDependencies = {
  db?: typeof defaultDb;
  resolveContext?: (request: FastifyRequest, db: typeof defaultDb) => Promise<AuthContext>;
  enqueueClassificationSubmitted?: typeof defaultEnqueueClassificationSubmitted;
  presignUpload?: typeof defaultPresignUpload;
  headObject?: typeof defaultHeadObject;
};

function requireIdempotencyKey(value: string | string[] | undefined) {
  const key = Array.isArray(value) ? value[0] : value;
  if (!key) {
    const error = new Error('Idempotency-Key is required');
    Object.assign(error, { statusCode: 400, code: 'IDEMPOTENCY_KEY_REQUIRED' });
    throw error;
  }
  return key;
}

export async function registerRoutes(app: FastifyInstance, dependencies: RouteDependencies = {}) {
  const db = dependencies.db ?? defaultDb;
  const resolveContext = dependencies.resolveContext ?? defaultResolveContext;
  const enqueueClassificationSubmitted = dependencies.enqueueClassificationSubmitted ?? defaultEnqueueClassificationSubmitted;
  const presignUpload = dependencies.presignUpload ?? defaultPresignUpload;
  const headObject = dependencies.headObject ?? defaultHeadObject;

  app.get('/health', async () => ({ status: 'ok', service: 'api' }));

  app.get('/api/v1/me', async (request) => {
    const context = await resolveContext(request, db);
    return {
      id: context.user.id,
      organizationId: context.organization.id,
      roles: context.roles,
    };
  });

  app.get('/api/v1/products', async (request) => {
    const { organization } = await resolveContext(request, db);
    const scopedDb = scopeToOrganization(db, organization.id);
    const products = await scopedDb.product.findMany({
      where: { organizationId: organization.id },
      include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
      orderBy: { updatedAt: 'desc' },
    });
    return { data: products };
  });

  app.post('/api/v1/products', async (request, reply) => {
    const { organization } = await resolveContext(request, db);
    const scopedDb = scopeToOrganization(db, organization.id);
    const body = createProductBody.parse(request.body);

    const product = await scopedDb.product.create({
      data: {
        organizationId: organization.id,
        name: body.name,
        ...(body.sku ? { sku: body.sku } : {}),
        versions: {
          create: {
            version: 1,
            description: body.description,
            attributes: body.attributes as Prisma.InputJsonValue,
          },
        },
      },
      include: { versions: true },
    });

    return reply.code(201).send(product);
  });

  app.get('/api/v1/products/:id', async (request, reply) => {
    const { organization } = await resolveContext(request, db);
    const scopedDb = scopeToOrganization(db, organization.id);
    const params = paramsWithId.parse(request.params);
    const product = await scopedDb.product.findFirst({
      where: { id: params.id, organizationId: organization.id },
      include: { versions: { orderBy: { version: 'desc' } } },
    });

    if (!product) return reply.notFound('Product not found');
    return product;
  });

  app.post('/api/v1/documents/presign', async (request) => {
    const { organization } = await resolveContext(request, db);
    const body = presignDocumentBody.parse(request.body);

    const storageKey = buildStorageKey(organization.id, body.filename);
    const { uploadUrl, expiresInSeconds } = await presignUpload({
      storageKey,
      mimeType: body.mimeType,
    });

    return { upload_url: uploadUrl, storage_key: storageKey, expires_in_seconds: expiresInSeconds };
  });

  app.post('/api/v1/documents', async (request, reply) => {
    const { organization } = await resolveContext(request, db);
    const scopedDb = scopeToOrganization(db, organization.id);
    const body = createDocumentBody.parse(request.body);

    // El uploadUrl presignado solo protege la escritura al bucket; sin este
    // prefijo, cualquier usuario autenticado podria registrar como propio un
    // storageKey subido por otra organizacion si lo adivinara.
    if (!body.storage_key.startsWith(`org/${organization.id}/`)) {
      const error = new Error('storage_key does not belong to this organization');
      Object.assign(error, { statusCode: 403, code: 'STORAGE_KEY_FORBIDDEN' });
      throw error;
    }

    if (body.product_version_id) {
      const version = await scopedDb.productVersion.findFirst({
        where: { id: body.product_version_id, product: { organizationId: organization.id } },
      });
      if (!version) {
        const error = new Error('Product version not found');
        Object.assign(error, { statusCode: 404, code: 'PRODUCT_VERSION_NOT_FOUND' });
        throw error;
      }
    }

    const uploaded = await headObject(body.storage_key);
    if (!uploaded.exists) {
      const error = new Error('storage_key has not been uploaded yet');
      Object.assign(error, { statusCode: 409, code: 'DOCUMENT_NOT_UPLOADED' });
      throw error;
    }
    if (uploaded.sizeBytes !== body.size_bytes) {
      const error = new Error('size_bytes does not match the uploaded object');
      Object.assign(error, { statusCode: 409, code: 'DOCUMENT_SIZE_MISMATCH' });
      throw error;
    }

    const document = await scopedDb.document.create({
      data: {
        organizationId: organization.id,
        ...(body.product_version_id ? { productVersionId: body.product_version_id } : {}),
        filename: body.filename,
        mimeType: body.mime_type,
        sizeBytes: body.size_bytes,
        sha256: body.sha256,
        storageKey: body.storage_key,
        sourceType: body.source_type,
      },
    });

    return reply.code(201).send(document);
  });

  app.post('/api/v1/classification-cases', async (request, reply) => {
    const { user, organization } = await resolveContext(request, db);
    const scopedDb = scopeToOrganization(db, organization.id);
    const idempotencyKey = requireIdempotencyKey(request.headers['idempotency-key']);
    const body = createCaseBody.parse(request.body);
    const requestHash = hashPayload(body);

    const response = await replayOrStore({
      organizationId: organization.id,
      key: idempotencyKey,
      scope: 'classification-cases:create',
      requestHash,
      build: async () => {
        const product = await scopedDb.product.findFirst({
          where: { id: body.product_id, organizationId: organization.id },
          include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
        });
        if (!product) {
          const error = new Error('Product not found');
          Object.assign(error, { statusCode: 404, code: 'PRODUCT_NOT_FOUND' });
          throw error;
        }

        const selectedVersion = body.product_version_id
          ? await scopedDb.productVersion.findFirst({
              where: { id: body.product_version_id, productId: product.id },
            })
          : product.versions[0];

        if (!selectedVersion) {
          const error = new Error('Product version not found');
          Object.assign(error, { statusCode: 404, code: 'PRODUCT_VERSION_NOT_FOUND' });
          throw error;
        }

        const classificationCase = await scopedDb.classificationCase.create({
          data: {
            organizationId: organization.id,
            productId: product.id,
            createdById: user.id,
            status: 'DRAFT',
            assumptions: {
              ...(body.assumptions ?? {}),
              productVersionId: selectedVersion.id,
            },
          },
        });

        await scopedDb.auditEvent.create({
          data: {
            organizationId: organization.id,
            actorId: user.id,
            action: 'classification_case.created',
            entityType: 'ClassificationCase',
            entityId: classificationCase.id,
            after: {
              id: classificationCase.id,
              status: classificationCase.status,
              productId: classificationCase.productId,
            },
            traceId: randomUUID(),
          },
        });

        return {
          id: classificationCase.id,
          status: classificationCase.status,
          product_id: product.id,
          product_version_id: selectedVersion.id,
        };
      },
    }, scopedDb);

    return reply.code(202).send(response);
  });

  app.post('/api/v1/classification-cases/:caseId/submit', async (request, reply) => {
    const { user, organization } = await resolveContext(request, db);
    const scopedDb = scopeToOrganization(db, organization.id);
    const params = paramsWithCaseId.parse(request.params);
    const idempotencyKey = requireIdempotencyKey(request.headers['idempotency-key']);
    const requestHash = hashPayload({ caseId: params.caseId });

    const response = await replayOrStore({
      organizationId: organization.id,
      key: idempotencyKey,
      scope: 'classification-cases:submit',
      requestHash,
      build: async () => {
        const existingCase = await scopedDb.classificationCase.findFirst({
          where: { id: params.caseId, organizationId: organization.id },
        });

        if (!existingCase) {
          const error = new Error('Classification case not found');
          Object.assign(error, { statusCode: 404, code: 'CLASSIFICATION_CASE_NOT_FOUND' });
          throw error;
        }

        if (existingCase.status !== 'DRAFT' && existingCase.status !== 'NEEDS_INFORMATION') {
          const error = new Error(`Cannot submit case from status ${existingCase.status}`);
          Object.assign(error, { statusCode: 409, code: 'INVALID_CASE_STATUS' });
          throw error;
        }

        const submittedCase = await scopedDb.classificationCase.update({
          where: { id: existingCase.id },
          data: { status: 'INTAKE' },
        });

        const traceId = randomUUID();
        const eventId = randomUUID();
        const productVersionId =
          typeof submittedCase.assumptions === 'object' && submittedCase.assumptions !== null && !Array.isArray(submittedCase.assumptions)
            ? String((submittedCase.assumptions as Record<string, unknown>).productVersionId ?? '')
            : '';
        const event = {
          event_id: eventId,
          occurred_at: new Date().toISOString(),
          organization_id: organization.id,
          actor_id: user.id,
          trace_id: traceId,
          schema_version: 1 as const,
          payload: {
            case_id: submittedCase.id,
            product_id: submittedCase.productId,
            ...(productVersionId ? { product_version_id: productVersionId } : {}),
          },
        };

        await scopedDb.auditEvent.create({
          data: {
            organizationId: organization.id,
            actorId: user.id,
            action: 'classification.case.submitted',
            entityType: 'ClassificationCase',
            entityId: submittedCase.id,
            before: { status: existingCase.status },
            after: { status: submittedCase.status, eventId },
            traceId,
          },
        });

        await enqueueClassificationSubmitted(event);

        return {
          id: submittedCase.id,
          status: submittedCase.status,
          event_id: eventId,
          queued: true,
        };
      },
    }, scopedDb);

    return reply.code(202).send(response);
  });

  app.get('/api/v1/classification-cases/:caseId', async (request, reply) => {
    const { organization } = await resolveContext(request, db);
    const scopedDb = scopeToOrganization(db, organization.id);
    const params = paramsWithCaseId.parse(request.params);
    const classificationCase = await scopedDb.classificationCase.findFirst({
      where: { id: params.caseId, organizationId: organization.id },
      include: {
        product: true,
        candidates: { include: { tariffCode: true }, orderBy: { rank: 'asc' } },
        reviews: { orderBy: { createdAt: 'desc' } },
        evidence: { include: { document: true } },
      },
    });

    if (!classificationCase) return reply.notFound('Classification case not found');
    return classificationCase;
  });
}
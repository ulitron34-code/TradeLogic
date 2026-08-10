import { createHash, randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { env } from '@platform/config';
import { analyzeHistoricalDeclarations, assessLegalRisk, calculateLandedCost, parseHistoricalDeclarationsCsv, renderCaseDossierPdf } from '@platform/domain';
import { db as defaultDb, persistHistoricalAuditRun, scopeToOrganization, type Prisma } from '@platform/db';
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

const reviewCaseBody = z.object({
  decision: z.enum(['APPROVED', 'CHANGES_REQUESTED', 'REJECTED']),
  notes: z.string().max(2000).optional(),
});

// RBAC.md: "Aprobar caso critico" solo lo permiten Owner, Admin y Reviewer.
const REVIEW_ROLES = new Set(['OWNER', 'ADMIN', 'REVIEWER']);
const AUDIT_ROLES = new Set(['OWNER', 'ADMIN', 'REVIEWER']);

const alertStatusBody = z.object({
  status: z.enum(['OPEN', 'ACKNOWLEDGED', 'SNOOZED', 'RESOLVED', 'DISMISSED']),
});

const listAlertsQuery = z.object({
  status: z.enum(['OPEN', 'ACKNOWLEDGED', 'SNOOZED', 'RESOLVED', 'DISMISSED']).optional(),
});

const costScenarioBody = z.object({
  currency: z.string().length(3).default('MXN'),
  customs_value: z.number().nonnegative(),
  freight: z.number().nonnegative().default(0),
  insurance: z.number().nonnegative().default(0),
  duty_rate_percent: z.number().nonnegative().optional(),
  iva_rate_percent: z.number().nonnegative().optional(),
  other_fees: z.number().nonnegative().optional(),
});

const historicalAuditBody = z.object({
  source_filename: z.string().min(1).max(255),
  source_sha256: z.string().regex(/^[a-f0-9]{64}$/i),
  source_version: z.string().min(1).max(100),
  csv: z.string().min(1).max(10_000_000),
});

const paramsWithId = z.object({ id: z.string().uuid() });
const paramsWithCaseId = z.object({ caseId: z.string().uuid() });
const paramsWithAlertId = z.object({ alertId: z.string().uuid() });

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
  readinessCheck?: () => Promise<void>;
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
  const readinessCheck = dependencies.readinessCheck ?? (async () => { await db.$queryRaw`SELECT 1`; });
  const resolveContext = dependencies.resolveContext ?? defaultResolveContext;
  const enqueueClassificationSubmitted = dependencies.enqueueClassificationSubmitted ?? defaultEnqueueClassificationSubmitted;
  const presignUpload = dependencies.presignUpload ?? defaultPresignUpload;
  const headObject = dependencies.headObject ?? defaultHeadObject;

  app.get('/health', async () => ({ status: 'ok', service: 'api' }));

  app.get('/ready', async (_request, reply) => {
    try {
      await readinessCheck();
      return { status: 'ready', service: 'api', database: 'ok' };
    } catch {
      return reply.status(503).send({ status: 'not_ready', service: 'api', database: 'unavailable', retryable: true });
    }
  });

  app.get('/api/v1/me', async (request) => {
    const context = await resolveContext(request, db);
    return {
      id: context.user.id,
      email: context.user.email,
      organizationId: context.organization.id,
      organizationName: context.organization.name,
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

  app.get('/api/v1/classification-cases', async (request) => {
    const { organization } = await resolveContext(request, db);
    const scopedDb = scopeToOrganization(db, organization.id);
    const cases = await scopedDb.classificationCase.findMany({
      where: { organizationId: organization.id },
      include: {
        product: { select: { id: true, name: true, sku: true } },
        candidates: {
          include: { tariffCode: { select: { code: true, nico: true, description: true } } },
          orderBy: { rank: 'asc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return { data: cases };
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
    const now = new Date();
    const classificationCase = await scopedDb.classificationCase.findFirst({
      where: { id: params.caseId, organizationId: organization.id },
      include: {
        product: true,
        candidates: {
          include: {
            tariffCode: {
              include: {
                regulatoryRequirements: {
                  where: {
                    validFrom: { lte: now },
                    OR: [{ validTo: null }, { validTo: { gt: now } }],
                  },
                  orderBy: [{ mandatory: 'desc' }, { authority: 'asc' }, { title: 'asc' }],
                },
              },
            },
          },
          orderBy: { rank: 'asc' },
        },
        reviews: { orderBy: { createdAt: 'desc' } },
        evidence: { include: { document: true } },
      },
    });

    if (!classificationCase) return reply.notFound('Classification case not found');
    const candidates = classificationCase.candidates ?? [];
    const evidence = classificationCase.evidence ?? [];
    const reviews = classificationCase.reviews ?? [];
    const topCandidate = candidates[0];
    const riskAssessment = assessLegalRisk({
      classificationScore: topCandidate ? Number(topCandidate.score) : Number(classificationCase.confidence ?? 0),
      contradictions: topCandidate && Array.isArray(topCandidate.contradictions) ? topCandidate.contradictions.length : 0,
      documentaryEvidenceCount: evidence.length,
      regulatoryChecks: candidates.flatMap((candidate) =>
        (candidate.tariffCode?.regulatoryRequirements ?? []).map((requirement) => ({
          title: requirement.title,
          mandatory: requirement.mandatory,
          satisfied: false,
          sourceUrl: requirement.sourceUrl,
        })),
      ),
      hasHumanReview: reviews.length > 0,
      hasOriginEvidence: evidence.some((item) => item.claimType.toLowerCase().includes('origin')),
      hasValuationEvidence: evidence.some((item) => item.claimType.toLowerCase().includes('valuation')),
    });
    return { ...classificationCase, riskAssessment };
  });

  app.get('/api/v1/classification-cases/:caseId/dossier.pdf', async (request, reply) => {
    const { organization } = await resolveContext(request, db);
    const scopedDb = scopeToOrganization(db, organization.id);
    const params = paramsWithCaseId.parse(request.params);
    const now = new Date();
    const classificationCase = await scopedDb.classificationCase.findFirst({
      where: { id: params.caseId, organizationId: organization.id },
      include: {
        product: true,
        candidates: {
          include: {
            tariffCode: {
              include: {
                regulatoryRequirements: {
                  where: { validFrom: { lte: now }, OR: [{ validTo: null }, { validTo: { gt: now } }] },
                  orderBy: [{ mandatory: 'desc' }, { authority: 'asc' }, { title: 'asc' }],
                },
              },
            },
          },
          orderBy: { rank: 'asc' },
        },
        reviews: { orderBy: { createdAt: 'desc' } },
        evidence: { include: { document: true } },
      },
    });
    if (!classificationCase) return reply.notFound('Classification case not found');

    const candidates = classificationCase.candidates ?? [];
    const evidence = classificationCase.evidence ?? [];
    const reviews = classificationCase.reviews ?? [];
    const topCandidate = candidates[0];
    const riskAssessment = assessLegalRisk({
      classificationScore: topCandidate ? Number(topCandidate.score) : Number(classificationCase.confidence ?? 0),
      contradictions: topCandidate && Array.isArray(topCandidate.contradictions) ? topCandidate.contradictions.length : 0,
      documentaryEvidenceCount: evidence.length,
      regulatoryChecks: candidates.flatMap((candidate) => (candidate.tariffCode?.regulatoryRequirements ?? []).map((requirement) => ({ title: requirement.title, mandatory: requirement.mandatory, satisfied: false, sourceUrl: requirement.sourceUrl }))),
      hasHumanReview: reviews.length > 0,
      hasOriginEvidence: evidence.some((item) => item.claimType.toLowerCase().includes('origin')),
      hasValuationEvidence: evidence.some((item) => item.claimType.toLowerCase().includes('valuation')),
    });
    const pdf = renderCaseDossierPdf({
      id: classificationCase.id,
      status: classificationCase.status,
      generatedAt: new Date().toISOString(),
      product: { name: classificationCase.product.name, sku: classificationCase.product.sku },
      candidates: candidates.map((candidate) => ({
        rank: candidate.rank,
        code: candidate.tariffCode.code,
        nico: candidate.tariffCode.nico,
        description: candidate.tariffCode.description,
        score: Number(candidate.score),
        sourceVersion: candidate.tariffCode.sourceVersion,
        sourceUrl: candidate.tariffCode.sourceUrl,
        regulatoryRequirements: (candidate.tariffCode.regulatoryRequirements ?? []).map((requirement) => ({ title: requirement.title, authority: requirement.authority, sourceVersion: requirement.sourceVersion, sourceUrl: requirement.sourceUrl, mandatory: requirement.mandatory })),
      })),
      evidence: evidence.map((item) => ({ filename: item.document?.filename ?? 'documento', sha256: item.document?.sha256 ?? '', claimType: item.claimType })),
      reviews: reviews.map((review) => ({ decision: review.decision, notes: review.notes, createdAt: review.createdAt.toISOString() })),
      riskAssessment: { score: riskAssessment.score, band: riskAssessment.band, rulesetVersion: riskAssessment.rulesetVersion, factors: riskAssessment.factors },
      disclaimer: riskAssessment.disclaimer,
    });
    return reply.type('application/pdf').header('Content-Disposition', `attachment; filename="tradelogic-${classificationCase.id}.pdf"`).send(Buffer.from(pdf));
  });

  app.get('/api/v1/classification-cases/:caseId/audit', async (request, reply) => {
    const { organization, roles } = await resolveContext(request, db);
    if (!roles.some((role) => AUDIT_ROLES.has(role))) return reply.code(403).send({ code: 'FORBIDDEN_ROLE', message: 'Audit access requires an authorized reviewer role' });
    const scopedDb = scopeToOrganization(db, organization.id);
    const params = paramsWithCaseId.parse(request.params);
    const classificationCase = await scopedDb.classificationCase.findFirst({ where: { id: params.caseId, organizationId: organization.id } });
    if (!classificationCase) return reply.notFound('Classification case not found');
    const events = await scopedDb.auditEvent.findMany({
      where: { organizationId: organization.id, entityType: 'ClassificationCase', entityId: classificationCase.id },
      orderBy: { occurredAt: 'desc' },
    });
    return { data: events };
  });

  app.post('/api/v1/classification-cases/:caseId/review', async (request, reply) => {
    const { user, organization, roles } = await resolveContext(request, db);
    if (!roles.some((role) => REVIEW_ROLES.has(role))) {
      const error = new Error('Only OWNER, ADMIN, or REVIEWER can review a classification case');
      Object.assign(error, { statusCode: 403, code: 'FORBIDDEN_ROLE' });
      throw error;
    }

    const scopedDb = scopeToOrganization(db, organization.id);
    const params = paramsWithCaseId.parse(request.params);
    const idempotencyKey = requireIdempotencyKey(request.headers['idempotency-key']);
    const body = reviewCaseBody.parse(request.body);
    const requestHash = hashPayload({ caseId: params.caseId, ...body });

    const response = await replayOrStore({
      organizationId: organization.id,
      key: idempotencyKey,
      scope: 'classification-cases:review',
      requestHash,
      build: async () => {
        const existingCase = await scopedDb.classificationCase.findFirst({
          where: { id: params.caseId, organizationId: organization.id },
          include: {
            candidates: { orderBy: { rank: 'asc' }, take: 1 },
            evidence: { select: { id: true } },
          },
        });

        if (!existingCase) {
          const error = new Error('Classification case not found');
          Object.assign(error, { statusCode: 404, code: 'CLASSIFICATION_CASE_NOT_FOUND' });
          throw error;
        }

        if (existingCase.status !== 'NEEDS_REVIEW') {
          const error = new Error(`Cannot review case from status ${existingCase.status}`);
          Object.assign(error, { statusCode: 409, code: 'INVALID_CASE_STATUS' });
          throw error;
        }

        // CHANGES_REQUESTED regresa el caso a NEEDS_INFORMATION para que se
        // pueda corregir y reenviar a analisis; APPROVED/REJECTED son
        // terminales, tal como pide el plan.
        const nextStatus =
          body.decision === 'APPROVED' ? 'APPROVED' : body.decision === 'REJECTED' ? 'REJECTED' : 'NEEDS_INFORMATION';
        const topCandidate = existingCase.candidates[0];

        if (body.decision === 'APPROVED' && !topCandidate) {
          const error = new Error('Cannot approve a case without a ranked tariff candidate');
          Object.assign(error, { statusCode: 409, code: 'MISSING_TARIFF_CANDIDATE' });
          throw error;
        }

        if (body.decision === 'APPROVED' && existingCase.evidence.length === 0) {
          const error = new Error('Cannot approve a case without documentary evidence');
          Object.assign(error, { statusCode: 409, code: 'MISSING_DOCUMENTARY_EVIDENCE' });
          throw error;
        }

        const reviewedCase = await scopedDb.classificationCase.update({
          where: { id: existingCase.id },
          data: {
            status: nextStatus,
            ...(body.decision === 'APPROVED' && topCandidate ? { selectedCodeId: topCandidate.tariffCodeId } : {}),
          },
        });

        const review = await scopedDb.humanReview.create({
          data: {
            caseId: existingCase.id,
            reviewerId: user.id,
            decision: body.decision,
            ...(body.notes ? { notes: body.notes } : {}),
          },
        });

        await scopedDb.auditEvent.create({
          data: {
            organizationId: organization.id,
            actorId: user.id,
            action: 'classification.case.reviewed',
            entityType: 'ClassificationCase',
            entityId: existingCase.id,
            before: { status: existingCase.status },
            after: { status: reviewedCase.status, decision: body.decision, reviewId: review.id },
            traceId: randomUUID(),
          },
        });

        return {
          id: reviewedCase.id,
          status: reviewedCase.status,
          review_id: review.id,
        };
      },
    }, scopedDb);

    return reply.code(202).send(response);
  });

  app.post('/api/v1/classification-cases/:caseId/cost-scenarios', async (request, reply) => {
    const { organization } = await resolveContext(request, db);
    const scopedDb = scopeToOrganization(db, organization.id);
    const params = paramsWithCaseId.parse(request.params);
    const body = costScenarioBody.parse(request.body);

    const classificationCase = await scopedDb.classificationCase.findFirst({
      where: { id: params.caseId, organizationId: organization.id },
    });
    if (!classificationCase) return reply.notFound('Classification case not found');

    let dutyRatePercent = body.duty_rate_percent;
    let dutyRateSource = body.duty_rate_percent === undefined ? 'UNAVAILABLE' : 'MANUAL_OVERRIDE';
    if (dutyRatePercent === undefined && classificationCase.selectedCodeId) {
      const now = new Date();
      const selectedTariffCode = await scopedDb.tariffCode.findFirst({
        where: {
          id: classificationCase.selectedCodeId,
          countryCode: 'MX',
          validFrom: { lte: now },
          OR: [{ validTo: null }, { validTo: { gt: now } }],
        },
      });
      if (selectedTariffCode?.rateUnit === 'PERCENT' && selectedTariffCode.generalRate !== null) {
        dutyRatePercent = Number(selectedTariffCode.generalRate);
        dutyRateSource = `${selectedTariffCode.sourceVersion}:${selectedTariffCode.sourceUrl ?? 'source-url-missing'}`;
      }
    }
    if (dutyRatePercent === undefined) {
      return reply.code(422).send({ code: 'OFFICIAL_RATE_UNAVAILABLE', message: 'No hay una tasa IGI porcentual versionada para el codigo seleccionado; captura una tasa manual con fundamento.' });
    }

    // Motor deterministico. Los montos se asumen expresados en `currency`;
    // la conversion de moneda queda fuera de este escenario.
    const breakdown = calculateLandedCost({
      customsValue: body.customs_value,
      freight: body.freight,
      insurance: body.insurance,
      dutyRatePercent,
      ...(body.iva_rate_percent !== undefined ? { ivaRatePercent: body.iva_rate_percent } : {}),
      ...(body.other_fees !== undefined ? { otherFees: body.other_fees } : {}),
    });

    const scenario = await scopedDb.costScenario.create({
      data: {
        organizationId: organization.id,
        caseId: classificationCase.id,
        currency: body.currency,
        inputs: { ...body, duty_rate_percent: dutyRatePercent, duty_rate_source: dutyRateSource } as Prisma.InputJsonValue,
        outputs: breakdown as unknown as Prisma.InputJsonValue,
        rulesetVersion: breakdown.rulesetVersion,
        fxSnapshot: {},
      },
    });

    return reply.code(201).send(scenario);
  });

  app.get('/api/v1/classification-cases/:caseId/cost-scenarios', async (request, reply) => {
    const { organization } = await resolveContext(request, db);
    const scopedDb = scopeToOrganization(db, organization.id);
    const params = paramsWithCaseId.parse(request.params);

    const classificationCase = await scopedDb.classificationCase.findFirst({
      where: { id: params.caseId, organizationId: organization.id },
    });
    if (!classificationCase) return reply.notFound('Classification case not found');

    const scenarios = await scopedDb.costScenario.findMany({
      where: { caseId: classificationCase.id, organizationId: organization.id },
      orderBy: { createdAt: 'desc' },
    });
    return { data: scenarios };
  });

  app.post('/api/v1/historical-audits', async (request, reply) => {
    const { user, organization } = await resolveContext(request, db);
    const body = historicalAuditBody.parse(request.body);
    const sourceSha256 = createHash('sha256').update(body.csv, 'utf8').digest('hex');
    if (sourceSha256.toLowerCase() !== body.source_sha256.toLowerCase()) {
      return reply.code(400).send({ code: 'SOURCE_SHA256_MISMATCH', message: 'source_sha256 does not match the uploaded CSV' });
    }
    const rows = parseHistoricalDeclarationsCsv(body.csv);
    const now = new Date();
    const scopedDb = scopeToOrganization(db, organization.id);
    const tariffCodes = await scopedDb.tariffCode.findMany({ where: { countryCode: 'MX', validFrom: { lte: now }, OR: [{ validTo: null }, { validTo: { gt: now } }], rateUnit: 'PERCENT' } });
    const rates = tariffCodes.flatMap((tariffCode) => tariffCode.generalRate === null ? [] : [{ tariffCode: tariffCode.code, nico: tariffCode.nico, ratePercent: Number(tariffCode.generalRate), sourceVersion: tariffCode.sourceVersion, sourceUrl: tariffCode.sourceUrl ?? '' }]);
    const results = analyzeHistoricalDeclarations(rows, rates);
    const summary = {
      total: results.length,
      potentialOverpayment: results.filter((result) => result.status === 'POTENTIAL_OVERPAYMENT').length,
      potentialUnderpayment: results.filter((result) => result.status === 'POTENTIAL_UNDERPAYMENT').length,
      reviewRequired: results.filter((result) => result.status === 'REVIEW_REQUIRED').length,
      noDifference: results.filter((result) => result.status === 'NO_DIFFERENCE').length,
    };
    const persisted = await persistHistoricalAuditRun(scopedDb as typeof defaultDb, {
      organizationId: organization.id,
      createdById: user.id,
      sourceFilename: body.source_filename,
      sourceSha256,
      sourceVersion: body.source_version,
      summary,
      declarations: rows.map((row, index) => ({
        rowNumber: row.rowNumber,
        entryDate: new Date(row.entryDate),
        tariffCode: row.tariffCode,
        nico: row.nico ?? null,
        countryOfOrigin: row.countryOfOrigin,
        customsValue: row.customsValue,
        declaredDutyRatePercent: row.declaredDutyRatePercent ?? null,
        declaredDutyAmount: row.declaredDutyAmount,
        expectedDutyAmount: results[index]?.expectedDutyAmount ?? null,
        difference: results[index]?.difference ?? null,
        status: results[index]?.status ?? 'REVIEW_REQUIRED',
        reason: results[index]?.reason ?? 'No se pudo analizar el registro.',
        rateSourceVersion: results[index]?.rateSourceVersion ?? null,
        rateSourceUrl: results[index]?.rateSourceUrl ?? null,
      })),
    });
    return reply.code(201).send({ ...persisted, summary, results });
  });

  app.get('/api/v1/alerts', async (request) => {
    const { organization } = await resolveContext(request, db);
    const scopedDb = scopeToOrganization(db, organization.id);
    const query = listAlertsQuery.parse(request.query);

    const alerts = await scopedDb.alert.findMany({
      where: { organizationId: organization.id, ...(query.status ? { status: query.status } : {}) },
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
    });
    return { data: alerts };
  });

  app.post('/api/v1/alerts/:alertId/status', async (request, reply) => {
    const { organization } = await resolveContext(request, db);
    const scopedDb = scopeToOrganization(db, organization.id);
    const params = paramsWithAlertId.parse(request.params);
    const body = alertStatusBody.parse(request.body);

    const existing = await scopedDb.alert.findFirst({
      where: { id: params.alertId, organizationId: organization.id },
    });
    if (!existing) return reply.notFound('Alert not found');

    const updated = await scopedDb.alert.update({
      where: { id: existing.id },
      data: { status: body.status },
    });
    return updated;
  });
}

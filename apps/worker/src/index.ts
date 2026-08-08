import { randomUUID } from 'node:crypto';
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { env } from '@platform/config';
import { db, type Prisma } from '@platform/db';
import { rankTariffCandidates, requiresHumanReview } from '@platform/domain';
import { claimsForCandidate, enrichClassification } from '@platform/ai';
import { runRegulatoryIngestion } from './regulatoryIngestion.js';

const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });

const REGULATORY_INGESTION_QUEUE = 'regulatory-ingestion';

// Registro idempotente: BullMQ dedupe los jobs repetibles por cola + patron
// + jobId, asi que volver a llamar add() en cada arranque del worker no crea
// duplicados mientras el patron no cambie.
const regulatoryIngestionQueue = new Queue(REGULATORY_INGESTION_QUEUE, { connection });
await regulatoryIngestionQueue.add(
  'regulatory.ingestion.scheduled',
  {},
  { repeat: { pattern: env.REGULATORY_POLL_CRON }, jobId: 'regulatory-ingestion-scheduled' },
);

new Worker(
  REGULATORY_INGESTION_QUEUE,
  async () => {
    const today = new Date();
    const date = { year: today.getUTCFullYear(), month: today.getUTCMonth() + 1, day: today.getUTCDate() };
    try {
      const result = await runRegulatoryIngestion(date);
      console.log('regulatory ingestion run', { date, ...result });
    } catch (error) {
      // El DOF es un sitio legado sin SLA (ver docs/REGULATORY_INGESTION.md);
      // un fallo aqui no debe tumbar el proceso del worker ni afectar la
      // cola de clasificacion.
      console.error('regulatory ingestion run failed', error);
    }
  },
  { connection },
);

new Worker('classification-analysis', async job => {
  if (job.name !== 'classification.case.submitted') return;

  const event = job.data as {
    event_id: string;
    organization_id: string;
    actor_id: string;
    trace_id: string;
    payload: { case_id: string; product_id: string; product_version_id?: string };
  };

  const classificationCase = await db.classificationCase.findFirst({
    where: {
      id: event.payload.case_id,
      organizationId: event.organization_id,
      status: 'INTAKE',
    },
    include: {
      product: {
        include: { versions: { orderBy: { version: 'desc' } } },
      },
    },
  });

  if (!classificationCase) {
    console.warn('classification case not ready for analysis', event.payload.case_id);
    return;
  }

  const analysisRunId = randomUUID();
  await db.classificationCase.update({
    where: { id: classificationCase.id },
    data: { status: 'IN_ANALYSIS' },
  });

  await db.auditEvent.create({
    data: {
      organizationId: event.organization_id,
      actorId: event.actor_id,
      action: 'classification.analysis.started',
      entityType: 'ClassificationCase',
      entityId: classificationCase.id,
      before: { status: classificationCase.status },
      after: {
        status: 'IN_ANALYSIS',
        sourceEventId: event.event_id,
        analysisRunId,
      },
      traceId: event.trace_id,
    },
  });

  const productVersion = selectProductVersion(
    classificationCase.product.versions,
    event.payload.product_version_id,
  );

  if (!productVersion) {
    await markNeedsInformation(event, classificationCase.id, 'No product version was available for analysis.');
    return;
  }

  const tariffCodes = await db.tariffCode.findMany({
    where: { countryCode: 'MX', validTo: null },
    orderBy: [{ code: 'asc' }, { nico: 'asc' }],
    take: 250,
  });

  if (tariffCodes.length === 0) {
    await markNeedsInformation(event, classificationCase.id, 'No tariff codes are seeded for MX.');
    return;
  }

  const rankedCandidates = rankTariffCandidates(
    {
      description: productVersion.description,
      attributes: productVersion.attributes as Record<string, unknown>,
    },
    tariffCodes.map((code) => ({
      id: code.id,
      code: code.code,
      nico: code.nico,
      description: code.description,
      sourceVersion: code.sourceVersion,
    })),
  );

  const topCandidate = rankedCandidates[0];
  if (!topCandidate) {
    await markNeedsInformation(event, classificationCase.id, 'No tariff candidates could be ranked.');
    return;
  }

  // Capa de IA opcional: enriquece la explicacion de los candidatos ya
  // rankeados con evidencia citada. Nunca cambia el ranking/score, y si
  // ANTHROPIC_API_KEY no esta configurada (como hoy) o la respuesta falla
  // cualquier validacion, enrichClassification devuelve null y el flujo
  // deterministico sigue exactamente igual.
  const enrichment = await enrichClassification({
    product: {
      description: productVersion.description,
      attributes: productVersion.attributes as Record<string, unknown>,
    },
    candidates: rankedCandidates.map((candidate) => ({
      id: candidate.id,
      code: candidate.code,
      nico: candidate.nico ?? null,
      description: candidate.description,
      score: candidate.score,
    })),
  });

  await db.classificationCandidate.deleteMany({ where: { caseId: classificationCase.id } });
  await db.classificationCandidate.createMany({
    data: rankedCandidates.map((candidate, index) => {
      const aiClaims = claimsForCandidate(enrichment, candidate.id);
      return {
        caseId: classificationCase.id,
        tariffCodeId: candidate.id,
        score: candidate.score,
        rationale: (aiClaims
          ? {
              ...candidate.rationale,
              ai_enrichment: {
                agent: enrichment!.agent,
                version: enrichment!.version,
                confidence: enrichment!.confidence,
                claims: aiClaims,
              },
            }
          : candidate.rationale) as Prisma.InputJsonValue,
        contradictions: candidate.contradictions,
        rank: index + 1,
      };
    }),
  });

  const totalContradictions = rankedCandidates.reduce(
    (count, candidate) => count + candidate.contradictions.length,
    0,
  );
  const needsReview = requiresHumanReview(topCandidate.score, totalContradictions, false);
  const finalStatus = needsReview ? 'NEEDS_REVIEW' : 'APPROVED';

  await db.classificationCase.update({
    where: { id: classificationCase.id },
    data: {
      status: finalStatus,
      confidence: topCandidate.score,
      selectedCodeId: needsReview ? null : topCandidate.id,
    },
  });

  await db.auditEvent.create({
    data: {
      organizationId: event.organization_id,
      actorId: event.actor_id,
      action: 'classification.analysis.completed',
      entityType: 'ClassificationCase',
      entityId: classificationCase.id,
      before: { status: 'IN_ANALYSIS' },
      after: {
        status: finalStatus,
        confidence: topCandidate.score,
        topCandidateCode: topCandidate.code,
        candidateCount: rankedCandidates.length,
        analysisRunId,
      },
      traceId: event.trace_id,
    },
  });
}, { connection });

console.log('worker started');

function selectProductVersion(
  versions: Array<{ id: string; description: string; attributes: unknown }>,
  requestedId?: string,
) {
  if (requestedId) return versions.find((version) => version.id === requestedId);
  return versions[0];
}

async function markNeedsInformation(
  event: { organization_id: string; actor_id: string; trace_id: string },
  caseId: string,
  reason: string,
) {
  await db.classificationCase.update({
    where: { id: caseId },
    data: {
      status: 'NEEDS_INFORMATION',
      assumptions: { analysis_blocker: reason },
    },
  });

  await db.auditEvent.create({
    data: {
      organizationId: event.organization_id,
      actorId: event.actor_id,
      action: 'classification.analysis.needs_information',
      entityType: 'ClassificationCase',
      entityId: caseId,
      before: { status: 'IN_ANALYSIS' },
      after: { status: 'NEEDS_INFORMATION', reason },
      traceId: event.trace_id,
    },
  });
}
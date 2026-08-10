import { randomUUID } from 'node:crypto';
import { db, type Prisma } from '@platform/db';
import { rankTariffCandidates, requiresHumanReview } from '@platform/domain';
import { claimsForCandidate, enrichClassification } from '@platform/ai';

export type ClassificationAnalysisEvent = {
  event_id: string;
  organization_id: string;
  actor_id: string;
  trace_id: string;
  payload: { case_id: string; product_id: string; product_version_id?: string };
};

export async function runClassificationAnalysis(
  event: ClassificationAnalysisEvent,
  dependencies: { db: typeof db } = { db },
) {
  const database = dependencies.db;
  const classificationCase = await database.classificationCase.findFirst({
    where: { id: event.payload.case_id, organizationId: event.organization_id, status: 'INTAKE' },
    include: { product: { include: { versions: { orderBy: { version: 'desc' } } } } },
  });

  if (!classificationCase) return { status: 'IGNORED' as const };

  const analysisRunId = randomUUID();
  await database.classificationCase.update({ where: { id: classificationCase.id }, data: { status: 'IN_ANALYSIS' } });
  await database.auditEvent.create({
    data: {
      organizationId: event.organization_id, actorId: event.actor_id,
      action: 'classification.analysis.started', entityType: 'ClassificationCase', entityId: classificationCase.id,
      before: { status: classificationCase.status }, after: { status: 'IN_ANALYSIS', sourceEventId: event.event_id, analysisRunId },
      traceId: event.trace_id,
    },
  });

  const productVersion = selectProductVersion(classificationCase.product.versions, event.payload.product_version_id);
  if (!productVersion) {
    await markNeedsInformation(database, event, classificationCase.id, 'No product version was available for analysis.');
    return { status: 'NEEDS_INFORMATION' as const };
  }

  const now = new Date();
  const tariffCodes = await database.tariffCode.findMany({
    where: { countryCode: 'MX', validFrom: { lte: now }, OR: [{ validTo: null }, { validTo: { gt: now } }] },
    orderBy: [{ code: 'asc' }, { nico: 'asc' }], take: 250,
  });
  if (tariffCodes.length === 0) {
    await markNeedsInformation(database, event, classificationCase.id, 'No tariff codes are seeded for MX.');
    return { status: 'NEEDS_INFORMATION' as const };
  }

  const rankedCandidates = rankTariffCandidates(
    { description: productVersion.description, attributes: productVersion.attributes as Record<string, unknown> },
    tariffCodes.map((code) => ({
      id: code.id, code: code.code, nico: code.nico, description: code.description, sourceUrl: code.sourceUrl,
      legalNotes: code.legalNotes, validFrom: code.validFrom, validTo: code.validTo, sourceVersion: code.sourceVersion,
    })),
  );
  const topCandidate = rankedCandidates[0];
  if (!topCandidate) {
    await markNeedsInformation(database, event, classificationCase.id, 'No tariff candidates could be ranked.');
    return { status: 'NEEDS_INFORMATION' as const };
  }

  const enrichment = await enrichClassification({
    product: { description: productVersion.description, attributes: productVersion.attributes as Record<string, unknown> },
    candidates: rankedCandidates.map((candidate) => ({ id: candidate.id, code: candidate.code, nico: candidate.nico ?? null, description: candidate.description, score: candidate.score })),
  });
  await database.classificationCandidate.deleteMany({ where: { caseId: classificationCase.id } });
  await database.classificationCandidate.createMany({
    data: rankedCandidates.map((candidate, index) => {
      const aiClaims = claimsForCandidate(enrichment, candidate.id);
      return {
        caseId: classificationCase.id, tariffCodeId: candidate.id, score: candidate.score,
        rationale: (aiClaims ? { ...candidate.rationale, ai_enrichment: { agent: enrichment!.agent, version: enrichment!.version, confidence: enrichment!.confidence, claims: aiClaims } } : candidate.rationale) as Prisma.InputJsonValue,
        contradictions: candidate.contradictions, rank: index + 1,
      };
    }),
  });
  const totalContradictions = rankedCandidates.reduce((count, candidate) => count + candidate.contradictions.length, 0);
  const needsReview = requiresHumanReview(topCandidate.score, totalContradictions, false);
  const finalStatus = needsReview ? 'NEEDS_REVIEW' : 'APPROVED';
  await database.classificationCase.update({ where: { id: classificationCase.id }, data: { status: finalStatus, confidence: topCandidate.score, selectedCodeId: needsReview ? null : topCandidate.id } });
  await database.auditEvent.create({
    data: {
      organizationId: event.organization_id, actorId: event.actor_id, action: 'classification.analysis.completed',
      entityType: 'ClassificationCase', entityId: classificationCase.id, before: { status: 'IN_ANALYSIS' },
      after: { status: finalStatus, confidence: topCandidate.score, topCandidateCode: topCandidate.code, candidateCount: rankedCandidates.length, analysisRunId },
      traceId: event.trace_id,
    },
  });
  return { status: finalStatus as 'APPROVED' | 'NEEDS_REVIEW', candidateCount: rankedCandidates.length };
}

function selectProductVersion(versions: Array<{ id: string; description: string; attributes: unknown }>, requestedId?: string) {
  if (requestedId) return versions.find((version) => version.id === requestedId);
  return versions[0];
}

async function markNeedsInformation(database: typeof db, event: ClassificationAnalysisEvent, caseId: string, reason: string) {
  await database.classificationCase.update({ where: { id: caseId }, data: { status: 'NEEDS_INFORMATION', assumptions: { analysis_blocker: reason } } });
  await database.auditEvent.create({
    data: { organizationId: event.organization_id, actorId: event.actor_id, action: 'classification.analysis.needs_information', entityType: 'ClassificationCase', entityId: caseId, before: { status: 'IN_ANALYSIS' }, after: { status: 'NEEDS_INFORMATION', reason }, traceId: event.trace_id },
  });
}

import Link from 'next/link';
import { confidenceBand } from '@platform/domain';
import { apiFetch, ApiError } from '../../lib/api';
import { SubmitCaseButton } from './submit-case-button';
import { ReviewActions } from './review-actions';
import { CostCalculator, type CostScenario } from './cost-calculator';
import { DossierDownloadButton } from './dossier-download-button';

type Rationale = {
  summary?: string;
  matched_terms?: string[];
  deterministic_rules?: string[];
  ai_enrichment?: {
    agent: string;
    confidence: number;
    claims: Array<{ text: string }>;
  };
};

type Candidate = {
  id: string;
  score: number | string;
  rank: number;
  rationale: Rationale;
  contradictions: string[] | null;
  tariffCode: {
    code: string;
    nico: string | null;
    description: string;
    sourceVersion: string;
    sourceUrl: string | null;
    legalNotes: string | null;
    validFrom: string;
    validTo: string | null;
    regulatoryRequirements: RegulatoryRequirement[];
  };
};

type RegulatoryRequirement = {
  id: string;
  authority: string;
  requirementType: string;
  title: string;
  description: string | null;
  sourceUrl: string;
  sourceVersion: string;
  validFrom: string;
  validTo: string | null;
  mandatory: boolean;
  notes: string | null;
};

type Review = { id: string; decision: string; notes: string | null; createdAt: string };
type Jurisprudence = { ius: number; claveTesis: string; rubro: string; fuente: string | null; sourceUrl: string; relevance: string };
type AuditEvent = { id: string; action: string; entityType: string; entityId: string; traceId: string; occurredAt: string; after: unknown };

type ClassificationCaseDetail = {
  id: string;
  status: string;
  confidence: number | string | null;
  product: { id: string; name: string; sku: string | null };
  candidates: Candidate[];
  reviews: Review[];
  jurisprudence: Jurisprudence[];
  auditEvents?: AuditEvent[];
  riskAssessment?: {
    score: number;
    band: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    requiresHumanReview: boolean;
    disclaimer: string;
    factors: { code: string; label: string; points: number; explanation: string }[];
  };
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Borrador',
  INTAKE: 'En cola',
  IN_ANALYSIS: 'En analisis',
  NEEDS_INFORMATION: 'Necesita informacion',
  NEEDS_REVIEW: 'Necesita revision',
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
  SUPERSEDED: 'Reemplazado',
  ARCHIVED: 'Archivado',
};

const BAND_LABEL: Record<string, string> = {
  HIGH: 'Alta',
  MEDIUM: 'Media',
  LOW: 'Baja',
  CONFLICT: 'En conflicto',
};

const REVIEW_ROLES = new Set(['OWNER', 'ADMIN', 'REVIEWER']);

export default async function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let classificationCase: ClassificationCaseDetail;
  try {
    classificationCase = await apiFetch<ClassificationCaseDetail>(`/api/v1/classification-cases/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return (
        <main className="mx-auto max-w-2xl px-4 py-10">
          <p className="text-sm text-neutral-500">Caso no encontrado.</p>
          <Link href="/products" className="mt-4 inline-block text-sm underline">
            Volver a productos
          </Link>
        </main>
      );
    }
    throw error;
  }

  const me = await apiFetch<{ roles: string[] }>('/api/v1/me');
  const canReview = me.roles.some((role) => REVIEW_ROLES.has(role));
  const { data: costScenarios } = await apiFetch<{ data: CostScenario[] }>(
    `/api/v1/classification-cases/${classificationCase.id}/cost-scenarios`,
  );
  let auditEvents: AuditEvent[] = [];
  try {
    const auditResponse = await apiFetch<{ data: AuditEvent[] }>(`/api/v1/classification-cases/${classificationCase.id}/audit`);
    auditEvents = auditResponse.data;
  } catch {
    // A user without audit permission can still view the case and download the dossier.
  }

  const canSubmit = classificationCase.status === 'DRAFT' || classificationCase.status === 'NEEDS_INFORMATION';
  const showReviewActions = canReview && classificationCase.status === 'NEEDS_REVIEW';

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link href={`/products/${classificationCase.product.id}`} className="text-sm text-neutral-500 underline">
        {classificationCase.product.name}
      </Link>
      <h1 className="mt-2 mb-1 text-xl font-semibold">Caso de clasificacion</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Estado: <span className="font-medium">{STATUS_LABEL[classificationCase.status] ?? classificationCase.status}</span>
      </p>
      <div className="mb-8">
        <DossierDownloadButton caseId={classificationCase.id} />
      </div>

      {canSubmit ? <div className="mb-8">
        <SubmitCaseButton caseId={classificationCase.id} />
      </div> : null}

      {classificationCase.riskAssessment ? (
        <section className="mb-8 rounded border border-amber-200 bg-amber-50 p-4 text-amber-950">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Indicador operativo de riesgo</h2>
            <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold">
              {classificationCase.riskAssessment.band} · {classificationCase.riskAssessment.score}/100
            </span>
          </div>
          <p className="mt-2 text-sm">
            {classificationCase.riskAssessment.requiresHumanReview
              ? 'Requiere revisión humana antes de usar el resultado.'
              : 'Sin señales críticas según las reglas actuales.'}
          </p>
          <ul className="mt-3 flex flex-col gap-1 text-sm">
            {classificationCase.riskAssessment.factors.map((factor) => (
              <li key={factor.code}>• {factor.label}: +{factor.points} — {factor.explanation}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-amber-800">{classificationCase.riskAssessment.disclaimer}</p>
        </section>
      ) : null}

      {classificationCase.candidates.length > 0 ? (
        <>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">Candidatos</h2>
          <ul className="mb-8 flex flex-col gap-3">
            {classificationCase.candidates.map((candidate) => {
              const score = Number(candidate.score);
              const contradictions = candidate.contradictions ?? [];
              const band = confidenceBand(score, contradictions.length);
              return (
                <li key={candidate.id} className="rounded border border-neutral-200 p-4 dark:border-neutral-800">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-medium">
                      {candidate.tariffCode.code}
                      {candidate.tariffCode.nico ? `/${candidate.tariffCode.nico}` : ''}
                    </span>
                    <span className="text-sm text-neutral-500">
                      {score.toFixed(0)} pts &middot; {BAND_LABEL[band] ?? band}
                    </span>
                  </div>
                  <p className="mb-2 text-sm text-neutral-700 dark:text-neutral-300">{candidate.tariffCode.description}</p>
                  <p className="mb-2 text-xs text-neutral-500">
                    Fuente: {candidate.tariffCode.sourceVersion} · Vigencia desde {new Date(candidate.tariffCode.validFrom).toLocaleDateString('es-MX')}
                    {candidate.tariffCode.sourceUrl ? (
                      <> · <a className="underline" href={candidate.tariffCode.sourceUrl} target="_blank" rel="noreferrer">ver fuente</a></>
                    ) : null}
                  </p>
                  {candidate.tariffCode.legalNotes ? (
                    <p className="mb-2 rounded bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-100">
                      Nota legal: {candidate.tariffCode.legalNotes}
                    </p>
                  ) : null}
                  {candidate.rationale?.summary ? (
                    <p className="mb-2 text-sm text-neutral-500">{candidate.rationale.summary}</p>
                  ) : null}
                  {candidate.rationale?.ai_enrichment?.claims.length ? (
                    <div className="mb-2 rounded bg-neutral-50 p-2 text-sm dark:bg-neutral-900">
                      <p className="mb-1 text-xs uppercase tracking-wide text-neutral-500">Evaluacion IA</p>
                      <ul className="flex flex-col gap-1">
                        {candidate.rationale.ai_enrichment.claims.map((claim, index) => (
                          <li key={index}>{claim.text}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {contradictions.length > 0 ? (
                    <ul className="text-sm text-red-600">
                      {contradictions.map((contradiction, index) => (
                        <li key={index}>{contradiction}</li>
                      ))}
                    </ul>
                  ) : null}
                  {candidate.tariffCode.regulatoryRequirements.length > 0 ? (
                    <div className="mt-3 rounded bg-blue-50 p-3 text-sm text-blue-950 dark:bg-blue-950 dark:text-blue-50">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide">Requisitos regulatorios vigentes</p>
                      <ul className="flex flex-col gap-2">
                        {candidate.tariffCode.regulatoryRequirements.map((requirement) => (
                          <li key={requirement.id}>
                            <span className="font-medium">{requirement.title}</span>
                            <span className="ml-2 text-xs opacity-80">
                              {requirement.authority} · {requirement.mandatory ? 'Obligatorio' : 'Condicionado'} · {requirement.sourceVersion}
                            </span>
                            {requirement.description ? <p className="text-xs opacity-90">{requirement.description}</p> : null}
                            <a className="text-xs underline" href={requirement.sourceUrl} target="_blank" rel="noreferrer">Ver fuente</a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </>
      ) : null}

      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">Costo de importación</h2>
      <div className="mb-8">
        <CostCalculator caseId={classificationCase.id} initialScenarios={costScenarios} />
      </div>

      {classificationCase.reviews.length > 0 ? (
        <>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">Revisiones</h2>
          <ul className="mb-8 flex flex-col gap-2">
            {classificationCase.reviews.map((review) => (
              <li key={review.id} className="rounded border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800">
                <span className="font-medium">{review.decision}</span>
                {review.notes ? <span className="ml-2 text-neutral-500">{review.notes}</span> : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {classificationCase.jurisprudence.length > 0 ? (
        <>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">Jurisprudencia relacionada</h2>
          <ul className="mb-8 flex flex-col gap-2">
            {classificationCase.jurisprudence.map((precedent) => (
              <li key={precedent.ius} className="rounded border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800">
                <div className="font-medium">IUS {precedent.ius} · {precedent.claveTesis}</div>
                <p className="mt-1">{precedent.rubro}</p>
                <p className="mt-1 text-xs text-neutral-500">{precedent.relevance} · {precedent.fuente ?? 'SJF'}</p>
                <a className="text-xs underline" href={precedent.sourceUrl} target="_blank" rel="noreferrer">Ver tesis</a>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {auditEvents.length > 0 ? (
        <>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">Trazabilidad</h2>
          <ol className="mb-8 flex flex-col gap-2">
            {auditEvents.map((event) => (
              <li key={event.id} className="rounded border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800">
                <span className="font-medium">{event.action}</span>
                <span className="ml-2 text-neutral-500">{new Date(event.occurredAt).toLocaleString('es-MX')}</span>
                <p className="mt-1 text-xs text-neutral-500">Traza: {event.traceId}</p>
              </li>
            ))}
          </ol>
        </>
      ) : null}

      {showReviewActions ? (
        <>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">Revisar caso</h2>
          <ReviewActions caseId={classificationCase.id} />
        </>
      ) : null}
    </main>
  );
}

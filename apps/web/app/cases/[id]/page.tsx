import Link from 'next/link';
import { confidenceBand } from '@platform/domain';
import { apiFetch, ApiError } from '../../lib/api';
import { RequeueCaseButton, SubmitCaseButton } from './submit-case-button';
import { ReviewActions } from './review-actions';
import { CostCalculator, type CostScenario, type OfficialDutyRate } from './cost-calculator';
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
  tariffCodeId: string;
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
    generalRate: number | string | null;
    rateUnit: string | null;
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

type Intake = {
  intent?: string | null;
  originCountry?: string | null;
  departureCountry?: string | null;
  destinationCountry?: string | null;
  declaredValue?: string | null;
  currency?: string | null;
  reference?: string | null;
  material?: string | null;
  mainFunction?: string | null;
  presentation?: string | null;
  components?: string | null;
  essentialCharacter?: string | null;
  electricFeature?: string | null;
  regulatedUse?: string | null;
  availableDocuments?: string | null;
  needsCompositeGoodsReview?: boolean | null;
};

type CaseAssumptions = {
  createdFrom?: string;
  intake?: Intake;
  pendingQuestions?: string[];
  productVersionId?: string;
};

type Review = { id: string; decision: string; notes: string | null; createdAt: string };
type Jurisprudence = { ius: number; claveTesis: string; rubro: string; fuente: string | null; sourceUrl: string; relevance: string };
type AuditEvent = { id: string; action: string; entityType: string; entityId: string; traceId: string; occurredAt: string; after: unknown };
type EvidenceItem = { id: string; claimType: string; document?: { filename?: string | null } | null };
type QueueSnapshot = {
  name: string;
  isPaused: boolean;
  counts: Record<string, number>;
};

type ClassificationCaseDetail = {
  id: string;
  status: string;
  selectedCodeId: string | null;
  confidence: number | string | null;
  assumptions: CaseAssumptions | null;
  product: { id: string; name: string; sku: string | null };
  candidates: Candidate[];
  reviews: Review[];
  jurisprudence: Jurisprudence[];
  evidence?: EvidenceItem[];
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
  IN_ANALYSIS: 'En análisis',
  NEEDS_INFORMATION: 'Necesita información',
  NEEDS_REVIEW: 'Necesita revisión',
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

type WorkflowStep = {
  title: string;
  detail: string;
  state: 'done' | 'current' | 'pending';
};

type ResultBlock = {
  title: string;
  status: string;
  detail: string;
  href?: string;
};

type ReadinessCheck = {
  label: string;
  state: 'ready' | 'attention' | 'pending';
  detail: string;
};

function buildWorkflowSteps({
  status,
  canSubmit,
  canReview,
  candidates,
  reviews,
  costScenarios,
}: {
  status: string;
  canSubmit: boolean;
  canReview: boolean;
  candidates: Candidate[];
  reviews: Review[];
  costScenarios: CostScenario[];
}): WorkflowStep[] {
  const hasCandidates = candidates.length > 0;
  const hasReview = reviews.length > 0 || ['APPROVED', 'REJECTED'].includes(status);
  const terminal = ['APPROVED', 'REJECTED', 'ARCHIVED', 'SUPERSEDED'].includes(status);
  return [
    { title: 'Caso creado', detail: 'El expediente ya está ligado a la mercancía.', state: 'done' },
    {
      title: 'Enviar a análisis',
      detail: canSubmit ? 'Listo para entrar a cola de clasificación.' : 'El caso ya fue enviado o procesado.',
      state: canSubmit ? 'current' : 'done',
    },
    {
      title: 'Candidatos',
      detail: hasCandidates ? `${candidates.length} candidato(s) disponibles para revisión.` : 'Esperando resultado del análisis determinístico.',
      state: hasCandidates ? 'done' : canSubmit ? 'pending' : 'current',
    },
    {
      title: 'Revisión humana',
      detail: hasReview
        ? 'Decisión registrada en el expediente.'
        : status === 'NEEDS_REVIEW'
          ? canReview ? 'Pendiente de decisión del revisor.' : 'Pendiente de un usuario con rol revisor.'
          : 'Se habilita cuando el caso necesita decisión humana.',
      state: hasReview ? 'done' : status === 'NEEDS_REVIEW' ? 'current' : 'pending',
    },
    {
      title: 'Costo',
      detail: costScenarios.length > 0 ? `${costScenarios.length} escenario(s) calculados.` : 'Calcula costo cuando exista código seleccionado o tasa con fuente.',
      state: costScenarios.length > 0 ? 'done' : status === 'APPROVED' ? 'current' : 'pending',
    },
    {
      title: 'Expediente',
      detail: terminal ? 'Disponible para descarga como evidencia cerrada.' : 'Disponible como snapshot operativo del avance actual.',
      state: terminal ? 'current' : 'pending',
    },
  ];
}

function workflowStateClass(state: WorkflowStep['state']) {
  if (state === 'done') return 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/25 dark:text-emerald-50';
  if (state === 'current') return 'border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-900 dark:bg-blue-950/25 dark:text-blue-50';
  return 'border-neutral-200 bg-white text-neutral-700 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300';
}

function workflowStateLabel(state: WorkflowStep['state']) {
  if (state === 'done') return 'Listo';
  if (state === 'current') return 'Ahora';
  return 'Después';
}

function resolveOfficialDutyRate(classificationCase: ClassificationCaseDetail): OfficialDutyRate | null {
  if (!classificationCase.selectedCodeId) return null;
  const selectedCandidate = classificationCase.candidates.find(
    (candidate) => candidate.tariffCodeId === classificationCase.selectedCodeId,
  );
  if (!selectedCandidate || selectedCandidate.tariffCode.rateUnit !== 'PERCENT') return null;
  if (selectedCandidate.tariffCode.generalRate === null) return null;
  const ratePercent = Number(selectedCandidate.tariffCode.generalRate);
  if (!Number.isFinite(ratePercent)) return null;
  return {
    code: selectedCandidate.tariffCode.code,
    nico: selectedCandidate.tariffCode.nico,
    ratePercent,
    sourceVersion: selectedCandidate.tariffCode.sourceVersion,
    sourceUrl: selectedCandidate.tariffCode.sourceUrl,
    validFrom: selectedCandidate.tariffCode.validFrom,
    validTo: selectedCandidate.tariffCode.validTo,
  };
}

function intakeRows(intake: Intake | undefined): Array<{ label: string; value: string }> {
  if (!intake) return [];
  return [
    { label: 'Intención', value: intake.intent ?? '' },
    { label: 'Origen', value: intake.originCountry ?? '' },
    { label: 'Procedencia', value: intake.departureCountry ?? '' },
    { label: 'Destino', value: intake.destinationCountry ?? '' },
    { label: 'Presentación', value: intake.presentation ?? '' },
    { label: 'Material', value: intake.material ?? '' },
    { label: 'Función principal', value: intake.mainFunction ?? '' },
    { label: 'Electricidad/RF/iluminación', value: intake.electricFeature ?? '' },
    { label: 'Uso regulado', value: intake.regulatedUse ?? '' },
    { label: 'Documentos', value: intake.availableDocuments ?? '' },
    { label: 'Valor', value: intake.declaredValue ? `${intake.declaredValue} ${intake.currency ?? ''}`.trim() : '' },
  ].filter((row) => row.value.trim().length > 0);
}

function buildResultBlocks({
  classificationCase,
  costScenarios,
  pendingQuestions,
}: {
  classificationCase: ClassificationCaseDetail;
  costScenarios: CostScenario[];
  pendingQuestions: string[];
}): ResultBlock[] {
  const topCandidate = classificationCase.candidates[0];
  const requirements = classificationCase.candidates.flatMap((candidate) => candidate.tariffCode.regulatoryRequirements);
  const treatyPending = classificationCase.assumptions?.intake?.originCountry ? 'Origen capturado; falta evaluar tratado y prueba documental.' : 'Falta país de origen para evaluar tratado o preferencia.';
  return [
    {
      title: 'Clasificación',
      status: topCandidate ? `${topCandidate.tariffCode.code}${topCandidate.tariffCode.nico ? `/${topCandidate.tariffCode.nico}` : ''}` : 'Pendiente',
      detail: topCandidate ? `Primer candidato con ${Number(topCandidate.score).toFixed(0)} puntos.` : 'Envía el caso a análisis para generar candidatos arancelarios.',
    },
    {
      title: 'Fundamento',
      status: topCandidate ? topCandidate.tariffCode.sourceVersion : 'Pendiente',
      detail: topCandidate ? 'Fuente, vigencia, notas legales y jurisprudencia se muestran en esta misma página.' : 'Se integrará con LIGIE/TIGIE, notas y fuentes cuando haya candidato.',
    },
    {
      title: 'Regulaciones',
      status: requirements.length > 0 ? `${requirements.length} requisito(s)` : 'Sin confirmar',
      detail: requirements.length > 0 ? 'Hay requisitos ligados a los candidatos; revisar autoridad, vigencia y fuente.' : 'No se encontraron requisitos cargados para los candidatos o aún falta análisis.',
    },
    {
      title: 'Tratados y origen',
      status: classificationCase.assumptions?.intake?.originCountry ? 'Por evaluar' : 'Falta origen',
      detail: treatyPending,
    },
    {
      title: 'Costo',
      status: costScenarios.length > 0 ? `${costScenarios.length} escenario(s)` : 'Pendiente',
      detail: costScenarios.length > 0 ? 'Ya existe cálculo con supuestos económicos registrados.' : 'Calcula costo cuando tengas valor y tasa con fuente.',
    },
    {
      title: 'Documentos',
      status: pendingQuestions.length > 0 ? `${pendingQuestions.length} pendiente(s)` : 'Sin pendientes capturados',
      detail: pendingQuestions.length > 0 ? 'Completa los datos faltantes antes de usar el resultado como definitivo.' : 'El expediente no reporta pendientes de captura inicial.',
    },
  ];
}

function actionRecommendation(status: string, pendingQuestions: string[], candidates: Candidate[]) {
  if (status === 'DRAFT' || status === 'NEEDS_INFORMATION') return 'Enviar a análisis cuando la descripción base sea suficiente; completa pendientes si son críticos.';
  if (status === 'IN_ANALYSIS' || status === 'INTAKE') return 'Esperar el resultado del worker; si tarda, revisar cola y logs.';
  if (status === 'NEEDS_REVIEW') return 'Solicitar decisión de revisor antes de aprobar o rechazar el expediente.';
  if (pendingQuestions.length > 0) return 'Completar información pendiente y conservar evidencia antes de aplicar el resultado.';
  if (candidates.length > 0) return 'Revisar candidatos, fundamento, regulaciones y costo antes de congelar el expediente.';
  return 'Continuar construyendo el expediente con evidencia y revisión profesional.';
}

function buildPreShipmentChecks({
  classificationCase,
  intake,
  topCandidate,
  costScenarios,
  pendingQuestions,
}: {
  classificationCase: ClassificationCaseDetail;
  intake: Intake | undefined;
  topCandidate: Candidate | undefined;
  costScenarios: CostScenario[];
  pendingQuestions: string[];
}): ReadinessCheck[] {
  const evidence = classificationCase.evidence ?? [];
  const hasDescription = Boolean(intake?.material && intake?.mainFunction);
  const hasOrigin = Boolean(intake?.originCountry);
  const hasOriginEvidence = evidence.some((item) => item.claimType.toLowerCase().includes('origin'));
  const hasValueEvidence = evidence.some((item) => item.claimType.toLowerCase().includes('valuation'));
  const requirements = classificationCase.candidates.flatMap((candidate) => candidate.tariffCode.regulatoryRequirements);
  const mandatoryRequirements = requirements.filter((requirement) => requirement.mandatory);
  const hasReview = classificationCase.reviews.length > 0 || ['APPROVED', 'REJECTED'].includes(classificationCase.status);

  return [
    { label: 'Descripción técnica', state: hasDescription ? 'ready' : 'pending', detail: hasDescription ? 'Material y función principal capturados.' : 'Falta material y/o función principal.' },
    { label: 'Clasificación candidata', state: topCandidate ? 'ready' : 'pending', detail: topCandidate ? `${topCandidate.tariffCode.code} disponible para revisión.` : 'Envía el caso a análisis.' },
    { label: 'Evidencia del producto', state: evidence.length > 0 ? 'ready' : 'attention', detail: evidence.length > 0 ? `${evidence.length} evidencia(s) con huella registrada.` : 'Carga fichas, fotos o documentos técnicos.' },
    { label: 'Origen y preferencia', state: hasOrigin && hasOriginEvidence ? 'ready' : hasOrigin ? 'attention' : 'pending', detail: hasOrigin && hasOriginEvidence ? 'Origen y evidencia disponibles.' : hasOrigin ? 'Falta prueba de origen para aplicar tratado.' : 'Captura país y procedencia.' },
    { label: 'Regulaciones y permisos', state: 'attention', detail: mandatoryRequirements.length > 0 ? `${mandatoryRequirements.length} requisito(s) obligatorio(s) requieren confirmación documental.` : 'No hay requisitos obligatorios cargados; confirmar fuentes oficiales.' },
    { label: 'Valoración y costo integral', state: costScenarios.length > 0 && hasValueEvidence ? 'ready' : costScenarios.length > 0 ? 'attention' : 'pending', detail: costScenarios.length > 0 ? hasValueEvidence ? 'Escenario calculado con evidencia de valor.' : 'Escenario calculado; falta evidencia de valor si aplica.' : 'Calcula valor en aduana, arancel, DTA, IVA y gastos.' },
    { label: 'Información pendiente', state: pendingQuestions.length === 0 ? 'ready' : 'pending', detail: pendingQuestions.length === 0 ? 'No quedan preguntas de captura inicial.' : `${pendingQuestions.length} respuesta(s) pendiente(s).` },
    { label: 'Revisión y liberación', state: hasReview ? 'ready' : 'pending', detail: hasReview ? 'Existe una decisión registrada.' : 'Requiere revisión profesional antes de liberar.' },
  ];
}

function readinessClass(state: ReadinessCheck['state']) {
  if (state === 'ready') return 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/25 dark:text-emerald-50';
  if (state === 'attention') return 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-100';
  return 'border-neutral-200 bg-white text-neutral-700 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300';
}

function readinessLabel(state: ReadinessCheck['state']) {
  if (state === 'ready') return 'Listo';
  if (state === 'attention') return 'Confirmar';
  return 'Pendiente';
}

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
          <Link href="/dashboard" className="mt-4 inline-block text-sm underline">
            Volver al centro de trabajo
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
  const canRequeue = classificationCase.status === 'INTAKE' || classificationCase.status === 'IN_ANALYSIS';
  const showReviewActions = canReview && classificationCase.status === 'NEEDS_REVIEW';
  let queueSnapshot: QueueSnapshot | null = null;
  if (canRequeue && canReview) {
    try {
      queueSnapshot = await apiFetch<QueueSnapshot>('/api/v1/ops/classification-queue');
    } catch {
      queueSnapshot = null;
    }
  }
  const officialDutyRate = resolveOfficialDutyRate(classificationCase);
  const workflowSteps = buildWorkflowSteps({
    status: classificationCase.status,
    canSubmit,
    canReview,
    candidates: classificationCase.candidates,
    reviews: classificationCase.reviews,
    costScenarios,
  });
  const intake = classificationCase.assumptions?.intake;
  const pendingQuestions = classificationCase.assumptions?.pendingQuestions ?? [];
  const topCandidate = classificationCase.candidates[0];
  const resultBlocks = buildResultBlocks({ classificationCase, costScenarios, pendingQuestions });
  const preShipmentChecks = buildPreShipmentChecks({ classificationCase, intake, topCandidate, costScenarios, pendingQuestions });
  const readyChecks = preShipmentChecks.filter((check) => check.state === 'ready').length;
  const regulatorySources = Array.from(
    new Map(
      classificationCase.candidates
        .flatMap((candidate) => candidate.tariffCode.regulatoryRequirements)
        .map((requirement) => [requirement.authority, requirement]),
    ).values(),
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link href="/dashboard" className="text-sm text-blue-700 underline dark:text-blue-300">
            Centro de trabajo
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Resultado de clasificación</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600 dark:text-neutral-400">
            {classificationCase.product.name} · Estado: <span className="font-medium">{STATUS_LABEL[classificationCase.status] ?? classificationCase.status}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DossierDownloadButton caseId={classificationCase.id} />
          {canSubmit ? <SubmitCaseButton caseId={classificationCase.id} /> : null}
          {canRequeue ? <RequeueCaseButton caseId={classificationCase.id} /> : null}
        </div>
      </div>

      <section className="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-5 text-blue-950 dark:border-blue-900 dark:bg-blue-950/25 dark:text-blue-50">
        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide opacity-75">Resumen operativo</p>
            <h2 className="mt-2 text-xl font-semibold">{intake?.intent ?? 'Clasificación aduanera'} para {intake?.destinationCountry ?? 'destino por confirmar'}</h2>
            <p className="mt-3 text-sm leading-6 opacity-85">
              {topCandidate
                ? `Primer candidato: ${topCandidate.tariffCode.code}${topCandidate.tariffCode.nico ? `/${topCandidate.tariffCode.nico}` : ''}. Revisa fundamento, regulaciones, costo y documentos antes de usarlo.`
                : 'El caso ya conserva la captura inicial. La siguiente acción es enviarlo a análisis para generar candidatos arancelarios.'}
            </p>
            <p className="mt-4 rounded bg-white/70 p-3 text-sm font-medium text-blue-950 dark:bg-black/20 dark:text-blue-50">
              Acción recomendada: {actionRecommendation(classificationCase.status, pendingQuestions, classificationCase.candidates)}
            </p>
          </div>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            {intakeRows(intake).slice(0, 8).map((row) => (
              <div key={row.label} className="rounded bg-white/70 p-3 dark:bg-black/20">
                <dt className="text-xs uppercase tracking-wide opacity-65">{row.label}</dt>
                <dd className="mt-1 font-medium">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {resultBlocks.map((block) => (
          <article key={block.title} className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{block.title}</p>
            <h2 className="mt-2 text-lg font-semibold">{block.status}</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-400">{block.detail}</p>
          </article>
        ))}
      </section>

      {queueSnapshot ? (
        <section className="mb-8 rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-950 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-100">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Diagnóstico de cola</p>
              <h2 className="mt-1 text-lg font-semibold">{queueSnapshot.name}</h2>
              <p className="mt-1 text-sm opacity-80">
                Úsalo si el caso permanece en cola: confirma si Redis recibió el job, si el worker lo tomó o si falló.
              </p>
            </div>
            <span className="rounded bg-white/70 px-3 py-1 text-sm font-medium dark:bg-black/20">
              {queueSnapshot.isPaused ? 'Cola pausada' : 'Cola activa'}
            </span>
          </div>
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3 lg:grid-cols-6">
            {['waiting', 'active', 'completed', 'failed', 'delayed', 'paused'].map((key) => (
              <div key={key} className="rounded bg-white/70 p-3 dark:bg-black/20">
                <dt className="text-xs uppercase tracking-wide opacity-65">{key}</dt>
                <dd className="mt-1 text-lg font-semibold">{queueSnapshot.counts[key] ?? 0}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {pendingQuestions.length > 0 ? (
        <section className="mb-8 rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-950 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-100">
          <h2 className="font-semibold">Preguntas pendientes</h2>
          <p className="mt-1 text-sm opacity-80">Estas preguntas vienen del asistente de entrada y deben resolverse antes de considerar defendible el expediente.</p>
          <ul className="mt-4 grid gap-2 md:grid-cols-2">
            {pendingQuestions.map((question) => (
              <li key={question} className="rounded bg-white/70 px-3 py-2 text-sm dark:bg-black/20">{question}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mb-8 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Avance del expediente</h2>
          <span className="text-xs text-neutral-500">{workflowSteps.filter((step) => step.state === 'done').length}/{workflowSteps.length} listos</span>
        </div>
        <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {workflowSteps.map((step, index) => (
            <li key={step.title} className={`min-h-24 rounded-md border p-3 text-sm ${workflowStateClass(step.state)}`}>
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium">{index + 1}. {step.title}</p>
                <span className="shrink-0 rounded-full bg-white/70 px-2 py-0.5 text-xs font-medium text-neutral-700 dark:bg-black/20 dark:text-neutral-100">
                  {workflowStateLabel(step.state)}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 opacity-80">{step.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mb-8 rounded-lg border border-blue-200 bg-blue-50/60 p-5 dark:border-blue-900 dark:bg-blue-950/15">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">Bloque preembarque</p>
            <h2 className="mt-1 text-xl font-semibold">¿El expediente está listo para operar?</h2>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">Semáforo de captura, clasificación, evidencia, regulaciones, costo y revisión humana.</p>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-blue-900 dark:bg-black/20 dark:text-blue-100">{readyChecks}/{preShipmentChecks.length} listos</span>
        </div>
        <ul className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {preShipmentChecks.map((check) => (
            <li key={check.label} className={`rounded-md border p-3 text-sm ${readinessClass(check.state)}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{check.label}</span>
                <span className="text-xs font-semibold">{readinessLabel(check.state)}</span>
              </div>
              <p className="mt-2 text-xs leading-5 opacity-80">{check.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      {classificationCase.riskAssessment ? (
        <section className="mb-8 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-100">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Indicador operativo de riesgo</h2>
            <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-amber-950 dark:bg-black/20 dark:text-amber-100">
              {classificationCase.riskAssessment.band} · {classificationCase.riskAssessment.score}/100
            </span>
          </div>
          <p className="mt-2 text-sm">
            {classificationCase.riskAssessment.requiresHumanReview
              ? 'Requiere revisión humana antes de usar el resultado.'
              : 'Sin señales críticas según las reglas actuales.'}
          </p>
          <ul className="mt-3 grid gap-1 text-sm md:grid-cols-2">
            {classificationCase.riskAssessment.factors.map((factor) => (
              <li key={factor.code}>• {factor.label}: +{factor.points} - {factor.explanation}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs opacity-80">{classificationCase.riskAssessment.disclaimer}</p>
        </section>
      ) : null}

      <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">Clasificación y fundamento</h2>
          {classificationCase.candidates.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {classificationCase.candidates.map((candidate) => {
                const score = Number(candidate.score);
                const contradictions = candidate.contradictions ?? [];
                const band = confidenceBand(score, contradictions.length);
                return (
                  <li key={candidate.id} className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <span className="font-medium">
                        {candidate.tariffCode.code}
                        {candidate.tariffCode.nico ? `/${candidate.tariffCode.nico}` : ''}
                      </span>
                      <span className="text-sm text-neutral-500">
                        {score.toFixed(0)} pts · {BAND_LABEL[band] ?? band}
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
                        <p className="mb-1 text-xs uppercase tracking-wide text-neutral-500">Evaluación IA</p>
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
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide">Regulaciones ligadas al candidato</p>
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
          ) : (
            <div className="rounded-lg border border-dashed border-neutral-300 p-5 text-sm text-neutral-600 dark:border-neutral-700 dark:text-neutral-400">
              Aún no hay candidatos. Envía el caso a análisis para que el clasificador genere fracciones y NICO posibles.
            </div>
          )}
        </div>

        <aside className="grid content-start gap-8">
          <section>
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">Costo</h2>
            <CostCalculator
              caseId={classificationCase.id}
              initialScenarios={costScenarios}
              officialDutyRate={officialDutyRate}
            />
          </section>

          <section className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
            <h2 className="font-semibold">Tratados y origen</h2>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              {intake?.originCountry
                ? `Origen capturado: ${intake.originCountry}. Falta validar regla de origen, certificado o prueba aplicable.`
                : 'Falta capturar país de origen para evaluar T-MEC u otra preferencia.'}
            </p>
            <p className="mt-2 text-xs text-neutral-500">No se debe aplicar preferencia sin evidencia documental y fuente vigente.</p>
          </section>

          <section className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
            <h2 className="font-semibold">Documentos y expediente</h2>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              {intake?.availableDocuments || 'No hay documentos descritos desde la captura inicial. Carga evidencia desde la mercancía para robustecer el expediente.'}
            </p>
            <Link href={`/products/${classificationCase.product.id}`} className="mt-3 inline-block text-sm font-medium text-blue-700 dark:text-blue-300">
              Abrir mercancía y evidencia
            </Link>
          </section>
          <section className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
            <h2 className="font-semibold">Fuentes regulatorias</h2>
            {regulatorySources.length > 0 ? (
              <ul className="mt-3 flex flex-col gap-2 text-sm">
                {regulatorySources.map((requirement) => (
                  <li key={`${requirement.authority}-${requirement.id}`} className="rounded bg-neutral-50 p-2 dark:bg-neutral-900">
                    <span className="font-medium">{requirement.authority}</span>
                    <span className="ml-2 text-xs text-neutral-500">{requirement.sourceVersion}</span>
                    <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">{requirement.title}</p>
                    <a className="text-xs underline" href={requirement.sourceUrl} target="_blank" rel="noreferrer">Abrir fuente</a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">No hay fuentes regulatorias ligadas al candidato actual; confirmar catálogo oficial antes de liberar.</p>
            )}
          </section>
        </aside>
      </section>

      {classificationCase.reviews.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">Revisiones</h2>
          <ul className="flex flex-col gap-2">
            {classificationCase.reviews.map((review) => (
              <li key={review.id} className="rounded border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800">
                <span className="font-medium">{review.decision}</span>
                {review.notes ? <span className="ml-2 text-neutral-500">{review.notes}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {classificationCase.jurisprudence.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">Jurisprudencia relacionada</h2>
          <ul className="flex flex-col gap-2">
            {classificationCase.jurisprudence.map((precedent) => (
              <li key={precedent.ius} className="rounded border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800">
                <div className="font-medium">IUS {precedent.ius} · {precedent.claveTesis}</div>
                <p className="mt-1">{precedent.rubro}</p>
                <p className="mt-1 text-xs text-neutral-500">{precedent.relevance} · {precedent.fuente ?? 'SJF'}</p>
                <a className="text-xs underline" href={precedent.sourceUrl} target="_blank" rel="noreferrer">Ver tesis</a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {auditEvents.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">Trazabilidad</h2>
          <ol className="flex flex-col gap-2">
            {auditEvents.map((event) => (
              <li key={event.id} className="rounded border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800">
                <span className="font-medium">{event.action}</span>
                <span className="ml-2 text-neutral-500">{new Date(event.occurredAt).toLocaleString('es-MX')}</span>
                <p className="mt-1 text-xs text-neutral-500">Traza: {event.traceId}</p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section className="mt-8 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold">Preparación para piloto y auditoría</h2>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">El expediente conserva evidencia, decisiones y trazas. El piloto debe validar exactitud contra expedientes históricos reales.</p>
          </div>
          <Link href="/audits" className="text-sm font-medium text-blue-700 underline dark:text-blue-300">Abrir auditorÃ­a histÃ³rica</Link>
        </div>
        <div className="mt-4 grid gap-2 text-sm md:grid-cols-3">
          <div className="rounded bg-neutral-50 p-3 dark:bg-neutral-900"><span className="font-medium">Evidencia</span><p className="mt-1 text-xs text-neutral-500">{classificationCase.evidence?.length ?? 0} documento(s) ligado(s).</p></div>
          <div className="rounded bg-neutral-50 p-3 dark:bg-neutral-900"><span className="font-medium">Decisión</span><p className="mt-1 text-xs text-neutral-500">{classificationCase.reviews.length > 0 ? 'Hay revisión registrada.' : 'Pendiente de revisión profesional.'}</p></div>
          <div className="rounded bg-neutral-50 p-3 dark:bg-neutral-900"><span className="font-medium">Trazabilidad</span><p className="mt-1 text-xs text-neutral-500">{auditEvents.length} evento(s) consultables.</p></div>
        </div>
      </section>

      {showReviewActions ? (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">Revisar caso</h2>
          <ReviewActions caseId={classificationCase.id} />
        </section>
      ) : null}
    </main>
  );
}

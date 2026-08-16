export type RiskBand = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type RegulatoryCheck = {
  title: string;
  mandatory: boolean;
  satisfied: boolean;
  sourceUrl: string;
};

export type LegalRiskInput = {
  classificationScore: number;
  contradictions: number;
  documentaryEvidenceCount: number;
  regulatoryChecks: RegulatoryCheck[];
  hasHumanReview: boolean;
  hasOriginEvidence: boolean;
  hasValuationEvidence: boolean;
};

export type LegalRiskFactor = {
  code: string;
  label: string;
  points: number;
  explanation: string;
};

export type LegalRiskResult = {
  score: number;
  band: RiskBand;
  factors: LegalRiskFactor[];
  requiresHumanReview: boolean;
  disclaimer: string;
  rulesetVersion: string;
};

export const LEGAL_RISK_RULESET_VERSION = 'mx-tradelogic-risk-2026.1';
export const LEGAL_RISK_DISCLAIMER =
  'Indicador operativo de riesgo para priorizar revisión; no constituye asesoría ni resolución jurídica vinculante.';

export function assessLegalRisk(input: LegalRiskInput): LegalRiskResult {
  const factors: LegalRiskFactor[] = [];
  const add = (code: string, label: string, points: number, explanation: string) => {
    if (points > 0) factors.push({ code, label, points, explanation });
  };

  if (input.classificationScore < 70) add('LOW_CLASSIFICATION_CONFIDENCE', 'Confianza de clasificación baja', 30, 'El candidato determinista está por debajo de 70 puntos.');
  else if (input.classificationScore < 90) add('MEDIUM_CLASSIFICATION_CONFIDENCE', 'Confianza de clasificación intermedia', 15, 'La clasificación requiere revisión antes de usarse operativamente.');
  add('CONTRADICTIONS', 'Contradicciones del producto', Math.min(25, input.contradictions * 12), `${input.contradictions} contradicción(es) detectada(s) en los candidatos.`);
  if (input.documentaryEvidenceCount === 0) add('NO_DOCUMENTARY_EVIDENCE', 'Sin evidencia documental', 25, 'No hay documentos vinculados al caso.');
  else if (input.documentaryEvidenceCount < 2) add('LIMITED_DOCUMENTARY_EVIDENCE', 'Evidencia documental limitada', 10, 'Hay menos de dos documentos vinculados al caso.');

  const missingMandatory = input.regulatoryChecks.filter((check) => check.mandatory && !check.satisfied);
  add('MISSING_MANDATORY_REQUIREMENTS', 'Requisitos obligatorios pendientes', Math.min(35, missingMandatory.length * 18), `${missingMandatory.length} requisito(s) obligatorio(s) no están satisfechos.`);
  add('MISSING_ORIGIN_EVIDENCE', 'Sin evidencia de origen', input.hasOriginEvidence ? 0 : 12, 'No se acreditó el origen preferencial o no preferencial declarado.');
  add('MISSING_VALUATION_EVIDENCE', 'Sin evidencia de valoración', input.hasValuationEvidence ? 0 : 12, 'No se acreditó documentalmente el valor en aduana.');
  add('NO_HUMAN_REVIEW', 'Sin revisión humana', input.hasHumanReview ? 0 : 10, 'El resultado aún no cuenta con revisión humana explícita.');

  const score = Math.min(100, factors.reduce((total, factor) => total + factor.points, 0));
  const band: RiskBand = score >= 75 ? 'CRITICAL' : score >= 50 ? 'HIGH' : score >= 25 ? 'MEDIUM' : 'LOW';
  return {
    score,
    band,
    factors,
    requiresHumanReview: band !== 'LOW' || missingMandatory.length > 0 || !input.hasHumanReview,
    disclaimer: LEGAL_RISK_DISCLAIMER,
    rulesetVersion: LEGAL_RISK_RULESET_VERSION,
  };
}

export type OriginRuleType = 'CTC' | 'RVC' | 'PROCESS';

export type OriginRule = {
  id: string;
  tariffCode: string;
  agreement: 'T-MEC' | 'TLCUEM' | 'TLC México-AELC' | 'AAE México-Japón' | 'TLC México-Israel' | 'TIPAT/CPTPP' | 'OTRO';
  type: OriginRuleType;
  thresholdPercent?: number;
  requiredProcess?: string;
  sourceUrl: string;
  sourceVersion: string;
  validFrom: string;
  validTo?: string | null;
};

export type OriginInput = {
  rule: OriginRule;
  finishedGoodValue: number;
  nonOriginatingValue?: number;
  tariffShiftSatisfied?: boolean;
  processSatisfied?: boolean;
  evidenceCount: number;
};

export type OriginResult = {
  status: 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'NEEDS_REVIEW';
  qualifyingValuePercent: number | null;
  reasons: string[];
  sourceUrl: string;
  sourceVersion: string;
  disclaimer: string;
};

export function evaluateOrigin(input: OriginInput): OriginResult {
  const reasons: string[] = [];
  if (input.finishedGoodValue <= 0) throw new Error('Finished-good value must be greater than zero');
  if (input.evidenceCount === 0) reasons.push('No hay evidencia documental de origen.');
  const nonOriginatingValue = input.nonOriginatingValue ?? 0;
  if (nonOriginatingValue < 0 || nonOriginatingValue > input.finishedGoodValue) throw new Error('Non-originating value is outside the finished-good value');
  const qualifyingValuePercent = Math.round(((input.finishedGoodValue - nonOriginatingValue) / input.finishedGoodValue) * 10000) / 100;

  if (input.rule.type === 'CTC' && input.tariffShiftSatisfied !== true) reasons.push('No se acreditó el cambio de clasificación arancelaria requerido.');
  if (input.rule.type === 'RVC' && (qualifyingValuePercent < (input.rule.thresholdPercent ?? 0))) reasons.push(`El contenido regional calculado (${qualifyingValuePercent}%) está por debajo del umbral (${input.rule.thresholdPercent ?? 0}%).`);
  if (input.rule.type === 'PROCESS' && input.processSatisfied !== true) reasons.push(`No se acreditó el proceso requerido: ${input.rule.requiredProcess ?? 'no especificado'}.`);
  if (input.evidenceCount === 0) return { status: 'NEEDS_REVIEW', qualifyingValuePercent, reasons, sourceUrl: input.rule.sourceUrl, sourceVersion: input.rule.sourceVersion, disclaimer: LEGAL_RISK_DISCLAIMER };
  return { status: reasons.length > 0 ? 'NOT_ELIGIBLE' : 'ELIGIBLE', qualifyingValuePercent, reasons, sourceUrl: input.rule.sourceUrl, sourceVersion: input.rule.sourceVersion, disclaimer: LEGAL_RISK_DISCLAIMER };
}

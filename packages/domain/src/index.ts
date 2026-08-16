// Motor de costo de importacion (landed cost), deterministico y sin
// dependencias externas. La API resuelve automaticamente la tasa IGI
// porcentual vigente del catalogo oficial cuando el caso tiene codigo
// seleccionado; la funcion pura sigue recibiendo la tasa ya resuelta para
// mantener separado el calculo de la consulta de persistencia.
//
// Nota: vive en este archivo (no en un modulo separado) porque el bundler de
// Next.js (webpack) no resuelve imports relativos con extension `.js` que
// apuntan a un archivo `.ts` — a diferencia de tsc/tsx, que si lo hacen. Este
// paquete lo consume apps/web directamente, asi que un import interno
// `./landedCost.js` rompe el build de Next aunque tsc/vitest lo acepten.

export type LandedCostInput = {
  customsValue: number;
  freight: number;
  insurance: number;
  dutyRatePercent: number;
  ivaRatePercent?: number;
  otherFees?: number;
};

export type LandedCostBreakdown = {
  customsValueBase: number;
  dutyAmount: number;
  dta: number;
  ivaBase: number;
  ivaAmount: number;
  otherFees: number;
  totalLandedCost: number;
  rulesetVersion: string;
};

// DTA (Derecho de Tramite Aduanero) ad valorem general segun la Ley Federal
// de Derechos: 8 al millar del valor en aduana. No cubre los regimenes de
// cuota fija ni las exenciones (p. ej. algunos programas IMMEX) — alcance
// acotado, documentado en docs/IMPLEMENTATION_STATUS.md.
const DTA_RATE_PERCENT = 0.8;
const DEFAULT_IVA_RATE_PERCENT = 16;
export const LANDED_COST_RULESET_VERSION = 'mx-2026.1';

export function calculateLandedCost(input: LandedCostInput): LandedCostBreakdown {
  if (input.customsValue < 0 || input.freight < 0 || input.insurance < 0 || input.dutyRatePercent < 0) {
    throw new Error('Landed cost inputs must be non-negative');
  }

  const customsValueBase = round2(input.customsValue + input.freight + input.insurance);
  const dutyAmount = round2(customsValueBase * (input.dutyRatePercent / 100));
  const dta = round2(customsValueBase * (DTA_RATE_PERCENT / 100));
  const ivaRate = input.ivaRatePercent ?? DEFAULT_IVA_RATE_PERCENT;
  const ivaBase = round2(customsValueBase + dutyAmount + dta);
  const ivaAmount = round2(ivaBase * (ivaRate / 100));
  const otherFees = round2(input.otherFees ?? 0);
  const totalLandedCost = round2(customsValueBase + dutyAmount + dta + ivaAmount + otherFees);

  return {
    customsValueBase,
    dutyAmount,
    dta,
    ivaBase,
    ivaAmount,
    otherFees,
    totalLandedCost,
    rulesetVersion: LANDED_COST_RULESET_VERSION,
  };
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export type ConfidenceBand = 'HIGH' | 'MEDIUM' | 'LOW' | 'CONFLICT';

export type TariffCandidateInput = {
  id: string;
  code: string;
  nico?: string | null;
  description: string;
  sourceUrl?: string | null;
  legalNotes?: string | null;
  validFrom?: string | Date | null;
  validTo?: string | Date | null;
  sourceVersion: string;
};

export type ProductClassificationInput = {
  description: string;
  attributes: Record<string, unknown>;
};

export type RankedTariffCandidate = TariffCandidateInput & {
  score: number;
  matchedTerms: string[];
    rationale: {
      summary: string;
      matched_terms: string[];
      deterministic_rules: string[];
      source_version: string;
      source_url?: string;
      legal_notes?: string;
      valid_from?: string;
      valid_to?: string;
  };
  contradictions: string[];
};

const MIN_TOKEN_LENGTH = 3;
const MAX_CANDIDATES = 5;

export function confidenceBand(score: number, contradictions: number): ConfidenceBand {
  if (contradictions > 0 && score < 85) return 'CONFLICT';
  if (score >= 90) return 'HIGH';
  if (score >= 70) return 'MEDIUM';
  return 'LOW';
}

export function requiresHumanReview(score: number, contradictions: number, critical: boolean): boolean {
  return critical || contradictions > 0 || score < 90;
}

export function rankTariffCandidates(
  product: ProductClassificationInput,
  tariffCodes: TariffCandidateInput[],
): RankedTariffCandidate[] {
  const productTerms = tokenize(`${product.description} ${JSON.stringify(product.attributes)}`);
  const productTermSet = new Set(productTerms);

  return tariffCodes
    .map((candidate) => scoreCandidate(candidate, productTermSet))
    .sort((a, b) => b.score - a.score || a.code.localeCompare(b.code))
    .slice(0, MAX_CANDIDATES);
}

function scoreCandidate(candidate: TariffCandidateInput, productTermSet: Set<string>): RankedTariffCandidate {
  const candidateTerms = tokenize(`${candidate.code} ${candidate.nico ?? ''} ${candidate.description}`);
  const matchedTerms = Array.from(new Set(candidateTerms.filter((term) => productTermSet.has(term))));
  const codeFamilyBoost = scoreCodeFamilyBoost(candidate, productTermSet);
  const overlapScore = Math.min(35, matchedTerms.length * 7);
  const score = clamp(55 + overlapScore + codeFamilyBoost, 0, 96);
  const contradictions = inferContradictions(candidate, productTermSet);

  return {
    ...candidate,
    score,
    matchedTerms,
    contradictions,
    rationale: {
      summary: `Candidato ${candidate.code}${candidate.nico ? `/${candidate.nico}` : ''} rankeado por coincidencia deterministica de descripcion y atributos.`,
      matched_terms: matchedTerms,
      deterministic_rules: [
        'Coincidencia de tokens normalizados producto-fraccion',
        'Boost por familia arancelaria cuando hay indicadores claros',
        'Penalizacion por contradicciones basicas de material/uso',
      ],
      source_version: candidate.sourceVersion,
      ...(candidate.sourceUrl ? { source_url: candidate.sourceUrl } : {}),
      ...(candidate.legalNotes ? { legal_notes: candidate.legalNotes } : {}),
      ...(candidate.validFrom ? { valid_from: new Date(candidate.validFrom).toISOString() } : {}),
      ...(candidate.validTo ? { valid_to: new Date(candidate.validTo).toISOString() } : {}),
    },
  };
}

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .map((token) => singularize(token.trim()))
    .filter((token) => token.length >= MIN_TOKEN_LENGTH);
}

// Coincidencia determinista producto-fraccion en espanol: singular vs. plural
// (p. ej. "sensor" vs. "sensores") no debe romper el match de tokens.
function singularize(token: string): string {
  if (token.length > 5 && token.endsWith('es')) return token.slice(0, -2);
  if (token.length > 4 && token.endsWith('s')) return token.slice(0, -1);
  return token;
}

function scoreCodeFamilyBoost(candidate: TariffCandidateInput, productTermSet: Set<string>): number {
  const code = candidate.code.replace(/\D/g, '');
  const hasAny = (...terms: string[]) => terms.some((term) => productTermSet.has(term));

  if (code.startsWith('85') && hasAny('electronico', 'electrico', 'circuito', 'sensor', 'modulo')) return 18;
  if (code.startsWith('73') && hasAny('acero', 'hierro', 'metalico', 'tornillo', 'tubo')) return 18;
  if (code.startsWith('39') && hasAny('plastico', 'polimero', 'pvc', 'resina')) return 18;
  if (code.startsWith('62') && hasAny('textil', 'prenda', 'algodon', 'poliester')) return 18;
  if (code.startsWith('90') && hasAny('medicion', 'instrumento', 'optico', 'calibracion')) return 18;
  return 0;
}

function inferContradictions(candidate: TariffCandidateInput, productTermSet: Set<string>): string[] {
  const description = candidate.description.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const contradictions: string[] = [];

  if (description.includes('plastico') && (productTermSet.has('acero') || productTermSet.has('hierro'))) {
    contradictions.push('La fraccion describe plastico pero el producto declara metal/acero.');
  }
  if (description.includes('textil') && productTermSet.has('circuito')) {
    contradictions.push('La fraccion describe textil pero el producto declara circuito/electronica.');
  }
  return contradictions;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export {
  tariffCatalogKey,
  parseTariffCatalogCsv,
  validateTariffCatalog,
  type NormalizedTariffCatalogRecord,
  type TariffCatalogRecord,
  type TariffCatalogValidation,
} from './tariffCatalog.js';
export {
  isRegulatoryRequirementEffective,
  validateRegulatoryRequirement,
  type RegulatoryRequirementRecord,
  type RegulatoryRequirementValidation,
} from './regulatoryRequirement.js';
export {
  regulatoryCatalogKey,
  parseRegulatoryCatalogCsv,
  validateRegulatoryCatalog,
  type NormalizedRegulatoryCatalogRecord,
  type RegulatoryCatalogRecord,
  type RegulatoryCatalogValidation,
  type RegulatoryCatalogCsvOptions,
} from './regulatoryCatalog.js';
export {
  assessLegalRisk,
  evaluateOrigin,
  LEGAL_RISK_DISCLAIMER,
  LEGAL_RISK_RULESET_VERSION,
  type LegalRiskInput,
  type LegalRiskResult,
  type OriginInput,
  type OriginResult,
  type OriginRule,
  type RiskBand,
} from './tradeCompliance.js';
export {
  buildCaseDossierLines,
  renderCaseDossierPdf,
  DOSSIER_RULESET_VERSION,
  type CaseDossierInput,
} from './caseDossier.js';
export {
  analyzeHistoricalDeclarations,
  parseHistoricalDeclarationsCsv,
  type HistoricalAuditRate,
  type HistoricalAuditResult,
  type HistoricalDeclaration,
} from './historicalAudit.js';
export { parseClassificationIntakeCsv, type ClassificationIntakeRow } from './classificationIntake.js';

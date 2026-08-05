export type ConfidenceBand = 'HIGH' | 'MEDIUM' | 'LOW' | 'CONFLICT';

export type TariffCandidateInput = {
  id: string;
  code: string;
  nico?: string | null;
  description: string;
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
    .map((token) => token.trim())
    .filter((token) => token.length >= MIN_TOKEN_LENGTH);
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
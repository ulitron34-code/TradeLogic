import Anthropic from '@anthropic-ai/sdk';
import { env } from '@platform/config';
import { AgentResult, AgentResultJsonSchema, type AgentResult as AgentResultType } from '@platform/contracts';

const MODEL = 'claude-opus-5';
const MAX_TOKENS = 16000;

export type EnrichmentCandidate = {
  id: string;
  code: string;
  nico?: string | null;
  description: string;
  score: number;
};

export type EnrichmentInput = {
  product: { description: string; attributes: Record<string, unknown> };
  candidates: EnrichmentCandidate[];
};

let cachedClient: Anthropic | undefined;
function getClient(): Anthropic {
  cachedClient ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return cachedClient;
}

type CreateMessage = (params: Anthropic.MessageCreateParamsNonStreaming) => Promise<Anthropic.Message>;

const defaultCreateMessage: CreateMessage = (params) => getClient().messages.create(params);

export type EnrichmentDependencies = {
  createMessage?: CreateMessage;
};

function buildPrompt(input: EnrichmentInput): string {
  const candidateList = input.candidates
    .map(
      (candidate) =>
        `- id=${candidate.id} code=${candidate.code}${candidate.nico ? `/${candidate.nico}` : ''} score=${candidate.score}\n  descripcion: ${candidate.description}`,
    )
    .join('\n');

  return [
    'Eres un agente de apoyo a la clasificacion arancelaria mexicana. El ranking y el score de los candidatos ya fueron calculados de forma deterministica y NO deben cambiar; tu trabajo es solo evaluarlos y explicarlos con evidencia citada.',
    '',
    `Producto a clasificar:\nDescripcion: ${input.product.description}\nAtributos: ${JSON.stringify(input.product.attributes)}`,
    '',
    `Candidatos arancelarios ya rankeados:\n${candidateList}`,
    '',
    'Responde con un AgentResult. Usa "tariff-classification-enrichment" como agent y "1.0.0" como version.',
    'Para cada claim que hagas sobre un candidato, cita su id exacto en evidence.sourceId — debe ser uno de los ids listados arriba. No inventes ids ni cites candidatos fuera de esa lista.',
  ].join('\n');
}

// Nunca lanza: cualquier fallo (sin API key, red, JSON invalido, schema
// invalido, o citas inventadas) devuelve null para que el flujo
// deterministico del worker siga exactamente igual sin esta capa.
export async function enrichClassification(
  input: EnrichmentInput,
  dependencies: EnrichmentDependencies = {},
): Promise<AgentResultType | null> {
  if (!env.ANTHROPIC_API_KEY || input.candidates.length === 0) return null;

  const createMessage = dependencies.createMessage ?? defaultCreateMessage;
  let response;
  try {
    response = await createMessage({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      output_config: {
        format: { type: 'json_schema', schema: AgentResultJsonSchema },
      },
      messages: [{ role: 'user', content: buildPrompt(input) }],
    });
  } catch (error) {
    console.error('AI classification enrichment request failed', error);
    return null;
  }

  if (response.stop_reason === 'refusal') {
    console.warn('Anthropic declined the classification enrichment request', response.stop_details);
    return null;
  }

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') return null;

  let rawResult: unknown;
  try {
    rawResult = JSON.parse(textBlock.text);
  } catch (error) {
    console.error('AI enrichment response was not valid JSON', error);
    return null;
  }

  const parsed = AgentResult.safeParse(rawResult);
  if (!parsed.success) {
    console.error('AI enrichment response failed schema validation', parsed.error.flatten());
    return null;
  }

  // T-032: rechazar cualquier cita a un candidato que no exista en el
  // conjunto ya calculado de forma deterministica.
  const validCandidateIds = new Set(input.candidates.map((candidate) => candidate.id));
  const hasInventedCitation = parsed.data.claims.some((claim) =>
    claim.evidence.some((evidence) => !validCandidateIds.has(evidence.sourceId)),
  );
  if (hasInventedCitation) {
    console.warn('Rejecting AI enrichment: cited a tariff candidate id outside the deterministic candidate set');
    return null;
  }

  return parsed.data;
}

export function claimsForCandidate(agentResult: AgentResultType | null, candidateId: string) {
  if (!agentResult) return undefined;
  const claims = agentResult.claims.filter((claim) =>
    claim.evidence.some((evidence) => evidence.sourceId === candidateId),
  );
  return claims.length > 0 ? claims : undefined;
}

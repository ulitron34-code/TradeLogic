import { describe, expect, it, vi } from 'vitest';
process.env.APP_BASE_URL ??= 'http://localhost:3000';
process.env.API_BASE_URL ??= 'http://localhost:4000';
process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_URL ??= 'redis://localhost:6379';
process.env.S3_ENDPOINT ??= 'http://localhost:9000';
process.env.S3_REGION ??= 'us-east-1';
process.env.S3_BUCKET ??= 'platform-test';
process.env.S3_ACCESS_KEY ??= 'test';
process.env.S3_SECRET_KEY ??= 'test';
process.env.JWT_ISSUER ??= 'platform-test';
process.env.JWT_AUDIENCE ??= 'platform-test';
process.env.JWT_SECRET ??= 'test-secret-at-least-32-characters-long';
process.env.ENCRYPTION_KEY ??= 'test-encryption-key';
process.env.FX_PROVIDER ??= 'banxico';
process.env.REGULATORY_POLL_CRON ??= '0 * * * 1-5';
process.env.SUPABASE_URL ??= 'https://example.supabase.co';
process.env.LOG_LEVEL ??= 'silent';

import type Anthropic from '@anthropic-ai/sdk';

const CANDIDATES = [
  { id: '00000000-0000-4000-8000-000000000001', code: '8517.62', description: 'Modulo electronico de comunicacion', score: 91 },
  { id: '00000000-0000-4000-8000-000000000002', code: '8536.90', description: 'Conector electrico generico', score: 74 },
];

const INPUT = {
  product: { description: 'Sensor de temperatura industrial con salida digital', attributes: { material: 'plastico' } },
  candidates: CANDIDATES,
};

function fakeResponse(overrides: Partial<Anthropic.Message>): Anthropic.Message {
  return {
    id: 'msg_test',
    type: 'message',
    role: 'assistant',
    model: 'claude-opus-5',
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: { input_tokens: 10, output_tokens: 10 },
    content: [],
    ...overrides,
  } as unknown as Anthropic.Message;
}

const VALID_AGENT_RESULT = {
  agent: 'tariff-classification-enrichment',
  version: '1.0.0',
  status: 'OK' as const,
  confidence: 88,
  claims: [
    {
      text: 'El candidato 8517.62 aplica porque el producto es un modulo electronico de comunicacion.',
      evidence: [{ sourceId: CANDIDATES[0]!.id, locator: { field: 'description' } }],
    },
  ],
  assumptions: [],
  contradictions: [],
  nextActions: [],
};

// `env` de @platform/config se evalua una sola vez al importar el modulo, asi
// que cada test resetea el registro de modulos antes de importar dinamicamente
// para que ANTHROPIC_API_KEY se relea del process.env de ese test.
async function importFresh() {
  vi.resetModules();
  return import('./index.js');
}

describe('enrichClassification', () => {
  it('returns null without calling the model when ANTHROPIC_API_KEY is not set', async () => {
    const originalKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      const { enrichClassification } = await importFresh();
      let called = false;
      const result = await enrichClassification(INPUT, {
        createMessage: async () => {
          called = true;
          return fakeResponse({ content: [] });
        },
      });
      expect(result).toBeNull();
      expect(called).toBe(false);
    } finally {
      if (originalKey === undefined) delete process.env.ANTHROPIC_API_KEY;
      else process.env.ANTHROPIC_API_KEY = originalKey;
    }
  });

  it('returns null and never calls the model when there are no candidates', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    const { enrichClassification } = await importFresh();
    let called = false;
    const result = await enrichClassification(
      { product: INPUT.product, candidates: [] },
      {
        createMessage: async () => {
          called = true;
          return fakeResponse({ content: [] });
        },
      },
    );
    expect(result).toBeNull();
    expect(called).toBe(false);
  });

  it('parses and returns a valid AgentResult that only cites known candidates', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    const { enrichClassification } = await importFresh();
    const result = await enrichClassification(INPUT, {
      createMessage: async () =>
        fakeResponse({ content: [{ type: 'text', text: JSON.stringify(VALID_AGENT_RESULT), citations: null }] }),
    });
    expect(result).not.toBeNull();
    expect(result?.claims).toHaveLength(1);
    expect(result?.claims[0]!.evidence[0]!.sourceId).toBe(CANDIDATES[0]!.id);
  });

  it('rejects a response that cites a candidate id outside the deterministic set (T-032)', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    const { enrichClassification } = await importFresh();
    const invented = {
      ...VALID_AGENT_RESULT,
      claims: [
        {
          text: 'Cita un candidato inventado',
          evidence: [{ sourceId: '00000000-0000-4000-8000-000000000099', locator: {} }],
        },
      ],
    };
    const result = await enrichClassification(INPUT, {
      createMessage: async () =>
        fakeResponse({ content: [{ type: 'text', text: JSON.stringify(invented), citations: null }] }),
    });
    expect(result).toBeNull();
  });

  it('rejects a response that does not match the AgentResult schema', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    const { enrichClassification } = await importFresh();
    const malformed = { agent: 'x' }; // missing required fields
    const result = await enrichClassification(INPUT, {
      createMessage: async () =>
        fakeResponse({ content: [{ type: 'text', text: JSON.stringify(malformed), citations: null }] }),
    });
    expect(result).toBeNull();
  });

  it('rejects a response that is not valid JSON', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    const { enrichClassification } = await importFresh();
    const result = await enrichClassification(INPUT, {
      createMessage: async () => fakeResponse({ content: [{ type: 'text', text: 'not json', citations: null }] }),
    });
    expect(result).toBeNull();
  });

  it('returns null when the model refuses the request', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    const { enrichClassification } = await importFresh();
    const result = await enrichClassification(INPUT, {
      createMessage: async () =>
        fakeResponse({
          stop_reason: 'refusal',
          stop_details: { type: 'refusal', category: null, explanation: null },
          content: [],
        }),
    });
    expect(result).toBeNull();
  });

  it('returns null when the request itself throws', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    const { enrichClassification } = await importFresh();
    const result = await enrichClassification(INPUT, {
      createMessage: async () => {
        throw new Error('network error');
      },
    });
    expect(result).toBeNull();
  });
});

describe('claimsForCandidate', () => {
  it('returns only claims whose evidence cites the given candidate', async () => {
    const { claimsForCandidate } = await importFresh();
    const agentResult = { ...VALID_AGENT_RESULT };
    expect(claimsForCandidate(agentResult, CANDIDATES[0]!.id)).toHaveLength(1);
    expect(claimsForCandidate(agentResult, CANDIDATES[1]!.id)).toBeUndefined();
    expect(claimsForCandidate(null, CANDIDATES[0]!.id)).toBeUndefined();
  });
});

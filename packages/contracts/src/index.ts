import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

export const AgentResultJsonSchema: Record<string, unknown> = JSON.parse(
  readFileSync(fileURLToPath(new URL('../schemas/agent-result.schema.json', import.meta.url)), 'utf-8'),
) as Record<string, unknown>;
export const EvidenceRef = z.object({ sourceId:z.string().uuid(), locator:z.record(z.unknown()), quote:z.string().max(500).optional() });
export const AgentResult = z.object({
  agent:z.string(), version:z.string(), status:z.enum(['OK','NEEDS_INPUT','NEEDS_REVIEW','FAILED']),
  confidence:z.number().min(0).max(100), claims:z.array(z.object({ text:z.string(), evidence:z.array(EvidenceRef) })),
  assumptions:z.array(z.string()), contradictions:z.array(z.string()), nextActions:z.array(z.string())
});
export type AgentResult = z.infer<typeof AgentResult>;

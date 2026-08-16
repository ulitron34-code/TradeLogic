import { db as defaultDb } from '@platform/db';

export type PrecedentMatch = { id: string; ius: number; claveTesis: string; rubro: string; sourceUrl: string; similarity: number };
function toVectorLiteral(embedding: number[]) { return `[${embedding.join(',')}]`; }

export async function findSimilarPrecedents(queryEmbedding: number[], limit = 3, db: typeof defaultDb = defaultDb, minimumSimilarity = 0.65): Promise<PrecedentMatch[]> {
  if (queryEmbedding.length === 0 || queryEmbedding.some(value => !Number.isFinite(value))) throw new Error('Query embedding must contain finite values');
  const boundedLimit = Math.max(1, Math.min(20, Math.trunc(limit)));
  const boundedSimilarity = Math.max(0, Math.min(1, minimumSimilarity));
  const vectorLiteral = toVectorLiteral(queryEmbedding);
  return db.$queryRaw<PrecedentMatch[]>`
    SELECT id, ius, "claveTesis", rubro, "sourceUrl", 1 - (embedding <=> ${vectorLiteral}::vector) AS similarity
    FROM "JurisprudenceCase"
    WHERE embedding IS NOT NULL
      AND 1 - (embedding <=> ${vectorLiteral}::vector) >= ${boundedSimilarity}
    ORDER BY embedding <=> ${vectorLiteral}::vector
    LIMIT ${boundedLimit}
  `;
}

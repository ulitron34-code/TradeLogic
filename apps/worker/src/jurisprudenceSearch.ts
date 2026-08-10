import { db as defaultDb } from '@platform/db';

export type PrecedentMatch = { id: string; ius: number; claveTesis: string; rubro: string; sourceUrl: string; similarity: number };
function toVectorLiteral(embedding: number[]) { return `[${embedding.join(',')}]`; }

export async function findSimilarPrecedents(queryEmbedding: number[], limit = 3, db: typeof defaultDb = defaultDb): Promise<PrecedentMatch[]> {
  const vectorLiteral = toVectorLiteral(queryEmbedding);
  return db.$queryRaw<PrecedentMatch[]>`
    SELECT id, ius, "claveTesis", rubro, "sourceUrl", 1 - (embedding <=> ${vectorLiteral}::vector) AS similarity
    FROM "JurisprudenceCase"
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> ${vectorLiteral}::vector
    LIMIT ${limit}
  `;
}

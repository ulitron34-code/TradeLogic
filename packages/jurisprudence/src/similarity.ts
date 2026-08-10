export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error(`Vectors must have the same length (${a.length} vs ${b.length})`);
  let dot = 0; let normA = 0; let normB = 0;
  for (let i = 0; i < a.length; i += 1) { dot += a[i]! * b[i]!; normA += a[i]! * a[i]!; normB += b[i]! * b[i]!; }
  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
export type ScoredMatch<T> = { item: T; score: number };
export function topKBySimilarity<T>(queryEmbedding: number[], candidates: Array<{ item: T; embedding: number[] }>, k: number): ScoredMatch<T>[] {
  return candidates.map(({ item, embedding }) => ({ item, score: cosineSimilarity(queryEmbedding, embedding) })).sort((a, b) => b.score - a.score).slice(0, k);
}

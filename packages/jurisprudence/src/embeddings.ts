import { env } from '@platform/config';

export const EMBEDDING_MODEL = 'text-embedding-3-small';
export const EMBEDDING_DIMENSIONS = 1536;
export type FetchEmbedding = (input: string, apiKey: string) => Promise<number[]>;
const defaultFetchEmbedding: FetchEmbedding = async (input, apiKey) => {
  const response = await fetch('https://api.openai.com/v1/embeddings', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model: EMBEDDING_MODEL, input }) });
  if (!response.ok) throw new Error(`OpenAI embeddings request failed with status ${response.status}`);
  const json = (await response.json()) as { data?: Array<{ embedding: number[] }> };
  const embedding = json.data?.[0]?.embedding;
  if (!embedding) throw new Error('OpenAI embeddings response had no embedding vector');
  return embedding;
};
export async function generateEmbedding(text: string, dependencies: { fetchEmbedding?: FetchEmbedding } = {}): Promise<number[] | null> {
  if (!env.OPENAI_API_KEY || !text.trim()) return null;
  try { return await (dependencies.fetchEmbedding ?? defaultFetchEmbedding)(text, env.OPENAI_API_KEY); } catch (error) { console.error('OpenAI embedding request failed', error); return null; }
}

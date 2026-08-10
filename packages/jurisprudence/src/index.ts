export { buildSearchUrl, buildTesisDetailUrl, defaultFetchJson, fetchTesisDetail, searchTesis, type FetchJson, type TesisDetail, type TesisSummary } from './scjnClient.js';
export { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL, generateEmbedding, type FetchEmbedding } from './embeddings.js';
export { cosineSimilarity, topKBySimilarity, type ScoredMatch } from './similarity.js';
export { extractTariffFractionMentions } from '@platform/regulatory';

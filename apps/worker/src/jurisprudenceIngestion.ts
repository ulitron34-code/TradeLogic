import { db as defaultDb } from '@platform/db';
import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL, extractTariffFractionMentions, fetchTesisDetail as defaultFetchTesisDetail, generateEmbedding as defaultGenerateEmbedding, searchTesis as defaultSearchTesis } from '@platform/jurisprudence';

export const SEED_QUERIES = ['clasificacion arancelaria', 'fraccion arancelaria', 'Ley Aduanera clasificacion de mercancias', 'Tarifa de la Ley de los Impuestos Generales de Importacion y Exportacion', 'reconocimiento aduanero clasificacion', 'Reglas Generales para la Aplicacion de la TIGIE', 'PROSEC clasificacion arancelaria', 'reclasificacion arancelaria mercancia'];
export type JurisprudenceIngestionDependencies = { db?: typeof defaultDb; searchTesis?: typeof defaultSearchTesis; fetchTesisDetail?: typeof defaultFetchTesisDetail; generateEmbedding?: typeof defaultGenerateEmbedding };
function toVectorLiteral(embedding: number[]) { return `[${embedding.join(',')}]`; }
function normalizeSourceUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function runJurisprudenceIngestion(queries: string[] = SEED_QUERIES, dependencies: JurisprudenceIngestionDependencies = {}) {
  const db = dependencies.db ?? defaultDb;
  const searchTesis = dependencies.searchTesis ?? defaultSearchTesis;
  const fetchTesisDetail = dependencies.fetchTesisDetail ?? defaultFetchTesisDetail;
  const generateEmbedding = dependencies.generateEmbedding ?? defaultGenerateEmbedding;
  let found = 0; let ingested = 0; let embedded = 0;
  for (const query of queries) {
    const { results } = await searchTesis(query, { page: 0, size: 20 });
    found += results.length;
    const uniqueResults = new Map(results.map(summary => [summary.ius, summary]));
    for (const summary of uniqueResults.values()) {
      if (await db.jurisprudenceCase.findUnique({ where: { ius: summary.ius } })) continue;
      const detail = await fetchTesisDetail(summary.ius);
      const sourceUrl = normalizeSourceUrl(detail.sourceUrl);
      if (!sourceUrl || !detail.texto.trim() || !detail.rubro.trim()) continue;
      const tariffFractionRefs = extractTariffFractionMentions(`${detail.rubro} ${detail.texto}`);
      const created = await db.jurisprudenceCase.create({ data: { ius: detail.ius, claveTesis: detail.claveTesis, tipoTesis: detail.tipoTesis, rubro: detail.rubro, texto: detail.texto, sala: detail.sala, fuente: detail.fuente, localizacion: detail.localizacion, fechaPublicacion: detail.fechaPublicacion ? new Date(detail.fechaPublicacion) : null, tariffFractionRefs, sourceUrl } });
      ingested += 1;
      const embedding = await generateEmbedding(`${detail.rubro}\n\n${detail.texto}`);
      if (embedding?.length === EMBEDDING_DIMENSIONS) { await db.$executeRaw`UPDATE "JurisprudenceCase" SET embedding = ${toVectorLiteral(embedding)}::vector, "embeddingModel" = ${EMBEDDING_MODEL} WHERE id = ${created.id}::uuid`; embedded += 1; }
    }
  }
  return { queriesRun: queries.length, found, ingested, embedded };
}

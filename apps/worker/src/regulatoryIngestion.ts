import { createHash } from 'node:crypto';
import { db as defaultDb } from '@platform/db';
import { putRawObject as defaultPutRawObject } from '@platform/storage';
import {
  extractTariffFractionMentions,
  fetchDailyEditions as defaultFetchDailyEditions,
  fetchNoteDetail as defaultFetchNoteDetail,
  type DofNoteListing,
} from '@platform/regulatory';

// Autoridades relevantes para inteligencia aduanera y restricciones no
// arancelarias. El DOF publica encabezados con nombres variables, por eso
// se normalizan y se buscan por fragmentos estables.
const RELEVANT_SECRETARIAS: Array<{ match: string; authority: 'SHCP' | 'SE' | 'ANAM' | 'COFEPRIS' | 'SENASICA' | 'SEMARNAT' }> = [
  { match: 'HACIENDA', authority: 'SHCP' },
  { match: 'ECONOMIA', authority: 'SE' },
  { match: 'AGENCIA NACIONAL DE ADUANAS', authority: 'ANAM' },
  { match: 'ANAM', authority: 'ANAM' },
  { match: 'COFEPRIS', authority: 'COFEPRIS' },
  { match: 'SALUD', authority: 'COFEPRIS' },
  { match: 'SENASICA', authority: 'SENASICA' },
  { match: 'AGRICULTURA', authority: 'SENASICA' },
  { match: 'SEMARNAT', authority: 'SEMARNAT' },
  { match: 'MEDIO AMBIENTE', authority: 'SEMARNAT' },
];

function authorityFor(secretaria: string): 'SHCP' | 'SE' | 'ANAM' | 'COFEPRIS' | 'SENASICA' | 'SEMARNAT' | null {
  const normalizedSecretaria = secretaria.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  return RELEVANT_SECRETARIAS.find((entry) => normalizedSecretaria.includes(entry.match))?.authority ?? null;
}

function parseFecha(fecha: string): Date | undefined {
  const [day, month, year] = fecha.split('/').map(Number);
  if (!day || !month || !year) return undefined;
  return new Date(Date.UTC(year, month - 1, day));
}

export type RegulatoryIngestionDependencies = {
  db?: typeof defaultDb;
  fetchDailyEditions?: typeof defaultFetchDailyEditions;
  fetchNoteDetail?: typeof defaultFetchNoteDetail;
  putRawObject?: typeof defaultPutRawObject;
};

export async function runRegulatoryIngestion(
  date: { year: number; month: number; day: number },
  dependencies: RegulatoryIngestionDependencies = {},
) {
  const db = dependencies.db ?? defaultDb;
  const fetchDailyEditions = dependencies.fetchDailyEditions ?? defaultFetchDailyEditions;
  const fetchNoteDetail = dependencies.fetchNoteDetail ?? defaultFetchNoteDetail;
  const putRawObject = dependencies.putRawObject ?? defaultPutRawObject;

  const listings = await fetchDailyEditions(date);
  const relevant = listings
    .map((listing) => ({ listing, authority: authorityFor(listing.secretaria) }))
    .filter((entry): entry is { listing: DofNoteListing; authority: 'SHCP' | 'SE' | 'ANAM' | 'COFEPRIS' | 'SENASICA' | 'SEMARNAT' } => entry.authority !== null);

  let ingested = 0;

  for (const { listing, authority } of relevant) {
    const { detail, rawHtml, url } = await fetchNoteDetail(listing.codigo, listing.fecha);
    const sha256 = createHash('sha256').update(rawHtml).digest('hex');

    // Dedupe por el @@unique([authority, canonicalUrl, sha256]) que ya
    // existe en el schema: mismo contenido -> no reprocesar. Si el DOF
    // corrige la nota, el sha256 cambia y se ingiere como fuente nueva.
    const existing = await db.regulatorySource.findUnique({
      where: { authority_canonicalUrl_sha256: { authority, canonicalUrl: url, sha256 } },
    });
    if (existing) continue;

    const rawStorageKey = `regulatory/dof/${date.year}/${String(date.month).padStart(2, '0')}/${String(date.day).padStart(2, '0')}/${listing.codigo}.html`;
    await putRawObject({ storageKey: rawStorageKey, body: rawHtml, contentType: 'text/html; charset=utf-8' });

    const publishedAt = parseFecha(listing.fecha);
    const source = await db.regulatorySource.create({
      data: {
        authority,
        title: detail.titulo || listing.titulo,
        canonicalUrl: url,
        externalId: listing.codigo,
        fetchedAt: new Date(),
        ...(publishedAt ? { publishedAt } : {}),
        sha256,
        rawStorageKey,
        // Version del formato de ingesta, no la edicion del DOF (MAT/VES) —
        // index_111.php no distingue edicion en la URL que usamos.
        version: '1',
      },
    });

    const mentions = extractTariffFractionMentions(detail.cuerpo);
    const provision = await db.regulatoryProvision.create({
      data: {
        sourceId: source.id,
        heading: listing.titulo,
        body: detail.cuerpo,
        normalizedRefs: { tariffFractions: mentions },
      },
    });

    ingested += 1;

    if (mentions.length > 0) {
      await createImpactsForProvision(db, provision.id, mentions, source);
    }
  }

  return { editionsFound: listings.length, relevantNotes: relevant.length, ingested };
}

async function createImpactsForProvision(
  db: typeof defaultDb,
  provisionId: string,
  mentions: string[],
  source: { title: string; canonicalUrl: string },
) {
  const tariffCodes = await db.tariffCode.findMany({
    where: { countryCode: 'MX', validTo: null },
    take: 250,
  });

  const matchedCodes = tariffCodes.filter((code) =>
    mentions.some((mention) => code.code === mention || code.code.startsWith(`${mention}.`)),
  );
  if (matchedCodes.length === 0) return;

  const matchedCases = await db.classificationCase.findMany({
    where: { selectedCodeId: { in: matchedCodes.map((code) => code.id) } },
    select: { id: true, organizationId: true, selectedCodeId: true },
  });

  const seen = new Set<string>();
  for (const classificationCase of matchedCases) {
    const key = `${classificationCase.organizationId}:${classificationCase.selectedCodeId}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const tariffCode = matchedCodes.find((code) => code.id === classificationCase.selectedCodeId);
    if (!tariffCode) continue;

    const impact = await db.regulatoryImpact.create({
      data: {
        provisionId,
        organizationId: classificationCase.organizationId,
        objectType: 'ClassificationCase',
        objectId: classificationCase.id,
        severity: 'WARNING',
        explanation: {
          tariffCode: tariffCode.code,
          reason: `El caso usa la fraccion ${tariffCode.code}, mencionada en una publicacion reciente del DOF.`,
        },
        requiresHumanReview: true,
      },
    });

    await db.alert.create({
      data: {
        organizationId: classificationCase.organizationId,
        severity: 'WARNING',
        title: `Posible cambio normativo sobre ${tariffCode.code}`,
        summary: source.title,
        impact: { impactId: impact.id, tariffCode: tariffCode.code, caseId: classificationCase.id },
        sourceRefs: { canonicalUrl: source.canonicalUrl },
      },
    });
  }
}

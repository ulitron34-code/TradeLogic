import { decodeHtmlEntities, htmlToPlainText, normalizeWhitespace } from './html.js';

const DOF_BASE_URL = 'https://dof.gob.mx';

export type DofNoteListing = {
  codigo: string;
  fecha: string; // DD/MM/YYYY, tal como lo publica el DOF
  secretaria: string;
  titulo: string;
};

export type DofNoteDetail = {
  titulo: string;
  cuerpo: string;
};

export type FetchHtml = (url: string) => Promise<string>;

export const defaultFetchHtml: FetchHtml = async (url) => {
  const response = await fetch(url, { headers: { 'User-Agent': 'TradeLogic-regulatory-ingestion/1.0' } });
  if (!response.ok) {
    throw new Error(`DOF request failed with status ${response.status}: ${url}`);
  }
  return response.text();
};

export function buildDailyEditionUrl(date: { year: number; month: number; day: number }): string {
  const month = String(date.month).padStart(2, '0');
  const day = String(date.day).padStart(2, '0');
  return `${DOF_BASE_URL}/index_111.php?year=${date.year}&month=${month}&day=${day}`;
}

export function buildNoteDetailUrl(codigo: string, fecha: string): string {
  return `${DOF_BASE_URL}/nota_detalle.php?codigo=${encodeURIComponent(codigo)}&fecha=${encodeURIComponent(fecha)}`;
}

// El DOF marca cada seccion de secretaria con class="subtitle_azul" y cada
// nota con un <a href="/nota_detalle.php?codigo=...&fecha=..." class="enlaces">.
// No hay una API JSON real (WS_getDiarioFecha.php/BB_*.php del plan original
// no existen); esto es HTML legado con tablas anidadas, asi que se parsea con
// regex sobre marcadores estables en vez de un DOM parser completo.
const SECTION_MARKER = /class="subtitle_azul">(?:<!--[\s\S]*?-->)?&nbsp;([^<]+)/g;
const NOTE_LINK = /<a\s+href="\/nota_detalle\.php\?codigo=(\d+)&amp;fecha=([\d/]+)"\s+class="enlaces">([\s\S]*?)<\/a>/g;

export function parseDailyEditions(html: string): DofNoteListing[] {
  const sectionStarts: Array<{ index: number; secretaria: string }> = [];
  for (const match of html.matchAll(SECTION_MARKER)) {
    sectionStarts.push({ index: match.index, secretaria: normalizeWhitespace(decodeHtmlEntities(match[1]!)) });
  }
  if (sectionStarts.length === 0) return [];

  const listings: DofNoteListing[] = [];
  for (let i = 0; i < sectionStarts.length; i++) {
    const start = sectionStarts[i]!;
    const end = sectionStarts[i + 1]?.index ?? html.length;
    const sectionHtml = html.slice(start.index, end);

    for (const noteMatch of sectionHtml.matchAll(NOTE_LINK)) {
      const [, codigo, fecha, rawTitulo] = noteMatch;
      listings.push({
        codigo: codigo!,
        fecha: fecha!,
        secretaria: start.secretaria,
        titulo: normalizeWhitespace(decodeHtmlEntities(rawTitulo!)),
      });
    }
  }
  return listings;
}

// La respuesta de nota_detalle.php envuelve el documento real (export de
// Word con su propio DOCTYPE/HTML/head/title/body) dentro de la pagina
// exterior del sitio (que trae su propio <title>DOF - Diario Oficial de la
// Federacion</title>). Hay que pararse en el ultimo DOCTYPE anidado para no
// quedarse con el titulo/cuerpo de la pagina exterior.
const NESTED_DOCUMENT_MARKER = /<!DOCTYPE HTML PUBLIC "-\/\/W3C\/\/DTD HTML 4\.01\/\/EN"/gi;

export function parseNoteDetail(html: string): DofNoteDetail {
  const nestedMatches = Array.from(html.matchAll(NESTED_DOCUMENT_MARKER));
  const documentHtml = nestedMatches.length > 0 ? html.slice(nestedMatches[nestedMatches.length - 1]!.index) : html;

  const titleMatch = /<title>([\s\S]*?)<\/title>/i.exec(documentHtml);
  const titulo = titleMatch ? normalizeWhitespace(decodeHtmlEntities(titleMatch[1]!)) : '';

  const bodyMatch = /<body[\s\S]*?>([\s\S]*)<\/body>/i.exec(documentHtml);
  const cuerpo = htmlToPlainText(bodyMatch ? bodyMatch[1]! : documentHtml);

  return { titulo, cuerpo };
}

export async function fetchDailyEditions(
  date: { year: number; month: number; day: number },
  fetchHtml: FetchHtml = defaultFetchHtml,
): Promise<DofNoteListing[]> {
  const html = await fetchHtml(buildDailyEditionUrl(date));
  return parseDailyEditions(html);
}

export async function fetchNoteDetail(
  codigo: string,
  fecha: string,
  fetchHtml: FetchHtml = defaultFetchHtml,
): Promise<{ detail: DofNoteDetail; rawHtml: string; url: string }> {
  const url = buildNoteDetailUrl(codigo, fecha);
  const rawHtml = await fetchHtml(url);
  return { detail: parseNoteDetail(rawHtml), rawHtml, url };
}

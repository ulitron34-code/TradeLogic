import { htmlToPlainText } from '@platform/regulatory';

const SJF_BASE_URL = 'https://sjf2.scjn.gob.mx';
const SJF_TESIS_PATH = '/services/sjftesismicroservice/api/public/tesis';

export type TesisSummary = {
  id: string;
  ius: number;
  claveTesis: string;
  rubro: string;
  localizacion: string | null;
  tipoTesis: 'TA' | 'J';
  sala: string | null;
  fuente: string | null;
  fechaPublicacion: string | null;
};
export type TesisDetail = TesisSummary & { texto: string; sourceUrl: string };
export type FetchJson = (url: string, init?: { method?: string; body?: string }) => Promise<unknown>;

export const defaultFetchJson: FetchJson = async (url, init) => {
  const response = await fetch(url, {
    method: init?.method ?? 'GET',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'TradeLogic-jurisprudence-ingestion/1.0' },
    ...(init?.body ? { body: init.body } : {}),
  });
  if (!response.ok) throw new Error(`SJF request failed with status ${response.status}`);
  return response.json();
};

type RawTesis = { id: string | null; ius: number; rubro: string; localizacion: string | null; texto: string | null; ta_tj: number; claveTesis: string; fuente: string | null; sala: string | null; fechaPublicacion: string | null };
type RawSearchResponse = { documents?: RawTesis[]; total?: number };

function buildSearchBody(query: string) {
  return {
    classifiers: [
      { name: 'idEpoca', value: ['210', '200', '100', '5'], allSelected: false, visible: false, isMatrix: false },
      { name: 'numInstancia', value: ['6', '60', '7', '70', '80', '1', '2', '50'], allSelected: false, visible: false, isMatrix: false },
      { name: 'tipoDocumento', value: ['1'], allSelected: false, visible: false, isMatrix: false },
    ],
    searchTerms: [{ expression: query, fields: ['localizacionBusqueda', 'rubro', 'texto'], fieldsUser: '', fieldsText: '', operator: 0, operatorUser: 'Y', operatorText: 'Y', lsFields: [], esInicial: true, esNRD: false }],
    bFacet: true,
    ius: [],
    idApp: 'SJFAPP2020',
    filterExpression: '',
  };
}

function toSummary(doc: RawTesis): TesisSummary {
  return { id: doc.id ?? String(doc.ius), ius: doc.ius, claveTesis: doc.claveTesis, rubro: htmlToPlainText(doc.rubro ?? ''), localizacion: doc.localizacion ? htmlToPlainText(doc.localizacion) : null, tipoTesis: doc.ta_tj === 1 ? 'J' : 'TA', sala: doc.sala, fuente: doc.fuente, fechaPublicacion: doc.fechaPublicacion };
}

export function buildSearchUrl(page: number, size: number) { return `${SJF_BASE_URL}${SJF_TESIS_PATH}?page=${page}&size=${size}`; }
export function buildTesisDetailUrl(ius: number) { return `${SJF_BASE_URL}${SJF_TESIS_PATH}/${ius}`; }

export async function searchTesis(query: string, options: { page?: number; size?: number; fetchJson?: FetchJson } = {}) {
  const raw = (await (options.fetchJson ?? defaultFetchJson)(buildSearchUrl(options.page ?? 0, options.size ?? 20), { method: 'POST', body: JSON.stringify(buildSearchBody(query)) })) as RawSearchResponse;
  const documents = raw.documents ?? [];
  return { results: documents.map(toSummary), total: raw.total ?? documents.length };
}

export async function fetchTesisDetail(ius: number, fetchJson: FetchJson = defaultFetchJson): Promise<TesisDetail> {
  const sourceUrl = buildTesisDetailUrl(ius);
  const raw = (await fetchJson(sourceUrl)) as RawTesis;
  return { ...toSummary(raw), texto: htmlToPlainText(raw.texto ?? ''), sourceUrl };
}

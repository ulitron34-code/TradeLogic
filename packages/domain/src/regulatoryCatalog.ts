export type RegulatoryCatalogRecord = {
  tariffCode: string;
  authority: string;
  requirementType: string;
  title: string;
  description?: string | null;
  sourceUrl: string;
  sourceVersion: string;
  validFrom: string | Date;
  validTo?: string | Date | null;
  mandatory?: boolean;
  notes?: string | null;
};

export type NormalizedRegulatoryCatalogRecord = Omit<RegulatoryCatalogRecord, 'validFrom' | 'validTo'> & {
  tariffCode: string;
  authority: string;
  requirementType: string;
  title: string;
  validFrom: Date;
  validTo: Date | null;
  mandatory: boolean;
};

export type RegulatoryCatalogValidation = {
  records: NormalizedRegulatoryCatalogRecord[];
  errors: string[];
};
export type RegulatoryCatalogValidationOptions = { requireOfficialSource?: boolean };

export type RegulatoryCatalogCsvOptions = { sourceVersion: string; sourceUrl?: string; defaultValidFrom?: string | Date };

/** Parses the normalized export format used by official catalogs/compendia. */
export function parseRegulatoryCatalogCsv(csv: string, options: RegulatoryCatalogCsvOptions): unknown[] {
  const rows = parseCsvRows(csv);
  if (rows.length < 2) return [];
  const headers = rows[0]!.map(normalizeHeader);
  const indexOf = (...names: string[]) => names.map(normalizeHeader).map(name => headers.indexOf(name)).find(index => index >= 0) ?? -1;
  const cellAt = (row: string[], index: number) => index >= 0 ? (row[index] ?? '').trim() : '';
  const index = {
    tariffCode: indexOf('tariffcode', 'code', 'fraccion', 'fraccion arancelaria', 'fraccion_arancelaria'),
    authority: indexOf('authority', 'autoridad', 'dependencia'),
    requirementType: indexOf('requirementtype', 'tipo', 'tipo requisito', 'regulacion'),
    title: indexOf('title', 'titulo', 'requisito', 'nom'),
    description: indexOf('description', 'descripcion'),
    sourceUrl: indexOf('sourceurl', 'fuente', 'url fuente'),
    sourceVersion: indexOf('sourceversion', 'version'),
    validFrom: indexOf('validfrom', 'vigencia desde', 'vigencia_desde'),
    validTo: indexOf('validto', 'vigencia hasta', 'vigencia_hasta'),
    mandatory: indexOf('mandatory', 'obligatorio'),
    notes: indexOf('notes', 'notas', 'condiciones'),
  };
  return rows.slice(1).filter(row => row.some(cell => cell.trim())).map(row => ({
    tariffCode: cellAt(row, index.tariffCode), authority: cellAt(row, index.authority), requirementType: cellAt(row, index.requirementType), title: cellAt(row, index.title),
    description: cellAt(row, index.description) || null, sourceUrl: cellAt(row, index.sourceUrl) || options.sourceUrl || '', sourceVersion: cellAt(row, index.sourceVersion) || options.sourceVersion,
    validFrom: cellAt(row, index.validFrom) || options.defaultValidFrom || new Date().toISOString(), validTo: cellAt(row, index.validTo) || null,
    mandatory: ['false', 'no', '0'].includes(cellAt(row, index.mandatory).toLowerCase()) ? false : true, notes: cellAt(row, index.notes) || null,
  }));
}

/**
 * Validates source-backed regulatory requirements before persistence. A
 * source URL, version and effective window are mandatory so a catalog can
 * be audited and expired without silently replacing a prior rule.
 */
export function validateRegulatoryCatalog(input: unknown, options: RegulatoryCatalogValidationOptions = {}): RegulatoryCatalogValidation {
  if (!Array.isArray(input)) return { records: [], errors: ['Catalog must be an array.'] };
  const records: NormalizedRegulatoryCatalogRecord[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  input.forEach((raw, index) => {
    const result = normalizeRecord(raw, options);
    if ('error' in result) {
      errors.push(`Record ${index + 1}: ${result.error}`);
      return;
    }
    const key = regulatoryCatalogKey(result.record);
    if (seen.has(key)) {
      errors.push(`Record ${index + 1}: duplicate effective record.`);
      return;
    }
    seen.add(key);
    records.push(result.record);
  });

  const grouped = new Map<string, NormalizedRegulatoryCatalogRecord[]>();
  for (const record of records) {
    const family = [record.tariffCode, record.authority, record.requirementType, record.title].join('|');
    const list = grouped.get(family) ?? [];
    list.push(record);
    grouped.set(family, list);
  }
  for (const [family, versions] of grouped) {
    versions.sort((a, b) => a.validFrom.getTime() - b.validFrom.getTime());
    for (let i = 1; i < versions.length; i += 1) {
      const previous = versions[i - 1]!;
      const current = versions[i]!;
      if (previous.validTo === null || previous.validTo.getTime() > current.validFrom.getTime()) {
        errors.push(`Overlapping validity windows for ${family}.`);
      }
    }
  }
  return { records, errors };
}

export function regulatoryCatalogKey(record: Pick<NormalizedRegulatoryCatalogRecord, 'tariffCode' | 'authority' | 'requirementType' | 'title' | 'validFrom'>): string {
  return [record.tariffCode, record.authority, record.requirementType, record.title, record.validFrom.toISOString()].join('|');
}

function normalizeRecord(raw: unknown, options: RegulatoryCatalogValidationOptions = {}): { record: NormalizedRegulatoryCatalogRecord } | { error: string } {
  if (!raw || typeof raw !== 'object') return { error: 'record must be an object.' };
  const value = raw as Record<string, unknown>;
  const tariffCode = String(value.tariffCode ?? '').trim();
  const authority = String(value.authority ?? '').trim().toUpperCase();
  const requirementType = String(value.requirementType ?? '').trim().toUpperCase();
  const title = String(value.title ?? '').trim();
  const description = nullableString(value.description);
  const sourceUrl = String(value.sourceUrl ?? '').trim();
  const sourceVersion = String(value.sourceVersion ?? '').trim();
  const validFrom = parseDate(value.validFrom);
  const validTo = value.validTo === undefined || value.validTo === null || value.validTo === '' ? null : parseDate(value.validTo);
  const mandatory = value.mandatory === undefined ? true : value.mandatory;

  if (!/^\d{4}\.\d{2}\.\d{2}$/.test(tariffCode)) return { error: 'tariffCode must use the 0000.00.00 format.' };
  if (!authority) return { error: 'authority is required.' };
  if (!requirementType) return { error: 'requirementType is required.' };
  if (!title) return { error: 'title is required.' };
  if (!isHttpUrl(sourceUrl)) return { error: 'sourceUrl must be an http(s) URL.' };
  if (options.requireOfficialSource && !isOfficialMexicanSourceUrl(sourceUrl)) return { error: 'sourceUrl must belong to an official Mexican government domain (*.gob.mx).' };
  if (!sourceVersion) return { error: 'sourceVersion is required.' };
  if (!validFrom) return { error: 'validFrom must be a valid date.' };
  if (value.validTo !== undefined && value.validTo !== null && value.validTo !== '' && !validTo) return { error: 'validTo must be a valid date.' };
  if (validTo && validTo <= validFrom) return { error: 'validTo must be after validFrom.' };
  if (typeof mandatory !== 'boolean') return { error: 'mandatory must be boolean.' };
  return { record: { tariffCode, authority, requirementType, title, description, sourceUrl, sourceVersion, validFrom, validTo, mandatory, notes: nullableString(value.notes) } };
}

function parseDate(value: unknown): Date | null {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(String(value ?? ''));
  return Number.isNaN(date.getTime()) ? null : date;
}
function nullableString(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  const text = String(value).trim();
  return text || null;
}
function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isOfficialMexicanSourceUrl(value: string): boolean {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === 'gob.mx' || hostname.endsWith('.gob.mx');
  } catch {
    return false;
  }
}

function parseCsvRows(csv: string): string[][] {
  const text = csv.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = []; let value = ''; let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const character = text[i]!; const next = text[i + 1];
    if (character === '"' && quoted && next === '"') { value += '"'; i += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === ',' && !quoted) { row.push(value); value = ''; }
    else if ((character === '\n' || character === '\r') && !quoted) { if (character === '\r' && next === '\n') i += 1; row.push(value); rows.push(row); row = []; value = ''; }
    else value += character;
  }
  if (value.length || row.length) { row.push(value); rows.push(row); }
  return rows;
}
function normalizeHeader(value: string): string { return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim().replace(/ /g, ''); }

export type TariffCatalogRecord = {
  countryCode: string;
  code: string;
  nico?: string | null;
  description: string;
  chapter?: string | null;
  heading?: string | null;
  legalNotes?: string | null;
  sourceUrl?: string | null;
  unitOfMeasure?: string | null;
  generalRate?: number | string | null;
  rateUnit?: string | null;
  exportRate?: number | string | null;
  exportRateUnit?: string | null;
  validFrom: string | Date;
  validTo?: string | Date | null;
  sourceVersion: string;
};

export type NormalizedTariffCatalogRecord = Omit<TariffCatalogRecord, 'validFrom' | 'validTo'> & {
  countryCode: string;
  code: string;
  nico: string | null;
  validFrom: Date;
  validTo: Date | null;
};

export type TariffCatalogValidation = {
  records: NormalizedTariffCatalogRecord[];
  errors: string[];
};

export type TariffCatalogCsvOptions = {
  sourceVersion: string;
  sourceUrl?: string;
  defaultValidFrom?: string | Date;
};

const CODE_PATTERN = /^\d{4}\.\d{2}\.\d{2}$/;
const NICO_PATTERN = /^\d{2}$/;

/**
 * Normalizes and validates an externally supplied tariff catalog before it
 * can be persisted. It deliberately does not invent rates or descriptions:
 * the source version and effective dates must be supplied by the importer.
 */
export function validateTariffCatalog(input: unknown): TariffCatalogValidation {
  if (!Array.isArray(input)) return { records: [], errors: ['Catalog must be an array.'] };

  const records: NormalizedTariffCatalogRecord[] = [];
  const errors: string[] = [];
  const seen = new Map<string, number>();

  input.forEach((raw, index) => {
    const result = normalizeRecord(raw);
    if ('error' in result) {
      errors.push(`Record ${index + 1}: ${result.error}`);
      return;
    }

    const key = tariffCatalogKey(result.record);
    const previousIndex = seen.get(key);
    if (previousIndex !== undefined) {
      errors.push(`Record ${index + 1}: duplicate effective record; first seen at record ${previousIndex}.`);
      return;
    }
    seen.set(key, index + 1);
    records.push(result.record);
  });

  const grouped = new Map<string, NormalizedTariffCatalogRecord[]>();
  for (const record of records) {
    const family = `${record.countryCode}|${record.code}|${record.nico ?? ''}`;
    const list = grouped.get(family) ?? [];
    list.push(record);
    grouped.set(family, list);
  }

  for (const [family, versions] of grouped) {
    versions.sort((a, b) => a.validFrom.getTime() - b.validFrom.getTime());
    for (let i = 1; i < versions.length; i += 1) {
      const previous = versions[i - 1]!;
      const current = versions[i]!;
      if (previous.validTo === null || previous.validTo!.getTime() > current.validFrom.getTime()) {
        errors.push(`Overlapping validity windows for ${family}.`);
      }
    }
  }

  return { records, errors };
}

/** Converts a simple UTF-8 CSV export into records for validateTariffCatalog. */
export function parseTariffCatalogCsv(csv: string, options: TariffCatalogCsvOptions): unknown[] {
  const rows = parseCsvRows(csv);
  if (rows.length < 2) return [];
  const headers = rows[0]!.map(normalizeHeader);
  const indexOf = (...names: string[]) => names.map(normalizeHeader).map(name => headers.indexOf(name)).find(index => index >= 0) ?? -1;
  const codeIndex = indexOf('code', 'fraccion', 'fraccion arancelaria', 'fraccion_arancelaria');
  const descriptionIndex = indexOf('description', 'descripcion', 'descripcion de la mercancia');
  const nicoIndex = indexOf('nico');
  const validFromIndex = indexOf('validfrom', 'vigencia desde', 'vigencia_desde');
  const validToIndex = indexOf('validto', 'vigencia hasta', 'vigencia_hasta');
  const rateIndex = indexOf('generalrate', 'igi', 'arancel');
  const rateUnitIndex = indexOf('rateunit', 'unidad de tasa', 'tipo de arancel');
  const exportRateIndex = indexOf('exportrate', 'ige', 'arancel exportacion');
  const exportRateUnitIndex = indexOf('exportrateunit', 'unidad de tasa exportacion', 'tipo de arancel exportacion');
  const unitOfMeasureIndex = indexOf('unitofmeasure', 'unidad de medida', 'umt');

  return rows.slice(1).filter(row => row.some(cell => cell.trim())).map(row => {
    const rateText = cell(row, rateIndex);
    return {
      countryCode: cell(row, indexOf('countrycode', 'pais')) || 'MX',
      code: cell(row, codeIndex),
      nico: cell(row, nicoIndex) || null,
      description: cell(row, descriptionIndex),
      generalRate: rateText && /^\d+(?:[.,]\d+)?\s*%?$/.test(rateText) ? rateText.replace('%', '').trim() : null,
      rateUnit: cell(row, rateUnitIndex) || (rateText && !/^\d/.test(rateText) ? rateText : null),
      exportRate: cell(row, exportRateIndex) && /^\d+(?:[.,]\d+)?\s*%?$/.test(cell(row, exportRateIndex)) ? cell(row, exportRateIndex).replace('%', '').trim() : null,
      exportRateUnit: cell(row, exportRateUnitIndex) || (cell(row, exportRateIndex) && !/^\d/.test(cell(row, exportRateIndex)) ? cell(row, exportRateIndex) : null),
      unitOfMeasure: cell(row, unitOfMeasureIndex) || null,
      validFrom: cell(row, validFromIndex) || options.defaultValidFrom || new Date().toISOString(),
      validTo: cell(row, validToIndex) || null,
      sourceVersion: cell(row, indexOf('sourceversion', 'version')) || options.sourceVersion,
      sourceUrl: cell(row, indexOf('sourceurl', 'fuente')) || options.sourceUrl || null,
    };
  });
}

export function tariffCatalogKey(record: Pick<NormalizedTariffCatalogRecord, 'countryCode' | 'code' | 'nico' | 'validFrom'>): string {
  return [record.countryCode, record.code, record.nico ?? '', record.validFrom.toISOString()].join('|');
}

export function isTariffCodeEffective(record: Pick<NormalizedTariffCatalogRecord, 'validFrom' | 'validTo'>, at: Date = new Date()): boolean {
  const timestamp = at.getTime();
  return record.validFrom.getTime() <= timestamp && (record.validTo === null || record.validTo.getTime() > timestamp);
}

function normalizeRecord(raw: unknown):
  | { record: NormalizedTariffCatalogRecord }
  | { error: string } {
  if (!raw || typeof raw !== 'object') return { error: 'record must be an object.' };
  const value = raw as Record<string, unknown>;
  const countryCode = String(value.countryCode ?? '').trim().toUpperCase();
  const code = String(value.code ?? '').trim();
  const nicoValue = value.nico === undefined || value.nico === null || value.nico === '' ? null : String(value.nico).trim();
  const description = String(value.description ?? '').trim();
  const chapter = nullableString(value.chapter);
  const heading = nullableString(value.heading);
  const legalNotes = nullableString(value.legalNotes);
  const sourceUrl = nullableString(value.sourceUrl);
  const unitOfMeasure = nullableString(value.unitOfMeasure);
  const rateUnit = nullableString(value.rateUnit);
  const exportRateUnit = nullableString(value.exportRateUnit);
  const generalRate = parseRate(value.generalRate);
  const exportRate = parseRate(value.exportRate);
  const sourceVersion = String(value.sourceVersion ?? '').trim();
  const validFrom = parseDate(value.validFrom);
  const validTo = value.validTo === undefined || value.validTo === null || value.validTo === '' ? null : parseDate(value.validTo);

  if (!countryCode) return { error: 'countryCode is required.' };
  if (!CODE_PATTERN.test(code)) return { error: 'code must use the 0000.00.00 format.' };
  if (nicoValue !== null && !NICO_PATTERN.test(nicoValue)) return { error: 'nico must use two digits.' };
  if (!description) return { error: 'description is required.' };
  if (value.generalRate !== undefined && value.generalRate !== null && value.generalRate !== '' && generalRate === null) {
    return { error: 'generalRate must be a non-negative number.' };
  }
  if (value.exportRate !== undefined && value.exportRate !== null && value.exportRate !== '' && exportRate === null) {
    return { error: 'exportRate must be a non-negative number.' };
  }
  if (!sourceVersion) return { error: 'sourceVersion is required.' };
  if (!validFrom) return { error: 'validFrom must be a valid date.' };
  if (value.validTo !== undefined && value.validTo !== null && value.validTo !== '' && !validTo) {
    return { error: 'validTo must be a valid date.' };
  }
  if (validTo && validTo.getTime() <= validFrom.getTime()) return { error: 'validTo must be after validFrom.' };

  return {
    record: {
      countryCode,
      code,
      nico: nicoValue,
      description,
      chapter,
      heading,
      legalNotes,
      sourceUrl,
      unitOfMeasure,
      generalRate,
      rateUnit,
      exportRate,
      exportRateUnit,
      validFrom,
      validTo,
      sourceVersion,
    },
  };
}

function parseDate(value: unknown): Date | null {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(String(value ?? ''));
  return Number.isNaN(date.getTime()) ? null : date;
}

function nullableString(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function parseRate(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const rate = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
  return Number.isFinite(rate) && rate >= 0 ? rate : null;
}

function parseCsvRows(csv: string): string[][] {
  const text = csv.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let cellValue = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const character = text[i]!;
    const next = text[i + 1];
    if (character === '"' && quoted && next === '"') {
      cellValue += '"';
      i += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === ',' && !quoted) {
      row.push(cellValue);
      cellValue = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && next === '\n') i += 1;
      row.push(cellValue);
      rows.push(row);
      row = [];
      cellValue = '';
    } else {
      cellValue += character;
    }
  }
  if (cellValue.length > 0 || row.length > 0) {
    row.push(cellValue);
    rows.push(row);
  }
  return rows;
}

function normalizeHeader(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim().replace(/ /g, '');
}

function cell(row: string[], index: number): string {
  return index >= 0 ? (row[index] ?? '').trim() : '';
}

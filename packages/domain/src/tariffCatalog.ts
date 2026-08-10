export type TariffCatalogRecord = {
  countryCode: string;
  code: string;
  nico?: string | null;
  description: string;
  chapter?: string | null;
  heading?: string | null;
  legalNotes?: string | null;
  sourceUrl?: string | null;
  generalRate?: number | string | null;
  rateUnit?: string | null;
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

export function tariffCatalogKey(record: Pick<NormalizedTariffCatalogRecord, 'countryCode' | 'code' | 'nico' | 'validFrom'>): string {
  return [record.countryCode, record.code, record.nico ?? '', record.validFrom.toISOString()].join('|');
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
  const rateUnit = nullableString(value.rateUnit);
  const generalRate = parseRate(value.generalRate);
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
      generalRate,
      rateUnit,
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

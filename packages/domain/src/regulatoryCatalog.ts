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

/**
 * Validates source-backed regulatory requirements before persistence. A
 * source URL, version and effective window are mandatory so a catalog can
 * be audited and expired without silently replacing a prior rule.
 */
export function validateRegulatoryCatalog(input: unknown): RegulatoryCatalogValidation {
  if (!Array.isArray(input)) return { records: [], errors: ['Catalog must be an array.'] };
  const records: NormalizedRegulatoryCatalogRecord[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  input.forEach((raw, index) => {
    const result = normalizeRecord(raw);
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

function normalizeRecord(raw: unknown): { record: NormalizedRegulatoryCatalogRecord } | { error: string } {
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

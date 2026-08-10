export type RegulatoryRequirementRecord = {
  tariffCodeId: string;
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

export type RegulatoryRequirementValidation = {
  valid: boolean;
  errors: string[];
};

export function validateRegulatoryRequirement(record: RegulatoryRequirementRecord): RegulatoryRequirementValidation {
  const errors: string[] = [];
  if (!record.tariffCodeId) errors.push('tariffCodeId is required');
  if (!record.authority) errors.push('authority is required');
  if (!record.requirementType) errors.push('requirementType is required');
  if (!record.title.trim()) errors.push('title is required');
  if (!isHttpUrl(record.sourceUrl)) errors.push('sourceUrl must be an http(s) URL');
  if (!record.sourceVersion.trim()) errors.push('sourceVersion is required');
  const validFrom = toDate(record.validFrom);
  const validTo = record.validTo == null ? null : toDate(record.validTo);
  if (!validFrom) errors.push('validFrom must be a valid date');
  if (record.validTo != null && !validTo) errors.push('validTo must be a valid date');
  if (validFrom && validTo && validTo <= validFrom) errors.push('validTo must be after validFrom');
  return { valid: errors.length === 0, errors };
}

export function isRegulatoryRequirementEffective(record: Pick<RegulatoryRequirementRecord, 'validFrom' | 'validTo'>, at = new Date()): boolean {
  const validFrom = toDate(record.validFrom);
  const validTo = record.validTo == null ? null : toDate(record.validTo);
  return Boolean(validFrom && validFrom <= at && (!validTo || at < validTo));
}

function toDate(value: string | Date): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

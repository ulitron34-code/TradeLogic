export type HistoricalDeclaration = {
  rowNumber: number;
  entryDate: string;
  tariffCode: string;
  nico?: string | null;
  countryOfOrigin: string;
  customsValue: number;
  declaredDutyRatePercent?: number | null;
  declaredDutyAmount: number;
};

export type HistoricalAuditRate = { tariffCode: string; nico?: string | null; ratePercent: number; sourceVersion: string; sourceUrl: string };

export type HistoricalAuditResult = {
  rowNumber: number;
  tariffCode: string;
  status: 'REVIEW_REQUIRED' | 'NO_DIFFERENCE' | 'POTENTIAL_OVERPAYMENT' | 'POTENTIAL_UNDERPAYMENT';
  declaredDutyAmount: number;
  expectedDutyAmount: number | null;
  difference: number | null;
  rateSourceVersion?: string;
  rateSourceUrl?: string;
  reason: string;
};

export function parseHistoricalDeclarationsCsv(csv: string): HistoricalDeclaration[] {
  const rows = parseCsv(csv);
  if (rows.length < 2) return [];
  const headers = rows[0].map(normalizeHeader);
  const required = ['entry_date', 'tariff_code', 'country_of_origin', 'customs_value', 'declared_duty_amount'];
  for (const header of required) if (!headers.includes(header)) throw new Error(`Missing historical audit column: ${header}`);
  return rows.slice(1).filter((row) => row.some((value) => value.trim() !== '')).map((row, index) => {
    const value = (name: string) => row[headers.indexOf(name)]?.trim() ?? '';
    const customsValue = parseMoney(value('customs_value'), 'customs_value');
    const declaredDutyAmount = parseMoney(value('declared_duty_amount'), 'declared_duty_amount');
    const declaredRate = value('declared_duty_rate_percent');
    return {
      rowNumber: index + 2,
      entryDate: value('entry_date'),
      tariffCode: normalizeTariffCode(value('tariff_code')),
      ...(value('nico') ? { nico: value('nico') } : {}),
      countryOfOrigin: value('country_of_origin').toUpperCase(),
      customsValue,
      ...(declaredRate ? { declaredDutyRatePercent: parseMoney(declaredRate, 'declared_duty_rate_percent') } : {}),
      declaredDutyAmount,
    };
  });
}

export function analyzeHistoricalDeclarations(rows: HistoricalDeclaration[], rates: HistoricalAuditRate[]): HistoricalAuditResult[] {
  return rows.map((row) => {
    const rate = rates.find((candidate) => candidate.tariffCode === row.tariffCode && (candidate.nico ?? null) === (row.nico ?? null));
    if (!rate) return { rowNumber: row.rowNumber, tariffCode: row.tariffCode, status: 'REVIEW_REQUIRED', declaredDutyAmount: row.declaredDutyAmount, expectedDutyAmount: null, difference: null, reason: 'No existe una tasa vigente con fuente versionada para comparar este registro.' };
    const expectedDutyAmount = round2(row.customsValue * rate.ratePercent / 100);
    const difference = round2(row.declaredDutyAmount - expectedDutyAmount);
    const status = difference > 0.01 ? 'POTENTIAL_OVERPAYMENT' : difference < -0.01 ? 'POTENTIAL_UNDERPAYMENT' : 'NO_DIFFERENCE';
    return { rowNumber: row.rowNumber, tariffCode: row.tariffCode, status, declaredDutyAmount: row.declaredDutyAmount, expectedDutyAmount, difference, rateSourceVersion: rate.sourceVersion, rateSourceUrl: rate.sourceUrl, reason: status === 'NO_DIFFERENCE' ? 'La tasa versionada produce el mismo importe declarado.' : 'Diferencia potencial; requiere validar régimen, preferencias, base gravable y documentación antes de reclamar o corregir.' };
  });
}

function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    if (char === '"') {
      if (quoted && csv[index + 1] === '"') { cell += '"'; index += 1; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) { if (char === '\r' && csv[index + 1] === '\n') index += 1; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += char;
  }
  if (cell !== '' || row.length > 0) { row.push(cell); rows.push(row); }
  return rows;
}

function normalizeHeader(value: string): string { return value.trim().toLowerCase().replace(/\s+/g, '_'); }
function normalizeTariffCode(value: string): string { const normalized = value.replace(/\D/g, ''); if (normalized.length !== 8) throw new Error(`Invalid tariff code: ${value}`); return `${normalized.slice(0, 4)}.${normalized.slice(4, 6)}.${normalized.slice(6)}`; }
function parseMoney(value: string, field: string): number { const parsed = Number(value.replace(/[$,\s]/g, '')); if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`Invalid ${field}`); return parsed; }
function round2(value: number): number { return Math.round((value + Number.EPSILON) * 100) / 100; }

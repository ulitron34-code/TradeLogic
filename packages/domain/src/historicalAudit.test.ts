import { describe, expect, it } from 'vitest';
import { analyzeHistoricalDeclarations, parseHistoricalDeclarationsCsv } from './historicalAudit.js';

describe('historical audit', () => {
  it('parses Spanish-friendly monetary CSV values and normalizes tariff codes', () => {
    const rows = parseHistoricalDeclarationsCsv('entry_date,tariff_code,country_of_origin,customs_value,declared_duty_amount\n2026-01-15,85011001,US,"1,000.00",100');
    expect(rows[0]).toMatchObject({ tariffCode: '8501.10.01', countryOfOrigin: 'US', customsValue: 1000, declaredDutyAmount: 100 });
  });

  it('reports potential overpayment only against a sourced versioned rate', () => {
    const rows = parseHistoricalDeclarationsCsv('entry_date,tariff_code,country_of_origin,customs_value,declared_duty_amount\n2026-01-15,85011001,US,1000,100');
    const results = analyzeHistoricalDeclarations(rows, [{ tariffCode: '8501.10.01', ratePercent: 5, sourceVersion: 'LIGIE-2026.1', sourceUrl: 'https://example.test/ligie' }]);
    expect(results[0]).toMatchObject({ status: 'POTENTIAL_OVERPAYMENT', expectedDutyAmount: 50, difference: 50, rateSourceVersion: 'LIGIE-2026.1' });
  });

  it('requires review when no authoritative rate is available', () => {
    const rows = parseHistoricalDeclarationsCsv('entry_date,tariff_code,country_of_origin,customs_value,declared_duty_amount\n2026-01-15,99999999,MX,1000,0');
    expect(analyzeHistoricalDeclarations(rows, [])[0].status).toBe('REVIEW_REQUIRED');
  });
});

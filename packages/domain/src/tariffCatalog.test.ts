import { describe, expect, it } from 'vitest';
import { tariffCatalogKey, validateTariffCatalog } from './tariffCatalog.js';

const base = {
  countryCode: 'mx',
  code: '3926.90.99',
  nico: '99',
  description: 'Manufacturas de plastico.',
  validFrom: '2026-01-01T00:00:00.000Z',
  sourceVersion: 'LIGIE-MX-2026',
};

describe('validateTariffCatalog', () => {
  it('normalizes a valid record without inventing regulatory data', () => {
    const result = validateTariffCatalog([base]);
    expect(result.errors).toEqual([]);
    expect(result.records[0]).toMatchObject({ countryCode: 'MX', code: base.code, nico: '99', sourceVersion: base.sourceVersion });
    expect(tariffCatalogKey(result.records[0]!)).toContain('MX|3926.90.99|99|2026-01-01');
  });

  it('rejects malformed codes, missing source versions and invalid dates', () => {
    const result = validateTariffCatalog([{ ...base, code: '3926', sourceVersion: '', validFrom: 'not-a-date' }]);
    expect(result.records).toHaveLength(0);
    expect(result.errors.join(' ')).toContain('code must use');
  });

  it('rejects overlapping validity windows for the same code and NICO', () => {
    const result = validateTariffCatalog([
      { ...base, validTo: '2026-06-01T00:00:00.000Z' },
      { ...base, validFrom: '2026-05-01T00:00:00.000Z', sourceVersion: 'LIGIE-MX-2026-REV1' },
    ]);
    expect(result.errors).toContain('Overlapping validity windows for MX|3926.90.99|99.');
  });
});

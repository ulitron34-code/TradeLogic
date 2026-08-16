import { describe, expect, it } from 'vitest';
import { regulatoryCatalogKey, validateRegulatoryCatalog } from './regulatoryCatalog.js';

const base = {
  tariffCode: '3926.90.99', authority: 'COFEPRIS', requirementType: 'PERMIT', title: 'Aviso sanitario',
  sourceUrl: 'https://www.gob.mx/cofepris', sourceVersion: 'COFEPRIS-2026.1', validFrom: '2026-01-01',
};

describe('regulatory catalog validation', () => {
  it('requires an official-looking source URL and preserves evidence metadata', () => {
    const result = validateRegulatoryCatalog([base]);
    expect(result.errors).toEqual([]);
    expect(result.records[0]).toMatchObject({ authority: 'COFEPRIS', mandatory: true, sourceVersion: 'COFEPRIS-2026.1' });
    expect(regulatoryCatalogKey(result.records[0]!)).toContain('3926.90.99|COFEPRIS|PERMIT');
  });
  it('rejects malformed and overlapping effective versions', () => {
    const result = validateRegulatoryCatalog([
      { ...base, validTo: '2026-06-01' },
      { ...base, sourceVersion: 'COFEPRIS-2026.2', validFrom: '2026-05-01' },
      { ...base, tariffCode: '3926' },
    ]);
    expect(result.errors.some(error => error.includes('Overlapping validity windows'))).toBe(true);
    expect(result.errors.some(error => error.includes('0000.00.00'))).toBe(true);
  });
  it('does not accept a non-boolean mandatory flag', () => {
    const result = validateRegulatoryCatalog([{ ...base, mandatory: 'yes' }]);
    expect(result.records).toHaveLength(0);
    expect(result.errors[0]).toContain('mandatory must be boolean');
  });
});

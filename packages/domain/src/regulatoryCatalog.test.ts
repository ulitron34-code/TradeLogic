import { describe, expect, it } from 'vitest';
import { isOfficialMexicanSourceUrl, parseRegulatoryCatalogCsv, regulatoryCatalogKey, validateRegulatoryCatalog } from './regulatoryCatalog.js';

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
  it('supports strict official-source validation for production imports', () => {
    expect(isOfficialMexicanSourceUrl('https://www.snice.gob.mx/catalogo.xlsx')).toBe(true);
    expect(isOfficialMexicanSourceUrl('https://example.test/catalogo.csv')).toBe(false);
    expect(validateRegulatoryCatalog([{ ...base, sourceUrl: 'https://example.test/catalogo.csv' }], { requireOfficialSource: true }).errors[0]).toContain('official Mexican government domain');
  });
  it('parses official-style Spanish CSV columns without inventing source metadata', () => {
    const parsed = parseRegulatoryCatalogCsv('Fracción arancelaria,Autoridad,Tipo,Requisito,Fuente,Versión,Vigencia desde,Obligatorio\n3926.90.99,COFEPRIS,PERMIT,Aviso sanitario,https://www.gob.mx/cofepris,2026.1,2026-01-01,Si', { sourceVersion: 'fallback', sourceUrl: 'https://example.test' });
    expect(validateRegulatoryCatalog(parsed).errors).toEqual([]);
    expect(parsed[0]).toMatchObject({ tariffCode: '3926.90.99', authority: 'COFEPRIS', sourceVersion: '2026.1', mandatory: true });
  });
});

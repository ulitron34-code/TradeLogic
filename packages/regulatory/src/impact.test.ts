import { describe, expect, it } from 'vitest';
import { extractTariffFractionMentions } from './impact.js';

describe('extractTariffFractionMentions', () => {
  it('finds a 6-digit tariff fraction (xxxx.xx)', () => {
    expect(extractTariffFractionMentions('la fracción arancelaria 8517.62 aplica en este caso')).toEqual([
      '8517.62',
    ]);
  });

  it('finds an 8-digit tariff fraction with NICO (xxxx.xx.xx)', () => {
    expect(extractTariffFractionMentions('bajo la fracción 8517.62.01 y sus variantes')).toEqual(['8517.62.01']);
  });

  it('dedupes repeated mentions', () => {
    expect(extractTariffFractionMentions('8517.62 ... nuevamente 8517.62 en el anexo')).toEqual(['8517.62']);
  });

  it('finds multiple distinct fractions in one text', () => {
    const mentions = extractTariffFractionMentions('afecta a las fracciones 8517.62 y 7318.15.00');
    expect(mentions).toEqual(expect.arrayContaining(['8517.62', '7318.15.00']));
    expect(mentions).toHaveLength(2);
  });

  it('returns an empty array when there is no tariff-shaped number', () => {
    expect(extractTariffFractionMentions('este acuerdo no menciona ninguna fraccion arancelaria')).toEqual([]);
  });

  it('does not match dates or other decimal-looking numbers with the wrong shape', () => {
    expect(extractTariffFractionMentions('el acuerdo entra en vigor el 07/08/2026, periodo 2026.1')).toEqual([]);
  });
});

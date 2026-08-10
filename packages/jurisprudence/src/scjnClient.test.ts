import { describe, expect, it } from 'vitest';
import { buildSearchUrl, fetchTesisDetail, searchTesis } from './scjnClient.js';

const raw = { documents: [{ id: null, ius: 2031741, rubro: '<p>CLASIFICACIÓN ARANCELARIA.</p>', localizacion: '<p>11a. Época</p>', texto: '<p>Fracción arancelaria 8525.80.04.</p>', ta_tj: 0, claveTesis: 'X.1o.A.1 A', fuente: 'Gaceta SJF', sala: 'Tribunal', fechaPublicacion: '2026-02-06T10:08:00Z' }], total: 1 };

describe('SCJN client', () => {
  it('normalizes search and detail responses', async () => {
    const result = await searchTesis('clasificacion arancelaria', { fetchJson: async (url, init) => { expect(url).toBe(buildSearchUrl(0, 20)); expect(init?.method).toBe('POST'); return raw; } });
    expect(result.results[0]?.id).toBe('2031741');
    const detail = await fetchTesisDetail(2031741, async () => raw.documents[0]);
    expect(detail.texto).not.toContain('<p>');
    expect(detail.sourceUrl).toContain('/2031741');
  });
});

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildDailyEditionUrl, buildNoteDetailUrl, fetchDailyEditions, fetchNoteDetail, parseDailyEditions, parseNoteDetail } from './dofClient.js';

function readFixture(name: string): string {
  return readFileSync(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)), 'utf-8');
}

describe('parseDailyEditions', () => {
  // Recorte real de https://dof.gob.mx/index_111.php?year=2026&month=08&day=07,
  // capturado el 08 Ago 2026. No hay API JSON (WS_getDiarioFecha.php /
  // BB_*.php del plan original no existen en el sitio real) — es HTML legado
  // con tablas anidadas.
  const html = readFixture('index_111_sample.html');

  it('extracts every note with its secretaria, codigo, fecha and titulo', () => {
    const listings = parseDailyEditions(html);
    expect(listings).toHaveLength(5);
    expect(listings[0]).toEqual({
      codigo: '5795797',
      fecha: '07/08/2026',
      secretaria: 'SECRETARIA DE HACIENDA Y CREDITO PUBLICO',
      titulo:
        'Acuerdo por el que se modifican las Reglas de carácter general a que se refiere la Ley Federal para la Prevención e Identificación de Operaciones con Recursos de Procedencia Ilícita.',
    });
  });

  it('groups notes under the secretaria section they actually appear in', () => {
    const listings = parseDailyEditions(html);
    const bySecretaria = new Map<string, number>();
    for (const listing of listings) {
      bySecretaria.set(listing.secretaria, (bySecretaria.get(listing.secretaria) ?? 0) + 1);
    }
    expect(bySecretaria.get('SECRETARIA DE HACIENDA Y CREDITO PUBLICO')).toBe(4);
    expect(bySecretaria.get('SECRETARIA DE INFRAESTRUCTURA, COMUNICACIONES Y TRANSPORTES')).toBe(1);
  });

  it('decodes HTML entities in titles instead of leaving them literal', () => {
    const listings = parseDailyEditions(html);
    const titles = listings.map((listing) => listing.titulo).join(' ');
    expect(titles).not.toContain('&aacute;');
    expect(titles).not.toContain('&oacute;');
    expect(titles).toContain('carácter');
  });

  it('returns an empty array for a page with no editions', () => {
    expect(parseDailyEditions('<html><body>No hay ediciones publicadas.</body></html>')).toEqual([]);
  });
});

describe('parseNoteDetail', () => {
  // Recorte real (truncado por tamano) de
  // https://dof.gob.mx/nota_detalle.php?codigo=5795797&fecha=07/08/2026 — la
  // pagina real envuelve el documento (export de Word, con su propio
  // DOCTYPE/head/title) dentro de la pagina exterior del sitio, que trae su
  // propio <title>DOF - Diario Oficial de la Federacion</title>.
  const html = readFixture('nota_detalle_sample.html');

  it('extracts the nested document title, not the outer page shell title', () => {
    const detail = parseNoteDetail(html);
    expect(detail.titulo).not.toBe('DOF - Diario Oficial de la Federación');
    expect(detail.titulo).toBe(
      'ACUERDO por el que se modifican las Reglas de carácter general a que se refiere la Ley Federal para la Prevención e Identificación de Operaciones con Recursos de Procedencia Ilícita',
    );
  });

  it('extracts plain-text body with entities decoded and tags stripped', () => {
    const detail = parseNoteDetail(html);
    expect(detail.cuerpo).toContain('Prevención e Identificación');
    expect(detail.cuerpo).not.toMatch(/<[a-z]/i);
    expect(detail.cuerpo).not.toContain('&aacute;');
  });

  it('falls back to the whole document when there is no nested DOCTYPE marker', () => {
    const detail = parseNoteDetail('<html><head><title>Nota simple</title></head><body>Texto llano.</body></html>');
    expect(detail.titulo).toBe('Nota simple');
    expect(detail.cuerpo).toContain('Texto llano.');
  });
});

describe('URL builders', () => {
  it('builds the daily edition URL with zero-padded month and day', () => {
    expect(buildDailyEditionUrl({ year: 2026, month: 8, day: 7 })).toBe(
      'https://dof.gob.mx/index_111.php?year=2026&month=08&day=07',
    );
  });

  it('builds the note detail URL with encoded query params', () => {
    expect(buildNoteDetailUrl('5795797', '07/08/2026')).toBe(
      'https://dof.gob.mx/nota_detalle.php?codigo=5795797&fecha=07%2F08%2F2026',
    );
  });
});

describe('fetchDailyEditions / fetchNoteDetail (injectable fetch, no real network)', () => {
  it('fetchDailyEditions calls the injected fetcher with the built URL and parses the result', async () => {
    const html = readFixture('index_111_sample.html');
    let requestedUrl = '';
    const listings = await fetchDailyEditions({ year: 2026, month: 8, day: 7 }, async (url) => {
      requestedUrl = url;
      return html;
    });
    expect(requestedUrl).toBe('https://dof.gob.mx/index_111.php?year=2026&month=08&day=07');
    expect(listings).toHaveLength(5);
  });

  it('fetchNoteDetail returns the parsed detail plus the raw HTML and URL', async () => {
    const html = readFixture('nota_detalle_sample.html');
    const result = await fetchNoteDetail('5795797', '07/08/2026', async () => html);
    expect(result.url).toBe('https://dof.gob.mx/nota_detalle.php?codigo=5795797&fecha=07%2F08%2F2026');
    expect(result.rawHtml).toBe(html);
    expect(result.detail.titulo).toContain('ACUERDO');
  });
});

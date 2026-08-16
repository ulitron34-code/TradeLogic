export type ClassificationIntakeRow = {
  rowNumber: number;
  name: string;
  description: string;
  sku?: string;
  originCountry?: string;
  destinationCountry?: string;
  material?: string;
  mainFunction?: string;
  presentation?: string;
};

/** Parses the intentionally small CSV contract used by the bulk intake flow. */
export function parseClassificationIntakeCsv(csv: string): ClassificationIntakeRow[] {
  const rows = parseRows(csv.replace(/^\uFEFF/, ''));
  if (rows.length < 2) return [];
  const headerRow = rows[0];
  if (!headerRow) return [];
  const headers = headerRow.map(normalizeHeader);
  const nameHeader = findHeader(headers, ['name', 'product_name', 'nombre', 'mercancia']);
  const descriptionHeader = findHeader(headers, ['description', 'descripcion', 'description_free']);
  if (nameHeader < 0 || descriptionHeader < 0) throw new Error('Bulk classification CSV requires name and description columns');
  const value = (row: string[], names: string[]) => { const index = findHeader(headers, names); return index >= 0 ? row[index]?.trim() ?? '' : ''; };
  return rows.slice(1).filter((row) => row.some((cell) => cell.trim() !== '')).map((row, index) => {
    const name = row[nameHeader]?.trim() ?? '';
    const description = row[descriptionHeader]?.trim() ?? '';
    if (!name || !description) throw new Error(`Bulk classification row ${index + 2} requires name and description`);
    return {
      rowNumber: index + 2,
      name,
      description,
      ...(value(row, ['sku', 'referencia', 'reference']) ? { sku: value(row, ['sku', 'referencia', 'reference']) } : {}),
      ...(value(row, ['origin_country', 'country_of_origin', 'pais_origen', 'origen']) ? { originCountry: value(row, ['origin_country', 'country_of_origin', 'pais_origen', 'origen']) } : {}),
      ...(value(row, ['destination_country', 'pais_destino', 'destino']) ? { destinationCountry: value(row, ['destination_country', 'pais_destino', 'destino']) } : {}),
      ...(value(row, ['material', 'composition', 'composicion']) ? { material: value(row, ['material', 'composition', 'composicion']) } : {}),
      ...(value(row, ['main_function', 'function', 'funcion']) ? { mainFunction: value(row, ['main_function', 'function', 'funcion']) } : {}),
      ...(value(row, ['presentation', 'presentacion']) ? { presentation: value(row, ['presentation', 'presentacion']) } : {}),
    };
  });
}

function findHeader(headers: string[], aliases: string[]) { return headers.findIndex((header) => aliases.includes(header)); }
function normalizeHeader(value: string) { return value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_'); }
function parseRows(csv: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ''; let quoted = false;
  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    if (char === '"') { if (quoted && csv[index + 1] === '"') { cell += '"'; index += 1; } else quoted = !quoted; }
    else if (char === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) { if (char === '\r' && csv[index + 1] === '\n') index += 1; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += char;
  }
  if (cell !== '' || row.length > 0) { row.push(cell); rows.push(row); }
  return rows;
}

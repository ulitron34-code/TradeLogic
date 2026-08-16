import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { OriginRuleCatalogPersistenceRecord } from '@platform/db';
import { db, upsertOriginRuleCatalog } from '@platform/db';

type Options = { input?: string; sourceVersion?: string; sourceUrl?: string; apply: boolean; help: boolean };
type RawRow = Record<string, string>;

function parseArgs(argv: string[]): Options {
  const options: Options = { apply: false, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help' || argument === '-h') { options.help = true; continue; }
    if (argument === '--apply') { options.apply = true; continue; }
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`Falta el valor de ${argument}`);
    if (argument === '--input') options.input = value;
    else if (argument === '--source-version') options.sourceVersion = value;
    else if (argument === '--source-url') options.sourceUrl = value;
    else throw new Error(`Argumento desconocido: ${argument}`);
    index += 1;
  }
  return options;
}

function usage() {
  return `Uso:\n  pnpm --filter @platform/db origin-rules:import -- --input reglas.csv --source-version TMEC-2026 --source-url https://fuente.oficial/ [--apply]\n\nSin --apply solo valida; nunca escribe en Supabase.\n`;
}

function normalizeHeader(value: string) { return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim().replace(/ /g, ''); }
function parseCsv(csv: string): RawRow[] {
  const rows: string[][] = []; let row: string[] = []; let value = ''; let quoted = false;
  const text = csv.replace(/^\uFEFF/, '');
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]!; const next = text[index + 1];
    if (character === '"' && quoted && next === '"') { value += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === ',' && !quoted) { row.push(value); value = ''; }
    else if ((character === '\n' || character === '\r') && !quoted) { if (character === '\r' && next === '\n') index += 1; row.push(value); rows.push(row); row = []; value = ''; }
    else value += character;
  }
  if (value || row.length) { row.push(value); rows.push(row); }
  if (rows.length < 2) return [];
  const headers = rows[0]!.map(normalizeHeader);
  return rows.slice(1).filter(cells => cells.some(cell => cell.trim())).map(cells => Object.fromEntries(headers.map((header, index) => [header, (cells[index] ?? '').trim()])));
}
function date(value: string, field: string, row: number) { const parsed = new Date(value); if (!value || Number.isNaN(parsed.getTime())) throw new Error(`Fila ${row}: ${field} debe ser fecha ISO.`); return parsed; }
function url(value: string, field: string, row: number) { const parsed = new URL(value); if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error(`Fila ${row}: ${field} debe ser HTTP(S).`); return value; }

const options = parseArgs(process.argv.slice(2));
if (options.help) { console.log(usage()); process.exit(0); }
if (!options.input || !options.sourceVersion || !options.sourceUrl) throw new Error(`${usage()}Se requieren --input, --source-version y --source-url.`);
const inputPath = path.resolve(options.input);
const csvRows = parseCsv(await readFile(inputPath, 'utf8'));
const records: OriginRuleCatalogPersistenceRecord[] = csvRows.map((row, index) => {
  const line = index + 2;
  const agreement = row.agreement ?? row.tratado ?? row.acuerdo ?? '';
  const tariffCode = row.tariffcode ?? row.fraccion ?? row.fraccionarancelaria ?? '';
  const type = (row.type ?? row.tipo ?? '').toUpperCase() as OriginRuleCatalogPersistenceRecord['type'];
  if (!agreement || !tariffCode.match(/^\d{4}\.\d{2}\.\d{2}$/)) throw new Error(`Fila ${line}: tratado y fracción 0000.00.00 son obligatorios.`);
  if (!['CTC', 'RVC', 'PROCESS'].includes(type)) throw new Error(`Fila ${line}: type debe ser CTC, RVC o PROCESS.`);
  const source = url(row.sourceurl || options.sourceUrl, 'sourceUrl', line);
  const sourceVersion = row.sourceversion || options.sourceVersion;
  if (!sourceVersion) throw new Error(`Fila ${line}: sourceVersion es obligatorio.`);
  const threshold = row.thresholdpercent || row.umbral || '';
  const thresholdPercent = threshold === '' ? null : Number(threshold);
  if (thresholdPercent !== null && (!Number.isFinite(thresholdPercent) || thresholdPercent < 0 || thresholdPercent > 100)) throw new Error(`Fila ${line}: thresholdPercent debe estar entre 0 y 100.`);
  return { agreement, tariffCode, type, thresholdPercent, requiredProcess: row.requiredprocess || row.proceso || null, sourceUrl: source, sourceVersion, validFrom: date(row.validfrom || row.vigenciadesde, 'validFrom', line), validTo: row.validto || row.vigenciahasta ? date(row.validto || row.vigenciahasta, 'validTo', line) : null };
});
const result: Record<string, unknown> = { status: 'valid', mode: options.apply ? 'apply' : 'dry-run', input: inputPath, records: records.length, sourceVersion: options.sourceVersion, sourceUrl: options.sourceUrl };
if (!options.apply) { console.log(JSON.stringify(result, null, 2)); process.exit(0); }
const persisted = await upsertOriginRuleCatalog(db, records);
console.log(JSON.stringify({ ...result, status: 'applied', ...persisted }, null, 2));
await db.$disconnect();

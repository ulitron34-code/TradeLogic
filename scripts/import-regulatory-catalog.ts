import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { SourceAuthority } from '@prisma/client';
import { parseRegulatoryCatalogCsv, validateRegulatoryCatalog } from '@platform/domain';
import { db, persistRegulatoryCatalog } from '@platform/db';

type Options = { input?: string; sourceVersion?: string; sourceUrl?: string; apply: boolean; help: boolean };

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
  return `Uso:\n  pnpm --filter @platform/db regulatory:import -- --input archivo.csv --source-version 2026.1 --source-url https://fuente.oficial/ [--apply]\n\nSin --apply solo valida y reporta; nunca escribe en Supabase.\n`;
}

const options = parseArgs(process.argv.slice(2));
if (options.help) { console.log(usage()); process.exit(0); }
if (!options.input || !options.sourceVersion || !options.sourceUrl) throw new Error(`${usage()}Se requieren --input, --source-version y --source-url.`);
const sourceUrl = new URL(options.sourceUrl);
if (!['http:', 'https:'].includes(sourceUrl.protocol)) throw new Error('--source-url debe ser HTTP(S).');

const inputPath = path.resolve(options.input);
const csv = await readFile(inputPath, 'utf8');
const rawRecords = parseRegulatoryCatalogCsv(csv, { sourceVersion: options.sourceVersion, sourceUrl: options.sourceUrl });
const validation = validateRegulatoryCatalog(rawRecords);
const result: Record<string, unknown> = {
  status: validation.errors.length === 0 ? 'valid' : 'invalid',
  mode: options.apply ? 'apply' : 'dry-run',
  input: inputPath,
  sourceVersion: options.sourceVersion,
  sourceUrl: options.sourceUrl,
  records: validation.records.length,
  errors: validation.errors,
};
if (validation.errors.length > 0 || !options.apply) { console.log(JSON.stringify(result, null, 2)); process.exit(validation.errors.length > 0 ? 1 : 0); }

const persisted = await persistRegulatoryCatalog(db, validation.records.map(record => ({ ...record, authority: record.authority as SourceAuthority })));
console.log(JSON.stringify({ ...result, status: 'applied', ...persisted }, null, 2));
await db.$disconnect();

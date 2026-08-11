#!/usr/bin/env node
const { mkdirSync, readFileSync, statSync, writeFileSync } = require('node:fs');
const path = require('node:path');

const DEFAULT_SQL = 'artifacts/import_tariff_catalog.sql';
const DEFAULT_INPUT_SUMMARY = 'artifacts/tariff-import-input.json';
const DEFAULT_OUTPUT = 'artifacts/import_tariff_catalog_guide.md';

function usage() {
  return `Usage:
  node scripts/write-supabase-tariff-import-guide.cjs [--sql artifacts/import_tariff_catalog.sql] [--input-summary artifacts/tariff-import-input.json] [--output artifacts/import_tariff_catalog_guide.md]

Writes a human checklist for pasting the generated FA/NICO SQL into Supabase and collecting pilot evidence.
`;
}

function parseArgs(argv) {
  const options = { sql: DEFAULT_SQL, inputSummary: DEFAULT_INPUT_SUMMARY, output: DEFAULT_OUTPUT };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    const value = argv[index + 1];
    if (!arg.startsWith('--')) throw new Error(`Unexpected argument: ${arg}`);
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
    if (arg === '--sql') options.sql = value;
    else if (arg === '--input-summary') options.inputSummary = value;
    else if (arg === '--output') options.output = value;
    else throw new Error(`Unknown option: ${arg}`);
    index += 1;
  }
  return options;
}

function readJson(filePath) {
  return JSON.parse(readFileSync(path.resolve(filePath), 'utf8'));
}

function formatBytes(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function assertSqlShape(sqlPath, sql) {
  const required = [
    'begin;',
    'create temp table trade_logic_tariff_import',
    'expected_rows',
    'commit;',
  ];
  const missing = required.filter((marker) => !sql.includes(marker));
  if (missing.length > 0) throw new Error(`${sqlPath} is missing expected SQL markers: ${missing.join(', ')}`);
  if (!/commit;\s*$/i.test(sql)) throw new Error(`${sqlPath} must end with commit;`);
}

function assertSummary(summary, filePath) {
  if (summary.status !== 'ok') throw new Error(`${filePath} status is not ok`);
  if (summary.expectedRecords !== 20227 || summary.records !== 20227 || summary.uniqueImportKeys !== 20227) {
    throw new Error(`${filePath} must prove 20227 validated records and unique keys`);
  }
}

function sourceVersionLines(sourceVersions) {
  return Object.entries(sourceVersions ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([version, rows]) => `- ${version}: ${Number(rows).toLocaleString('es-MX')} filas`)
    .join('\n');
}

function buildGuide({ sqlPath, sqlBytes, summaryPath, summary }) {
  return `# Guia de importacion FA/NICO en Supabase

Generado: ${new Date().toISOString()}

## Archivos

- SQL de carga: \`${path.relative(process.cwd(), path.resolve(sqlPath))}\`
- Evidencia de entrada: \`${path.relative(process.cwd(), path.resolve(summaryPath))}\`
- Tamano del SQL: ${formatBytes(sqlBytes)}
- Registros esperados: ${summary.expectedRecords.toLocaleString('es-MX')}

## Resumen validado

- Registros: ${summary.records.toLocaleString('es-MX')}
- Claves unicas: ${summary.uniqueImportKeys.toLocaleString('es-MX')}
- NICO: ${summary.nicoRows.toLocaleString('es-MX')}
- Filas cerradas por modificacion: ${summary.closedRows.toLocaleString('es-MX')}
- IGI porcentual: ${summary.percentImportRates.toLocaleString('es-MX')}
- IGE porcentual: ${summary.percentExportRates.toLocaleString('es-MX')}

${sourceVersionLines(summary.sourceVersions)}

## Pasos en Supabase

1. Abrir el proyecto TradeLogic en Supabase.
2. Entrar a SQL Editor y crear un query nuevo.
3. Abrir el SQL de carga local, copiarlo completo y pegarlo en Supabase.
4. Ejecutar el query una sola vez; no cerrar la pestana mientras corre.
5. Confirmar que el resultado \`expected_rows\` muestre \`actual_rows = 20227\` y \`status = ok\`.
6. Ejecutar \`supabase/verify_tariff_catalog.sql\`.
7. Copiar el valor final \`tariff_catalog_verification_json\` a \`artifacts/tariff-catalog-verification.json\`.
8. Con JWT real de una cuenta piloto, correr \`npm run smoke:authenticated -- --targets artifacts/deployment-targets.json --require-tariff-catalog --output artifacts/smoke-authenticated.json\`.
9. Correr \`npm run verify:pilot-evidence -- --artifacts-dir artifacts\`.

## No-go

- El SQL pegado no termina en \`commit;\`.
- Supabase reporta timeout, error de sintaxis o desconexion antes del commit.
- \`expected_rows\` no devuelve \`ok\`.
- \`verify_tariff_catalog.sql\` devuelve cualquier check distinto de \`ok\`.
- El dashboard no muestra \`Catalogo FA/NICO completo\` despues del deploy/API smoke.

El SQL es idempotente por clave natural: \`countryCode + code + nico + validFrom\`. Si se reejecuta completo, actualiza metadata existente e inserta faltantes.
`;
}

function writeOutput(outputPath, contents) {
  const resolved = path.resolve(outputPath);
  mkdirSync(path.dirname(resolved), { recursive: true });
  writeFileSync(resolved, contents, 'utf8');
  return resolved;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(usage());
    return;
  }

  const sqlPath = path.resolve(options.sql);
  const summaryPath = path.resolve(options.inputSummary);
  const sql = readFileSync(sqlPath, 'utf8');
  assertSqlShape(sqlPath, sql);
  const summary = readJson(summaryPath);
  assertSummary(summary, summaryPath);
  const output = writeOutput(options.output, buildGuide({ sqlPath, sqlBytes: statSync(sqlPath).size, summaryPath, summary }));

  console.log(JSON.stringify({
    status: 'ok',
    output: path.relative(process.cwd(), output),
    sql: path.relative(process.cwd(), sqlPath),
    inputSummary: path.relative(process.cwd(), summaryPath),
    records: summary.records,
    bytes: statSync(sqlPath).size,
  }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}

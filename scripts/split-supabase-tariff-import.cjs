#!/usr/bin/env node
const { mkdir, readFile, writeFile } = require('node:fs/promises');
const path = require('node:path');

const input = process.argv[2] ?? 'artifacts/import_tariff_catalog.sql';
const outputDir = process.argv[3] ?? 'artifacts/tariff-import-chunks';
const batchSize = Number.parseInt(process.argv[4] ?? '500', 10);

if (!Number.isSafeInteger(batchSize) || batchSize <= 0) throw new Error('batch size must be a positive integer');

(async () => {
const sql = await readFile(input, 'utf8');
const firstInsert = sql.indexOf('insert into trade_logic_tariff_import');
const upsertStart = sql.indexOf('\nupdate "TariffCode"');
const validationBlockStart = sql.indexOf('do $$', firstInsert);
const expectedRowsStart = sql.indexOf("\nselect\n  'expected_rows'", upsertStart);
const finalDistributionStart = sql.indexOf('\nselect "sourceVersion"', upsertStart);
if (firstInsert < 0 || validationBlockStart < 0 || upsertStart < 0 || expectedRowsStart < 0 || finalDistributionStart < 0) throw new Error('could not locate generated import sections');

const head = sql.slice(0, firstInsert);
const insertPositions = [];
for (let position = firstInsert; position < upsertStart; ) {
  insertPositions.push(position);
  const next = sql.indexOf('insert into trade_logic_tariff_import', position + 10);
  if (next < 0 || next >= upsertStart) break;
  position = next;
}
const statements = insertPositions.map((position, index) => {
  const end = index + 1 < insertPositions.length ? insertPositions[index + 1] : validationBlockStart;
  return sql.slice(position, end).trim();
});
const upsert = sql.slice(upsertStart, expectedRowsStart).trim();
if (!upsert.startsWith('update "TariffCode"')) throw new Error('could not locate upsert section');

await mkdir(outputDir, { recursive: true });
const files = [];
let totalRows = 0;
for (let offset = 0; offset < statements.length; offset += batchSize) {
  const selected = statements.slice(offset, offset + batchSize);
  const rows = selected.reduce((total, statement) => total + statement.split(/\r?\n/).filter((line) => line.startsWith("('MX'")).length, 0);
  totalRows += rows;
  const fileName = `chunk-${String(files.length + 1).padStart(2, '0')}.sql`;
  const body = `${head}${selected.join('\n\n')}\n\n${upsert}\n\ncommit;\n`;
  await writeFile(path.join(outputDir, fileName), body, 'utf8');
  files.push({ file: fileName, sourceStatements: selected.length, rows });
}
if (totalRows !== 20227) throw new Error(`expected 20227 value rows, got ${totalRows}`);
await writeFile(path.join(outputDir, 'manifest.json'), `${JSON.stringify({ input, expectedRows: totalRows, sourceStatements: statements.length, batchSize, chunks: files }, null, 2)}\n`);
console.log(JSON.stringify({ status: 'ok', expectedRows: totalRows, sourceStatements: statements.length, batchSize, chunks: files.length, outputDir }));
})().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

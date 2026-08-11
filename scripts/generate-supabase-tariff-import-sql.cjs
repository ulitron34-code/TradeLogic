#!/usr/bin/env node
const { mkdirSync, readFileSync, writeFileSync } = require('node:fs');
const path = require('node:path');

const DEFAULT_INPUT = 'data/tariff-sources/2026/LIGIE-NICO-2026-04-24.csv';
const DEFAULT_OUTPUT = 'artifacts/import_tariff_catalog.sql';
const DEFAULT_EXPECTED_RECORDS = 20227;
const DEFAULT_BATCH_SIZE = 400;
const REQUIRED_HEADERS = [
  'countryCode',
  'code',
  'nico',
  'description',
  'unitOfMeasure',
  'generalRate',
  'rateUnit',
  'exportRate',
  'exportRateUnit',
  'validFrom',
  'validTo',
  'sourceVersion',
  'sourceUrl',
];

function usage() {
  return `Usage:
  node scripts/generate-supabase-tariff-import-sql.cjs [--input data/tariff-sources/2026/LIGIE-NICO-2026-04-24.csv] [--expected-records 20227] [--batch-size 400] [--output artifacts/import_tariff_catalog.sql]

Generates an idempotent SQL import script for the Supabase SQL editor. The SQL validates row count, updates existing natural keys and inserts missing rows without requiring pnpm, tsx, Prisma or direct database connectivity from this machine.
`;
}

function parseArgs(argv) {
  const options = {
    input: DEFAULT_INPUT,
    output: DEFAULT_OUTPUT,
    expectedRecords: DEFAULT_EXPECTED_RECORDS,
    batchSize: DEFAULT_BATCH_SIZE,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    const value = argv[index + 1];
    if (!arg.startsWith('--')) throw new Error(`Unexpected argument: ${arg}`);
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
    if (arg === '--input') options.input = value;
    else if (arg === '--output') options.output = value;
    else if (arg === '--expected-records') options.expectedRecords = parsePositiveInteger(arg, value);
    else if (arg === '--batch-size') options.batchSize = parsePositiveInteger(arg, value);
    else throw new Error(`Unknown option: ${arg}`);
    index += 1;
  }
  return options;
}

function parsePositiveInteger(name, value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0 || String(parsed) !== value) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

function parseCsvLine(line) {
  const cells = [];
  let current = '';
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === ',' && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  cells.push(current);
  if (inQuotes) throw new Error('CSV line has an unterminated quoted field');
  return cells;
}

function parseCsv(csv) {
  const text = csv.replace(/^\uFEFF/, '');
  const rows = [];
  let current = '';
  let inQuotes = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && inQuotes && next === '"') {
      current += char + next;
      index += 1;
      continue;
    }
    if (char === '"') inQuotes = !inQuotes;
    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (current.trim()) rows.push(parseCsvLine(current));
      current = '';
      if (char === '\r' && next === '\n') index += 1;
      continue;
    }
    current += char;
  }
  if (inQuotes) throw new Error('CSV has an unterminated quoted field');
  if (current.trim()) rows.push(parseCsvLine(current));
  return rows;
}

function rowObject(headers, row) {
  if (row.length !== headers.length) {
    throw new Error(`CSV row has ${row.length} cells, expected ${headers.length}`);
  }
  return Object.fromEntries(headers.map((header, index) => [header, row[index] ?? '']));
}

function isDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function isNumeric(value) {
  if (value === '') return false;
  return /^\d+(\.\d+)?$/.test(value);
}

function readRecords(inputPath, expectedRecords) {
  const csvPath = path.resolve(inputPath);
  const rows = parseCsv(readFileSync(csvPath, 'utf8'));
  if (rows.length === 0) throw new Error('CSV is empty');
  const headers = rows[0];
  const missingHeaders = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
  if (missingHeaders.length > 0) throw new Error(`CSV missing required headers: ${missingHeaders.join(', ')}`);

  const records = rows.slice(1).map((row) => rowObject(headers, row));
  if (records.length !== expectedRecords) {
    throw new Error(`Expected ${expectedRecords} records, got ${records.length}`);
  }

  const keys = new Set();
  for (const [offset, record] of records.entries()) {
    const rowNumber = offset + 2;
    if (record.countryCode !== 'MX') throw new Error(`Row ${rowNumber}: countryCode must be MX`);
    if (!/^\d{4}\.\d{2}\.\d{2}$/.test(record.code)) throw new Error(`Row ${rowNumber}: invalid code ${record.code}`);
    if (record.nico && !/^\d{2}$/.test(record.nico)) throw new Error(`Row ${rowNumber}: invalid NICO ${record.nico}`);
    if (!record.description.trim()) throw new Error(`Row ${rowNumber}: missing description`);
    if (!record.sourceVersion.trim()) throw new Error(`Row ${rowNumber}: missing sourceVersion`);
    if (!/^https:\/\//.test(record.sourceUrl)) throw new Error(`Row ${rowNumber}: sourceUrl must be https`);
    if (!isDate(record.validFrom)) throw new Error(`Row ${rowNumber}: invalid validFrom ${record.validFrom}`);
    if (record.validTo) {
      if (!isDate(record.validTo)) throw new Error(`Row ${rowNumber}: invalid validTo ${record.validTo}`);
      if (record.validTo <= record.validFrom) throw new Error(`Row ${rowNumber}: validTo must be after validFrom`);
    }
    if (record.generalRate && !record.rateUnit) throw new Error(`Row ${rowNumber}: generalRate requires rateUnit`);
    if (record.exportRate && !record.exportRateUnit) throw new Error(`Row ${rowNumber}: exportRate requires exportRateUnit`);
    if (isNumeric(record.generalRate) && record.rateUnit !== 'PERCENT') throw new Error(`Row ${rowNumber}: numeric generalRate must use PERCENT`);
    if (isNumeric(record.exportRate) && record.exportRateUnit !== 'PERCENT') throw new Error(`Row ${rowNumber}: numeric exportRate must use PERCENT`);
    const key = `${record.countryCode}|${record.code}|${record.nico}|${record.validFrom}`;
    if (keys.has(key)) throw new Error(`Duplicate import key at row ${rowNumber}: ${key}`);
    keys.add(key);
  }
  return records;
}

function sqlString(value) {
  if (value === undefined || value === null || value === '') return 'null';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlDate(value) {
  return value ? `${sqlString(value)}::date` : 'null';
}

function sqlNumeric(value) {
  return isNumeric(value) ? value : 'null';
}

function sqlRow(record) {
  return `(${[
    sqlString(record.countryCode),
    sqlString(record.code),
    sqlString(record.nico),
    sqlString(record.description),
    sqlString(record.unitOfMeasure),
    sqlNumeric(record.generalRate),
    sqlString(record.rateUnit),
    sqlNumeric(record.exportRate),
    sqlString(record.exportRateUnit),
    sqlDate(record.validFrom),
    sqlDate(record.validTo),
    sqlString(record.sourceVersion),
    sqlString(record.sourceUrl),
  ].join(', ')})`;
}

function generateSql(records, options) {
  const sourceVersions = [...new Set(records.map((record) => record.sourceVersion))].sort();
  const chunks = [];
  chunks.push('-- TradeLogic Supabase FA/NICO tariff catalog import');
  chunks.push('-- Generated from data/tariff-sources/2026/LIGIE-NICO-2026-04-24.csv.');
  chunks.push('-- Paste this full script into the Supabase SQL editor for the TradeLogic project.');
  chunks.push('-- Idempotent natural key: countryCode + code + nico + validFrom.');
  chunks.push('');
  chunks.push('begin;');
  chunks.push('');
  chunks.push('create extension if not exists pgcrypto;');
  chunks.push('');
  chunks.push('create temp table trade_logic_tariff_import (');
  chunks.push('  "countryCode" text not null,');
  chunks.push('  code text not null,');
  chunks.push('  nico text,');
  chunks.push('  description text not null,');
  chunks.push('  "unitOfMeasure" text,');
  chunks.push('  "generalRate" numeric(8,4),');
  chunks.push('  "rateUnit" text,');
  chunks.push('  "exportRate" numeric(8,4),');
  chunks.push('  "exportRateUnit" text,');
  chunks.push('  "validFrom" date not null,');
  chunks.push('  "validTo" date,');
  chunks.push('  "sourceVersion" text not null,');
  chunks.push('  "sourceUrl" text');
  chunks.push(') on commit drop;');
  chunks.push('');

  for (let start = 0; start < records.length; start += options.batchSize) {
    const batch = records.slice(start, start + options.batchSize);
    chunks.push('insert into trade_logic_tariff_import ("countryCode", code, nico, description, "unitOfMeasure", "generalRate", "rateUnit", "exportRate", "exportRateUnit", "validFrom", "validTo", "sourceVersion", "sourceUrl") values');
    chunks.push(`${batch.map(sqlRow).join(',\n')};`);
    chunks.push('');
  }

  chunks.push(`do $$`);
  chunks.push('declare');
  chunks.push(`  expected_rows integer := ${options.expectedRecords};`);
  chunks.push('  actual_rows integer;');
  chunks.push('begin');
  chunks.push('  select count(*) into actual_rows from trade_logic_tariff_import;');
  chunks.push('  if actual_rows <> expected_rows then');
  chunks.push("    raise exception 'Expected % tariff rows, got %', expected_rows, actual_rows;");
  chunks.push('  end if;');
  chunks.push('end $$;');
  chunks.push('');
  chunks.push('update "TariffCode" as target');
  chunks.push('set');
  chunks.push('  description = source.description,');
  chunks.push('  chapter = substring(source.code from 1 for 2),');
  chunks.push("  heading = replace(substring(source.code from 1 for 5), '.', ''),");
  chunks.push('  "legalNotes" = null,');
  chunks.push('  "sourceUrl" = source."sourceUrl",');
  chunks.push('  "unitOfMeasure" = source."unitOfMeasure",');
  chunks.push('  "generalRate" = source."generalRate",');
  chunks.push('  "rateUnit" = source."rateUnit",');
  chunks.push('  "exportRate" = source."exportRate",');
  chunks.push('  "exportRateUnit" = source."exportRateUnit",');
  chunks.push('  "validTo" = source."validTo",');
  chunks.push('  "sourceVersion" = source."sourceVersion"');
  chunks.push('from trade_logic_tariff_import as source');
  chunks.push('where target."countryCode" = source."countryCode"');
  chunks.push('  and target.code = source.code');
  chunks.push('  and target.nico is not distinct from source.nico');
  chunks.push('  and target."validFrom"::date = source."validFrom";');
  chunks.push('');
  chunks.push('insert into "TariffCode" ("id", "countryCode", code, nico, description, chapter, heading, "legalNotes", "sourceUrl", "unitOfMeasure", "generalRate", "rateUnit", "exportRate", "exportRateUnit", "validFrom", "validTo", "sourceVersion")');
  chunks.push("select gen_random_uuid(), source.\"countryCode\", source.code, source.nico, source.description, substring(source.code from 1 for 2), replace(substring(source.code from 1 for 5), '.', ''), null, source.\"sourceUrl\", source.\"unitOfMeasure\", source.\"generalRate\", source.\"rateUnit\", source.\"exportRate\", source.\"exportRateUnit\", source.\"validFrom\", source.\"validTo\", source.\"sourceVersion\"");
  chunks.push('from trade_logic_tariff_import as source');
  chunks.push('where not exists (');
  chunks.push('  select 1');
  chunks.push('  from "TariffCode" as target');
  chunks.push('  where target."countryCode" = source."countryCode"');
  chunks.push('    and target.code = source.code');
  chunks.push('    and target.nico is not distinct from source.nico');
  chunks.push('    and target."validFrom"::date = source."validFrom"');
  chunks.push(');');
  chunks.push('');
  chunks.push('select');
  chunks.push("  'expected_rows' as check_name,");
  chunks.push('  count(*) as actual_rows,');
  chunks.push(`  ${options.expectedRecords} as expected_rows,`);
  chunks.push(`  case when count(*) = ${options.expectedRecords} then 'ok' else 'fail' end as status`);
  chunks.push('from "TariffCode"');
  chunks.push(`where "sourceVersion" in (${sourceVersions.map(sqlString).join(', ')});`);
  chunks.push('');
  chunks.push('select "sourceVersion", count(*) as rows');
  chunks.push('from "TariffCode"');
  chunks.push(`where "sourceVersion" in (${sourceVersions.map(sqlString).join(', ')})`);
  chunks.push('group by "sourceVersion"');
  chunks.push('order by "sourceVersion";');
  chunks.push('');
  chunks.push('commit;');
  chunks.push('');
  return chunks.join('\n');
}

function writeOutput(outputPath, sql) {
  const resolved = path.resolve(outputPath);
  mkdirSync(path.dirname(resolved), { recursive: true });
  writeFileSync(resolved, sql, 'utf8');
  return resolved;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(usage());
    return;
  }
  const records = readRecords(options.input, options.expectedRecords);
  const sql = generateSql(records, options);
  const output = writeOutput(options.output, sql);
  console.log(JSON.stringify({
    status: 'ok',
    output: path.relative(process.cwd(), output),
    records: records.length,
    expectedRecords: options.expectedRecords,
    batchSize: options.batchSize,
    bytes: Buffer.byteLength(sql, 'utf8'),
  }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}

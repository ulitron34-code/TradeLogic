#!/usr/bin/env node
const { mkdirSync, readFileSync, writeFileSync } = require('node:fs');
const path = require('node:path');

const DEFAULT_INPUT = 'data/tariff-sources/2026/LIGIE-NICO-2026-04-24.csv';
const DEFAULT_EXPECTED_RECORDS = 20227;
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
  node scripts/verify-tariff-import-input.cjs [--input data/tariff-sources/2026/LIGIE-NICO-2026-04-24.csv] [--expected-records 20227] [--output artifacts/tariff-import-input.json]
`;
}

function parseArgs(argv) {
  const options = { input: DEFAULT_INPUT, expectedRecords: DEFAULT_EXPECTED_RECORDS };
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
    else if (arg === '--expected-records') options.expectedRecords = parsePositiveInteger(arg, value);
    else if (arg === '--output') options.output = value;
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
  const rows = [];
  let current = '';
  let inQuotes = false;
  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];
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

function verifyInput(inputPath, expectedRecords) {
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
  const sourceVersions = new Map();
  let nicoRows = 0;
  let percentImportRates = 0;
  let percentExportRates = 0;
  let closedRows = 0;

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
      closedRows += 1;
    }
    if (record.generalRate && !record.rateUnit) throw new Error(`Row ${rowNumber}: generalRate requires rateUnit`);
    if (record.exportRate && !record.exportRateUnit) throw new Error(`Row ${rowNumber}: exportRate requires exportRateUnit`);
    if (isNumeric(record.generalRate) && record.rateUnit !== 'PERCENT') throw new Error(`Row ${rowNumber}: numeric generalRate must use PERCENT`);
    if (isNumeric(record.exportRate) && record.exportRateUnit !== 'PERCENT') throw new Error(`Row ${rowNumber}: numeric exportRate must use PERCENT`);

    const key = `${record.countryCode}|${record.code}|${record.nico}|${record.validFrom}`;
    if (keys.has(key)) throw new Error(`Duplicate import key at row ${rowNumber}: ${key}`);
    keys.add(key);
    if (record.nico) nicoRows += 1;
    if (record.rateUnit === 'PERCENT') percentImportRates += 1;
    if (record.exportRateUnit === 'PERCENT') percentExportRates += 1;
    sourceVersions.set(record.sourceVersion, (sourceVersions.get(record.sourceVersion) ?? 0) + 1);
  }

  return {
    status: 'ok',
    checkedAt: new Date().toISOString(),
    input: path.relative(process.cwd(), csvPath),
    expectedRecords,
    records: records.length,
    uniqueImportKeys: keys.size,
    nicoRows,
    closedRows,
    percentImportRates,
    percentExportRates,
    sourceVersions: Object.fromEntries([...sourceVersions.entries()].sort(([a], [b]) => a.localeCompare(b))),
  };
}

function writeSummary(outputPath, summary) {
  if (!outputPath) return;
  const resolved = path.resolve(outputPath);
  mkdirSync(path.dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(usage());
    return;
  }
  const summary = verifyInput(options.input, options.expectedRecords);
  writeSummary(options.output, summary);
  console.log(JSON.stringify(summary, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}

#!/usr/bin/env node
const { createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const DEFAULT_MANIFEST = 'data/tariff-sources/2026/LIGIE-NICO-2026-04-24.json';
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
  node scripts/verify-tariff-source.cjs [--manifest data/tariff-sources/2026/LIGIE-NICO-2026-04-24.json]
`;
}

function parseArgs(argv) {
  const options = { manifest: DEFAULT_MANIFEST };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    const value = argv[index + 1];
    if (!arg.startsWith('--')) throw new Error(`Unexpected argument: ${arg}`);
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
    if (arg === '--manifest') options.manifest = value;
    else throw new Error(`Unknown option: ${arg}`);
    index += 1;
  }
  return options;
}

function sha256Hex(buffer) {
  return createHash('sha256').update(buffer).digest('hex').toUpperCase();
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
  return cells;
}

function countCsvRecords(csv) {
  let records = 0;
  let inQuotes = false;
  let sawContentOnLine = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];
    if (char === '"' && inQuotes && next === '"') {
      index += 1;
      sawContentOnLine = true;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      sawContentOnLine = true;
      continue;
    }
    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (sawContentOnLine) records += 1;
      sawContentOnLine = false;
      if (char === '\r' && next === '\n') index += 1;
      continue;
    }
    if (char.trim() !== '') sawContentOnLine = true;
  }

  if (inQuotes) throw new Error('CSV has an unterminated quoted field');
  if (sawContentOnLine) records += 1;
  return Math.max(0, records - 1);
}

function firstLine(csv) {
  let inQuotes = false;
  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];
    if (char === '"' && inQuotes && next === '"') {
      index += 1;
      continue;
    }
    if (char === '"') inQuotes = !inQuotes;
    if ((char === '\n' || char === '\r') && !inQuotes) return csv.slice(0, index);
  }
  return csv;
}

function verifyManifest(manifestPath) {
  const manifestFullPath = path.resolve(manifestPath);
  const manifest = JSON.parse(readFileSync(manifestFullPath, 'utf8'));
  if (!manifest.derivedCsv) throw new Error('Manifest missing derivedCsv');
  if (!manifest.derivedCsvSha256) throw new Error('Manifest missing derivedCsvSha256');
  if (!Number.isSafeInteger(manifest.derivedRows) || manifest.derivedRows <= 0) throw new Error('Manifest has invalid derivedRows');

  const csvPath = path.resolve(path.dirname(manifestFullPath), manifest.derivedCsv);
  const csvBuffer = readFileSync(csvPath);
  const csvText = csvBuffer.toString('utf8');
  const actualHash = sha256Hex(csvBuffer);
  if (actualHash !== manifest.derivedCsvSha256) {
    throw new Error(`CSV hash mismatch: expected ${manifest.derivedCsvSha256}, got ${actualHash}`);
  }

  const headers = parseCsvLine(firstLine(csvText));
  const missingHeaders = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
  if (missingHeaders.length > 0) throw new Error(`CSV missing required headers: ${missingHeaders.join(', ')}`);

  const actualRows = countCsvRecords(csvText);
  if (actualRows !== manifest.derivedRows) {
    throw new Error(`CSV row count mismatch: expected ${manifest.derivedRows}, got ${actualRows}`);
  }

  return {
    status: 'ok',
    manifest: path.relative(process.cwd(), manifestFullPath),
    csv: path.relative(process.cwd(), csvPath),
    sha256: actualHash,
    rows: actualRows,
    headers: headers.length,
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(usage());
    return;
  }
  console.log(JSON.stringify(verifyManifest(options.manifest), null, 2));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
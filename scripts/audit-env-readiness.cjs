#!/usr/bin/env node
const { mkdirSync, readFileSync, writeFileSync } = require('node:fs');
const path = require('node:path');

const BACKEND_REQUIRED = [
  'NODE_ENV',
  'APP_BASE_URL',
  'API_BASE_URL',
  'DATABASE_URL',
  'REDIS_URL',
  'SUPABASE_URL',
  'S3_ENDPOINT',
  'S3_REGION',
  'S3_BUCKET',
  'S3_ACCESS_KEY',
  'S3_SECRET_KEY',
  'JWT_ISSUER',
  'JWT_AUDIENCE',
  'JWT_SECRET',
  'ENCRYPTION_KEY',
  'FX_PROVIDER',
  'REGULATORY_POLL_CRON',
  'JURISPRUDENCE_POLL_CRON',
  'LOG_LEVEL',
];

const BACKEND_OPTIONAL = [
  'DIRECT_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DEV_AUTH_BYPASS',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'OTEL_EXPORTER_OTLP_ENDPOINT',
];

const WEB_REQUIRED = [
  'NEXT_PUBLIC_API_BASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
];

function usage() {
  return `Usage:
  node scripts/audit-env-readiness.cjs [--strict] [--output artifacts/env-readiness.json]

Checks env examples, Render blueprint and Vercel docs for the variables required by API, worker and web. It never reads real secret values.
`;
}

function parseArgs(argv) {
  const options = { strict: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    if (arg === '--strict') {
      options.strict = true;
      continue;
    }
    const value = argv[index + 1];
    if (!arg.startsWith('--')) throw new Error(`Unexpected argument: ${arg}`);
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
    if (arg === '--output') options.output = value;
    else throw new Error(`Unknown option: ${arg}`);
    index += 1;
  }
  return options;
}

function read(filePath) {
  return readFileSync(filePath, 'utf8');
}

function parseEnvKeys(text) {
  return new Set(text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => line.slice(0, line.indexOf('=')).trim())
    .filter(Boolean));
}

function parseRenderServices(text) {
  const services = new Map();
  let current = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    const nameMatch = line.match(/^(?:-\s*)?name:\s*(.+)$/);
    if (nameMatch) {
      current = { name: nameMatch[1].trim(), keys: new Set() };
      services.set(current.name, current);
      continue;
    }
    const keyMatch = line.match(/^- key:\s*([A-Z0-9_]+)$/);
    if (keyMatch && current) current.keys.add(keyMatch[1]);
  }
  return services;
}

function missing(required, actual) {
  return required.filter((key) => !actual.has(key));
}

function makeCheck(name, missingKeys, details = {}) {
  return {
    name,
    status: missingKeys.length === 0 ? 'ok' : 'missing',
    missing: missingKeys,
    ...details,
  };
}

function textHasAll(text, keys) {
  return keys.filter((key) => !text.includes(key));
}

function writeSummary(outputPath, summary) {
  if (!outputPath) return null;
  const resolved = path.resolve(outputPath);
  mkdirSync(path.dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  return resolved;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(usage());
    return;
  }

  const rootEnv = parseEnvKeys(read('.env.example'));
  const webEnv = parseEnvKeys(read('apps/web/.env.example'));
  const render = parseRenderServices(read('render.yaml'));
  const vercelDocs = read('docs/VERCEL_ENV_SETUP.md');

  const apiService = render.get('tradelogic-api')?.keys ?? new Set();
  const workerService = render.get('tradelogic-worker')?.keys ?? new Set();
  const checks = [
    makeCheck('root-env-example-required', missing(BACKEND_REQUIRED, rootEnv), { expected: BACKEND_REQUIRED.length }),
    makeCheck('root-env-example-optional-placeholders', missing(BACKEND_OPTIONAL, rootEnv), { expected: BACKEND_OPTIONAL.length }),
    makeCheck('web-env-example-required', missing(WEB_REQUIRED, webEnv), { expected: WEB_REQUIRED.length }),
    makeCheck('render-api-env-vars', missing(BACKEND_REQUIRED, apiService), { service: 'tradelogic-api', expected: BACKEND_REQUIRED.length }),
    makeCheck('render-worker-env-vars', missing(BACKEND_REQUIRED, workerService), { service: 'tradelogic-worker', expected: BACKEND_REQUIRED.length }),
    makeCheck('vercel-docs-web-vars', textHasAll(vercelDocs, WEB_REQUIRED), { expected: WEB_REQUIRED.length }),
    makeCheck('vercel-docs-backend-vars', textHasAll(vercelDocs, BACKEND_REQUIRED), { expected: BACKEND_REQUIRED.length }),
  ];

  const ok = checks.every((check) => check.status === 'ok');
  const summary = {
    status: ok ? 'ok' : 'needs-env-docs',
    checkedAt: new Date().toISOString(),
    checks,
  };
  const output = writeSummary(options.output, summary);
  console.log(JSON.stringify({ ...summary, output: output ?? undefined }, null, 2));
  if (options.strict && !ok) process.exitCode = 1;
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
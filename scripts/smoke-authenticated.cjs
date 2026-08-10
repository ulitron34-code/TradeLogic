#!/usr/bin/env node
const { mkdir, writeFile } = require('node:fs/promises');
const path = require('node:path');

const DEFAULT_TIMEOUT_MS = 10_000;

function usage() {
  return `Usage:
  node scripts/smoke-authenticated.cjs --api-base-url https://api.example.com --token eyJ... [--timeout-ms 10000] [--output smoke-authenticated.json]

Environment fallback:
  API_BASE_URL or NEXT_PUBLIC_API_BASE_URL
  TRADELOGIC_ACCESS_TOKEN or SUPABASE_ACCESS_TOKEN
`;
}

function parseArgs(argv) {
  const options = { timeoutMs: DEFAULT_TIMEOUT_MS };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    const value = argv[index + 1];
    if (!arg.startsWith('--')) throw new Error(`Unexpected argument: ${arg}`);
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
    if (arg === '--api-base-url') options.apiBaseUrl = value;
    else if (arg === '--token') options.token = value;
    else if (arg === '--timeout-ms') options.timeoutMs = parseTimeout(value);
    else if (arg === '--output') options.output = value;
    else throw new Error(`Unknown option: ${arg}`);
    index += 1;
  }
  if (options.help) return options;

  const token = options.token ?? process.env.TRADELOGIC_ACCESS_TOKEN ?? process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) throw new Error('--token is required when TRADELOGIC_ACCESS_TOKEN or SUPABASE_ACCESS_TOKEN is not set');

  return {
    ...options,
    token,
    apiBaseUrl: normalizeBaseUrl(options.apiBaseUrl ?? process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL),
  };
}

function parseTimeout(value) {
  const timeoutMs = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 100 || String(timeoutMs) !== value) {
    throw new Error('--timeout-ms must be an integer greater than or equal to 100');
  }
  return timeoutMs;
}

function normalizeBaseUrl(value) {
  if (!value) throw new Error('--api-base-url is required when API_BASE_URL is not set');
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error(`Unsupported URL protocol: ${url.protocol}`);
  return url.toString().replace(/\/$/, '');
}

async function fetchJson(url, { token, timeoutMs }) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      throw new Error(`${url} did not return JSON`);
    }
  }
  return { url, status: response.status, ok: response.ok, body };
}

function assertOk(result) {
  if (!result.ok) throw new Error(`${result.url} returned HTTP ${result.status}: ${JSON.stringify(result.body)}`);
}

function assertArrayEnvelope(result, field = 'data') {
  assertOk(result);
  if (!Array.isArray(result.body?.[field])) throw new Error(`${result.url} did not return an array envelope at ${field}`);
}

function assertMe(result) {
  assertOk(result);
  if (!result.body?.email || !result.body?.organizationId || !result.body?.organizationName) {
    throw new Error(`${result.url} returned incomplete user context: ${JSON.stringify(result.body)}`);
  }
}

async function writeSummary(outputPath, summary) {
  if (!outputPath) return;
  const resolved = path.resolve(outputPath);
  await mkdir(path.dirname(resolved), { recursive: true });
  await writeFile(resolved, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
}

function summarizeArray(result, name) {
  return { name, url: result.url, status: result.status, ok: true, records: result.body.data.length };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(usage());
    return;
  }

  const requestOptions = { token: options.token, timeoutMs: options.timeoutMs };
  const checks = [];

  const me = await fetchJson(`${options.apiBaseUrl}/api/v1/me`, requestOptions);
  assertMe(me);
  checks.push({
    name: 'auth-context',
    url: me.url,
    status: me.status,
    ok: true,
    organizationId: me.body.organizationId,
    organizationName: me.body.organizationName,
    roles: Array.isArray(me.body.roles) ? me.body.roles : [],
  });

  const products = await fetchJson(`${options.apiBaseUrl}/api/v1/products`, requestOptions);
  assertArrayEnvelope(products);
  checks.push(summarizeArray(products, 'products-list'));

  const cases = await fetchJson(`${options.apiBaseUrl}/api/v1/classification-cases`, requestOptions);
  assertArrayEnvelope(cases);
  checks.push(summarizeArray(cases, 'cases-list'));

  const alerts = await fetchJson(`${options.apiBaseUrl}/api/v1/alerts`, requestOptions);
  assertArrayEnvelope(alerts);
  checks.push(summarizeArray(alerts, 'alerts-list'));

  const summary = { status: 'ok', checkedAt: new Date().toISOString(), checks };
  await writeSummary(options.output, summary);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

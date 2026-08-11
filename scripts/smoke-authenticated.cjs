#!/usr/bin/env node
const { mkdir, readFile, writeFile } = require('node:fs/promises');
const { setTimeout: delay } = require('node:timers/promises');
const path = require('node:path');

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_RETRIES = 2;
const MIN_DOSSIER_BYTES = 500;

function usage() {
  return `Usage:
  node scripts/smoke-authenticated.cjs --api-base-url https://api.example.com --token eyJ... [--targets artifacts/deployment-targets.json] [--timeout-ms 30000] [--retries 2] [--require-tariff-catalog] [--dossier-case-id uuid] [--output smoke-authenticated.json]

Environment fallback:
  API_BASE_URL or NEXT_PUBLIC_API_BASE_URL
  TRADELOGIC_ACCESS_TOKEN or SUPABASE_ACCESS_TOKEN
`;
}

function parseArgs(argv) {
  const options = { timeoutMs: DEFAULT_TIMEOUT_MS, retries: DEFAULT_RETRIES };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    if (arg === '--require-tariff-catalog') {
      options.requireTariffCatalog = true;
      continue;
    }
    const value = argv[index + 1];
    if (!arg.startsWith('--')) throw new Error(`Unexpected argument: ${arg}`);
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
    if (arg === '--api-base-url') options.apiBaseUrl = value;
    else if (arg === '--targets') options.targets = value;
    else if (arg === '--token') options.token = value;
    else if (arg === '--timeout-ms') options.timeoutMs = parseTimeout(value);
    else if (arg === '--retries') options.retries = parseRetries(value);
    else if (arg === '--dossier-case-id') options.dossierCaseId = value;
    else if (arg === '--output') options.output = value;
    else throw new Error(`Unknown option: ${arg}`);
    index += 1;
  }
  return options;
}

function parseTimeout(value) {
  const timeoutMs = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 100 || String(timeoutMs) !== value) {
    throw new Error('--timeout-ms must be an integer greater than or equal to 100');
  }
  return timeoutMs;
}

function parseRetries(value) {
  const retries = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(retries) || retries < 0 || String(retries) !== value) {
    throw new Error('--retries must be a non-negative integer');
  }
  return retries;
}

async function resolveDeploymentTargets(targetsPath) {
  if (!targetsPath) return {};
  const resolved = path.resolve(targetsPath);
  const payload = JSON.parse(await readFile(resolved, 'utf8'));
  if (payload.status && payload.status !== 'ok') throw new Error(`${resolved} status is not ok`);
  return { apiBaseUrl: payload.runtime?.apiBaseUrl };
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

async function fetchBinary(url, { token, timeoutMs }) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      Accept: 'application/pdf',
      Authorization: `Bearer ${token}`,
    },
  });
  const contentType = response.headers.get('content-type') ?? '';
  const contentDisposition = response.headers.get('content-disposition') ?? '';
  const bytes = new Uint8Array(await response.arrayBuffer());
  return { url, status: response.status, ok: response.ok, contentType, contentDisposition, bytes };
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

function assertTariffCatalogStatus(result) {
  assertOk(result);
  if (result.body?.status !== 'ok' || result.body?.expectedRows !== 20227 || result.body?.rows !== 20227) {
    throw new Error(`${result.url} did not prove a complete tariff catalog: ${JSON.stringify(result.body)}`);
  }
  if (!Array.isArray(result.body?.checks) || result.body.checks.some((check) => check.status && check.status !== 'ok')) {
    throw new Error(`${result.url} returned failing tariff catalog checks: ${JSON.stringify(result.body)}`);
  }
}

function assertDossierPdf(result) {
  if (!result.ok) throw new Error(`${result.url} returned HTTP ${result.status} while downloading dossier PDF`);
  if (!result.contentType.toLowerCase().includes('application/pdf')) {
    throw new Error(`${result.url} did not return application/pdf: ${result.contentType}`);
  }
  const header = String.fromCharCode(...result.bytes.slice(0, 4));
  if (header !== '%PDF') throw new Error(`${result.url} did not return a PDF header`);
  if (result.bytes.length < MIN_DOSSIER_BYTES) throw new Error(`${result.url} returned a suspiciously small PDF (${result.bytes.length} bytes)`);
}

async function withRetries(operation, retries) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;
      await delay(1000 * (attempt + 1));
    }
  }
  throw lastError;
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

  const token = options.token ?? process.env.TRADELOGIC_ACCESS_TOKEN ?? process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) throw new Error('--token is required when TRADELOGIC_ACCESS_TOKEN or SUPABASE_ACCESS_TOKEN is not set');
  const targets = await resolveDeploymentTargets(options.targets);
  const apiBaseUrl = normalizeBaseUrl(options.apiBaseUrl ?? targets.apiBaseUrl ?? process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL);

  const requestOptions = { token, timeoutMs: options.timeoutMs };
  const checks = [];

  const me = await withRetries(() => fetchJson(`${apiBaseUrl}/api/v1/me`, requestOptions), options.retries);
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

  const products = await withRetries(() => fetchJson(`${apiBaseUrl}/api/v1/products`, requestOptions), options.retries);
  assertArrayEnvelope(products);
  checks.push(summarizeArray(products, 'products-list'));

  const cases = await withRetries(() => fetchJson(`${apiBaseUrl}/api/v1/classification-cases`, requestOptions), options.retries);
  assertArrayEnvelope(cases);
  checks.push(summarizeArray(cases, 'cases-list'));

  const alerts = await withRetries(() => fetchJson(`${apiBaseUrl}/api/v1/alerts`, requestOptions), options.retries);
  assertArrayEnvelope(alerts);
  checks.push(summarizeArray(alerts, 'alerts-list'));

  if (options.requireTariffCatalog) {
    const tariffCatalog = await withRetries(() => fetchJson(`${apiBaseUrl}/api/v1/tariff-catalog/status`, requestOptions), options.retries);
    assertTariffCatalogStatus(tariffCatalog);
    checks.push({
      name: 'tariff-catalog-status',
      url: tariffCatalog.url,
      status: tariffCatalog.status,
      ok: true,
      rows: tariffCatalog.body.rows,
      expectedRows: tariffCatalog.body.expectedRows,
      sourceVersions: tariffCatalog.body.sourceVersions,
    });
  }

  if (options.dossierCaseId) {
    const dossier = await withRetries(() => fetchBinary(`${apiBaseUrl}/api/v1/classification-cases/${encodeURIComponent(options.dossierCaseId)}/dossier.pdf`, requestOptions), options.retries);
    assertDossierPdf(dossier);
    checks.push({
      name: 'dossier-pdf',
      url: dossier.url,
      status: dossier.status,
      ok: true,
      caseId: options.dossierCaseId,
      bytes: dossier.bytes.length,
      contentType: dossier.contentType,
      contentDisposition: dossier.contentDisposition,
    });
  }

  const summary = { status: 'ok', checkedAt: new Date().toISOString(), checks };
  await writeSummary(options.output, summary);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

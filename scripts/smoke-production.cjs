#!/usr/bin/env node
const { mkdir, readFile, writeFile } = require('node:fs/promises');
const { setTimeout: delay } = require('node:timers/promises');
const path = require('node:path');

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_RETRIES = 2;

function usage() {
  return `Usage:
  node scripts/smoke-production.cjs --api-base-url https://api.example.com [--web-base-url https://app.example.com] [--targets artifacts/deployment-targets.json] [--timeout-ms 30000] [--retries 2] [--output smoke-result.json]

Environment fallback:
  API_BASE_URL or NEXT_PUBLIC_API_BASE_URL
  APP_BASE_URL or NEXT_PUBLIC_APP_BASE_URL
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
    const value = argv[index + 1];
    if (!arg.startsWith('--')) throw new Error(`Unexpected argument: ${arg}`);
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
    if (arg === '--api-base-url') options.apiBaseUrl = value;
    else if (arg === '--web-base-url') options.webBaseUrl = value;
    else if (arg === '--targets') options.targets = value;
    else if (arg === '--timeout-ms') options.timeoutMs = parseTimeout(value);
    else if (arg === '--retries') options.retries = parseRetries(value);
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
  return {
    apiBaseUrl: payload.runtime?.apiBaseUrl,
    webBaseUrl: payload.runtime?.webBaseUrl,
  };
}

function normalizeBaseUrl(value, { optional = false } = {}) {
  if (!value) {
    if (optional) return undefined;
    throw new Error('--api-base-url is required when API_BASE_URL is not set');
  }
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error(`Unsupported URL protocol: ${url.protocol}`);
  return url.toString().replace(/\/$/, '');
}

async function fetchJson(url, timeoutMs) {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), headers: { Accept: 'application/json' } });
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

async function fetchPage(url, timeoutMs) {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), headers: { Accept: 'text/html,*/*' } });
  const text = await response.text();
  return { url, status: response.status, ok: response.status < 500, bytes: Buffer.byteLength(text) };
}

function assertHealth(result) {
  if (!result.ok) throw new Error(`${result.url} returned HTTP ${result.status}`);
  if (result.body?.status !== 'ok') throw new Error(`${result.url} returned unexpected status: ${JSON.stringify(result.body)}`);
}

function assertReady(result) {
  if (!result.ok) throw new Error(`${result.url} returned HTTP ${result.status}`);
  if (result.body?.status !== 'ready' || result.body?.database !== 'ok') {
    throw new Error(`${result.url} returned unexpected readiness: ${JSON.stringify(result.body)}`);
  }
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

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(usage());
    return;
  }

  const targets = await resolveDeploymentTargets(options.targets);
  options.apiBaseUrl = normalizeBaseUrl(options.apiBaseUrl ?? targets.apiBaseUrl ?? process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL);
  options.webBaseUrl = normalizeBaseUrl(options.webBaseUrl ?? targets.webBaseUrl ?? process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_BASE_URL, { optional: true });

  const checks = [];
  const health = await withRetries(() => fetchJson(`${options.apiBaseUrl}/health`, options.timeoutMs), options.retries);
  assertHealth(health);
  checks.push({ name: 'api-health', url: health.url, status: health.status, ok: true });

  const ready = await withRetries(() => fetchJson(`${options.apiBaseUrl}/ready`, options.timeoutMs), options.retries);
  assertReady(ready);
  checks.push({ name: 'api-ready', url: ready.url, status: ready.status, ok: true, database: ready.body.database });

  if (options.webBaseUrl) {
    const web = await withRetries(() => fetchPage(options.webBaseUrl, options.timeoutMs), options.retries);
    if (!web.ok) throw new Error(`${web.url} returned HTTP ${web.status}`);
    checks.push({ name: 'web-root', url: web.url, status: web.status, ok: true, bytes: web.bytes });
  }

  const summary = { status: 'ok', checkedAt: new Date().toISOString(), checks };
  await writeSummary(options.output, summary);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

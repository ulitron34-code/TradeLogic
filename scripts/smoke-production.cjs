#!/usr/bin/env node
const { mkdir, writeFile } = require('node:fs/promises');
const path = require('node:path');

const DEFAULT_TIMEOUT_MS = 10_000;

function usage() {
  return `Usage:
  node scripts/smoke-production.cjs --api-base-url https://api.example.com [--web-base-url https://app.example.com] [--timeout-ms 10000] [--output smoke-result.json]

Environment fallback:
  API_BASE_URL or NEXT_PUBLIC_API_BASE_URL
  APP_BASE_URL or NEXT_PUBLIC_APP_BASE_URL
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
    else if (arg === '--web-base-url') options.webBaseUrl = value;
    else if (arg === '--timeout-ms') options.timeoutMs = parseTimeout(value);
    else if (arg === '--output') options.output = value;
    else throw new Error(`Unknown option: ${arg}`);
    index += 1;
  }
  if (options.help) return options;

  return {
    ...options,
    apiBaseUrl: normalizeBaseUrl(options.apiBaseUrl ?? process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL),
    webBaseUrl: normalizeBaseUrl(options.webBaseUrl ?? process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_BASE_URL, { optional: true }),
  };
}

function parseTimeout(value) {
  const timeoutMs = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 100 || String(timeoutMs) !== value) {
    throw new Error('--timeout-ms must be an integer greater than or equal to 100');
  }
  return timeoutMs;
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

  const checks = [];
  const health = await fetchJson(`${options.apiBaseUrl}/health`, options.timeoutMs);
  assertHealth(health);
  checks.push({ name: 'api-health', url: health.url, status: health.status, ok: true });

  const ready = await fetchJson(`${options.apiBaseUrl}/ready`, options.timeoutMs);
  assertReady(ready);
  checks.push({ name: 'api-ready', url: ready.url, status: ready.status, ok: true, database: ready.body.database });

  if (options.webBaseUrl) {
    const web = await fetchPage(options.webBaseUrl, options.timeoutMs);
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

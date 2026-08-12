#!/usr/bin/env node
const { mkdir, readFile, writeFile } = require('node:fs/promises');
const { setTimeout: delay } = require('node:timers/promises');
const path = require('node:path');

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_RETRIES = 2;

function usage() {
  return `Usage:
  node scripts/smoke-production.cjs --api-base-url https://api.example.com [--web-base-url https://app.example.com] [--targets artifacts/deployment-targets.json] [--expected-commit git-sha] [--timeout-ms 30000] [--retries 2] [--output smoke-result.json]

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
    else if (arg === '--expected-commit') options.expectedCommit = value;
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
    expectedCommit: payload.commitSha,
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
      return { url, status: response.status, ok: false, body: null, error: 'response did not return JSON' };
    }
  }
  return { url, status: response.status, ok: response.ok, body };
}

async function fetchPage(url, timeoutMs) {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), headers: { Accept: 'text/html,*/*' } });
  const text = await response.text();
  const title = text.match(/<title>([^<]*)<\/title>/i)?.[1] ?? null;
  return {
    url,
    status: response.status,
    ok: response.status < 500,
    bytes: Buffer.byteLength(text),
    title,
    bodyPreview: text.slice(0, 2000),
  };
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

async function runCheck(name, url, operation, validate) {
  try {
    const result = await operation();
    const validation = validate(result);
    return { name, url: result.url ?? url, status: result.status, ok: true, ...validation };
  } catch (error) {
    return { name, url, ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function validateHealth(result) {
  if (!result.ok) throw new Error(`${result.url} returned HTTP ${result.status}`);
  if (result.body?.status !== 'ok') throw new Error(`${result.url} returned unexpected status: ${JSON.stringify(result.body)}`);
  return {};
}

function validateReady(result) {
  if (!result.ok) throw new Error(`${result.url} returned HTTP ${result.status}`);
  if (result.body?.status !== 'ready' || result.body?.database !== 'ok') {
    throw new Error(`${result.url} returned unexpected readiness: ${JSON.stringify(result.body)}`);
  }
  return { database: result.body.database };
}

function validateVersion(result, expectedCommit) {
  if (!result.ok) throw new Error(`${result.url} returned HTTP ${result.status}`);
  if (result.body?.status !== 'ok' || result.body?.service !== 'api') {
    throw new Error(`${result.url} returned unexpected version payload: ${JSON.stringify(result.body)}`);
  }
  const runningCommit = result.body?.commitSha;
  if (!runningCommit) throw new Error(`${result.url} did not report commitSha`);
  if (!runningCommit.startsWith(expectedCommit) && !expectedCommit.startsWith(runningCommit)) {
    throw new Error(`${result.url} is running commit ${runningCommit}, expected ${expectedCommit}`);
  }
  return { commitSha: runningCommit };
}

function validateWeb(result) {
  if (!result.ok) throw new Error(`${result.url} returned HTTP ${result.status}`);
  const preview = String(result.bodyPreview ?? '');
  const title = String(result.title ?? '');
  const vercelProtected = /login\s*[–-]\s*vercel/i.test(title) || (preview.includes('login?next=') && /vercel/i.test(preview));
  if (vercelProtected) throw new Error(`${result.url} is showing Vercel access protection instead of the TradeLogic app`);
  const tradeLogicMarker = /tradelogic|trade logic|inteligencia aduanera|clasificaci[oó]n/i.test(`${title} ${preview}`);
  if (!tradeLogicMarker) throw new Error(`${result.url} did not include a TradeLogic application marker`);
  return { bytes: result.bytes, title: result.title };
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
  options.expectedCommit = options.expectedCommit ?? targets.expectedCommit;

  const checks = [];
  const healthUrl = `${options.apiBaseUrl}/health`;
  checks.push(await runCheck('api-health', healthUrl, () => withRetries(() => fetchJson(healthUrl, options.timeoutMs), options.retries), validateHealth));

  const readyUrl = `${options.apiBaseUrl}/ready`;
  checks.push(await runCheck('api-ready', readyUrl, () => withRetries(() => fetchJson(readyUrl, options.timeoutMs), options.retries), validateReady));

  if (options.expectedCommit) {
    const versionUrl = `${options.apiBaseUrl}/version`;
    checks.push(await runCheck('api-version', versionUrl, () => withRetries(() => fetchJson(versionUrl, options.timeoutMs), options.retries), (result) => validateVersion(result, options.expectedCommit)));
  }

  if (options.webBaseUrl) {
    checks.push(await runCheck('web-root', options.webBaseUrl, () => withRetries(() => fetchPage(options.webBaseUrl, options.timeoutMs), options.retries), validateWeb));
  }

  const failed = checks.filter((check) => check.ok !== true);
  const summary = {
    status: failed.length === 0 ? 'ok' : 'failed',
    checkedAt: new Date().toISOString(),
    checks,
    ...(failed.length > 0 ? { error: failed[0].error, failedChecks: failed.map((check) => check.name) } : {}),
  };
  await writeSummary(options.output, summary);
  console.log(JSON.stringify(summary, null, 2));
  if (failed.length > 0) process.exitCode = 1;
}

main().catch(async (error) => {
  const summary = {
    status: 'failed',
    checkedAt: new Date().toISOString(),
    checks: [],
    error: error instanceof Error ? error.message : String(error),
  };
  try {
    const output = process.argv.includes('--output') ? process.argv[process.argv.indexOf('--output') + 1] : null;
    await writeSummary(output, summary);
  } catch {}
  console.error(summary.error);
  process.exitCode = 1;
});

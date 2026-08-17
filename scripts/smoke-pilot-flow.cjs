#!/usr/bin/env node

const { mkdir, writeFile } = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_POLL_MS = 5_000;
const TERMINAL_WORKER_STATES = new Set(['NEEDS_REVIEW', 'NEEDS_INFORMATION', 'APPROVED', 'REJECTED']);
const REVIEW_DECISIONS = new Set(['APPROVED', 'CHANGES_REQUESTED', 'REJECTED']);

function usage() {
  return `Usage:
  node scripts/smoke-pilot-flow.cjs --api-base-url https://api.example.com --token eyJ... --case-id uuid --decision APPROVED --notes "pilot review" [--output artifacts/smoke-pilot-flow.json]

The case must already belong to the authenticated organization. This command
does not create users or invent evidence. It waits for the worker, requests a
review, records the explicitly supplied decision, and verifies the dossier PDF.
`;
}

function parseArgs(argv) {
  const options = { timeoutMs: DEFAULT_TIMEOUT_MS, pollMs: DEFAULT_POLL_MS };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    if (!arg.startsWith('--')) throw new Error(`Unexpected argument: ${arg}`);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
    if (arg === '--api-base-url') options.apiBaseUrl = value;
    else if (arg === '--token') options.token = value;
    else if (arg === '--case-id') options.caseId = value;
    else if (arg === '--decision') options.decision = value;
    else if (arg === '--notes') options.notes = value;
    else if (arg === '--timeout-ms') options.timeoutMs = integer(value, arg, 100);
    else if (arg === '--poll-ms') options.pollMs = integer(value, arg, 250);
    else if (arg === '--output') options.output = value;
    else throw new Error(`Unknown option: ${arg}`);
    index += 1;
  }
  return options;
}

function integer(value, argument, minimum) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || String(parsed) !== value) {
    throw new Error(`${argument} must be an integer greater than or equal to ${minimum}`);
  }
  return parsed;
}

function normalizeBaseUrl(value) {
  if (!value) throw new Error('--api-base-url is required');
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error(`Unsupported URL protocol: ${url.protocol}`);
  return url.toString().replace(/\/$/, '');
}

function requestOptions(token) {
  return {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };
}

async function fetchJson(url, token, options = {}) {
  const response = await fetch(url, {
    ...requestOptions(token),
    ...options,
    signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
  });
  const text = await response.text();
  let body = null;
  if (text) {
    try { body = JSON.parse(text); } catch { throw new Error(`${url} did not return JSON`); }
  }
  return { url, status: response.status, ok: response.ok, body };
}

async function fetchPdf(url, token, timeoutMs) {
  const response = await fetch(url, {
    ...requestOptions(token),
    headers: { ...requestOptions(token).headers, Accept: 'application/pdf' },
    signal: AbortSignal.timeout(timeoutMs),
  });
  const bytes = new Uint8Array(await response.arrayBuffer());
  return {
    url,
    status: response.status,
    ok: response.ok,
    contentType: response.headers.get('content-type') ?? '',
    bytes,
  };
}

function assertOk(result) {
  if (!result.ok) throw new Error(`${result.url} returned HTTP ${result.status}: ${JSON.stringify(result.body)}`);
}

async function waitForWorkerCase(apiBaseUrl, caseId, token, timeoutMs, pollMs) {
  const startedAt = Date.now();
  let lastCase;
  while (Date.now() - startedAt <= timeoutMs) {
    const result = await fetchJson(`${apiBaseUrl}/api/v1/classification-cases/${encodeURIComponent(caseId)}`, token, { timeoutMs });
    assertOk(result);
    lastCase = result.body;
    if (TERMINAL_WORKER_STATES.has(lastCase?.status)) return lastCase;
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
  throw new Error(`Worker did not reach a reviewable state within ${timeoutMs} ms; last status was ${lastCase?.status ?? 'unknown'}`);
}

async function writeSummary(output, summary) {
  if (!output) return;
  const resolved = path.resolve(output);
  await mkdir(path.dirname(resolved), { recursive: true });
  await writeFile(resolved, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) { process.stdout.write(usage()); return; }
  const token = options.token ?? process.env.TRADELOGIC_ACCESS_TOKEN ?? process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) throw new Error('--token is required when TRADELOGIC_ACCESS_TOKEN or SUPABASE_ACCESS_TOKEN is not set');
  if (!options.caseId) throw new Error('--case-id is required; use a real case from the pilot organization');
  if (!options.decision || !REVIEW_DECISIONS.has(options.decision)) throw new Error('--decision must be APPROVED, CHANGES_REQUESTED, or REJECTED');

  const apiBaseUrl = normalizeBaseUrl(options.apiBaseUrl ?? process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL);
  const checks = [];
  const me = await fetchJson(`${apiBaseUrl}/api/v1/me`, token, { timeoutMs: options.timeoutMs });
  assertOk(me);
  if (!me.body?.organizationId) throw new Error(`${me.url} did not return an organization context`);
  checks.push({ name: 'auth-context', status: me.status, ok: true, organizationId: me.body.organizationId });

  let current = await fetchJson(`${apiBaseUrl}/api/v1/classification-cases/${encodeURIComponent(options.caseId)}`, token, { timeoutMs: options.timeoutMs });
  assertOk(current);
  if (!current.body?.product) throw new Error(`${current.url} did not return a product for the case`);
  if (!TERMINAL_WORKER_STATES.has(current.body.status)) current.body = await waitForWorkerCase(apiBaseUrl, options.caseId, token, options.timeoutMs, options.pollMs);
  checks.push({ name: 'worker-result', status: 200, ok: true, caseId: options.caseId, caseStatus: current.body.status, candidates: Array.isArray(current.body.candidates) ? current.body.candidates.length : 0 });
  if (current.body.status !== 'NEEDS_REVIEW') throw new Error(`Case ${options.caseId} reached ${current.body.status}; a human-reviewable case is required before recording a decision`);

  const reviewRequest = await fetchJson(`${apiBaseUrl}/api/v1/classification-cases/${encodeURIComponent(options.caseId)}/request-review`, token, {
    method: 'POST',
    timeoutMs: options.timeoutMs,
    headers: { ...requestOptions(token).headers, 'content-type': 'application/json' },
    body: JSON.stringify({ note: options.notes ?? null }),
  });
  assertOk(reviewRequest);
  checks.push({ name: 'review-request', status: reviewRequest.status, ok: true, reviewRequestId: reviewRequest.body?.id });

  const review = await fetchJson(`${apiBaseUrl}/api/v1/classification-cases/${encodeURIComponent(options.caseId)}/review`, token, {
    method: 'POST',
    timeoutMs: options.timeoutMs,
    headers: { ...requestOptions(token).headers, 'content-type': 'application/json', 'idempotency-key': randomUUID() },
    body: JSON.stringify({ decision: options.decision, notes: options.notes ?? undefined }),
  });
  assertOk(review);
  checks.push({ name: 'human-review', status: review.status, ok: true, decision: options.decision, caseStatus: review.body?.status });

  const dossier = await fetchPdf(`${apiBaseUrl}/api/v1/classification-cases/${encodeURIComponent(options.caseId)}/dossier.pdf`, token, options.timeoutMs);
  if (!dossier.ok || !dossier.contentType.toLowerCase().includes('application/pdf') || String.fromCharCode(...dossier.bytes.slice(0, 4)) !== '%PDF' || dossier.bytes.length < 500) {
    throw new Error(`${dossier.url} did not return a valid dossier PDF (HTTP ${dossier.status}, ${dossier.contentType}, ${dossier.bytes.length} bytes)`);
  }
  checks.push({ name: 'dossier-pdf', status: dossier.status, ok: true, caseId: options.caseId, bytes: dossier.bytes.length, contentType: dossier.contentType });

  const summary = { status: 'ok', checkedAt: new Date().toISOString(), caseId: options.caseId, decision: options.decision, checks };
  await writeSummary(options.output, summary);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});


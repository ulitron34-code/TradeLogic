#!/usr/bin/env node
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn, spawnSync } = require('node:child_process');
const { mkdtempSync, readFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const http = require('node:http');

function runNode(args, options = {}) {
  return spawnSync(process.execPath, args, {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8',
    ...options,
  });
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function runNodeAsync(args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, {
      cwd: path.resolve(__dirname, '..'),
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (status) => resolve({ status, stdout, stderr }));
    child.on('error', (error) => resolve({ status: null, stdout, stderr, error }));
  });
}
function createServer(handler) {
  const server = http.createServer(handler);
  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${address.port}` });
    });
  });
}

test('smoke-production writes failed evidence with partial checks', async (t) => {
  const { server, baseUrl } = await createServer((request, response) => {
    if (request.url === '/health') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ status: 'ok', service: 'api' }));
      return;
    }
    if (request.url === '/ready') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ status: 'ready', service: 'api', database: 'ok' }));
      return;
    }
    if (request.url === '/version') {
      response.writeHead(404, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ message: 'Route GET:/version not found', error: 'Not Found', statusCode: 404 }));
      return;
    }
    response.writeHead(200, { 'content-type': 'text/html' });
    response.end('<!doctype html><title>TradeLogic</title>');
  });
  t.after(() => server.close());

  const dir = mkdtempSync(path.join(tmpdir(), 'tradelogic-smoke-'));
  const output = path.join(dir, 'smoke-production.json');
  const result = await runNodeAsync([
    'scripts/smoke-production.cjs',
    '--api-base-url', baseUrl,
    '--web-base-url', baseUrl,
    '--expected-commit', 'abc123',
    '--timeout-ms', '1000',
    '--retries', '0',
    '--output', output,
  ]);

  assert.equal(result.status, 1, result.stdout || result.stderr);
  const summary = readJson(output);
  assert.equal(summary.status, 'failed');
  assert.deepEqual(summary.failedChecks, ['api-version']);
  assert.equal(summary.checks.find((check) => check.name === 'api-health').ok, true);
  assert.equal(summary.checks.find((check) => check.name === 'api-ready').database, 'ok');
  assert.equal(summary.checks.find((check) => check.name === 'api-version').ok, false);
  assert.equal(summary.checks.find((check) => check.name === 'web-root').ok, true);
});
test('diagnose-deployment explains healthy API with missing version route', async (t) => {
  const { server, baseUrl } = await createServer((request, response) => {
    if (request.url === '/health') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ status: 'ok', service: 'api' }));
      return;
    }
    if (request.url === '/ready') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ status: 'ready', service: 'api', database: 'ok' }));
      return;
    }
    if (request.url === '/version') {
      response.writeHead(404, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ message: 'Route GET:/version not found', error: 'Not Found', statusCode: 404 }));
      return;
    }
    response.writeHead(200, { 'content-type': 'text/html' });
    response.end('<!doctype html><title>TradeLogic</title>');
  });
  t.after(() => server.close());

  const dir = mkdtempSync(path.join(tmpdir(), 'tradelogic-diagnosis-'));
  const output = path.join(dir, 'deployment-diagnosis.json');
  const result = await runNodeAsync([
    'scripts/diagnose-deployment.cjs',
    '--api-base-url', baseUrl,
    '--web-base-url', baseUrl,
    '--expected-commit', 'abc123',
    '--timeout-ms', '1000',
    '--output', output,
  ]);

  assert.equal(result.status, 1, result.stdout || result.stderr);
  const summary = readJson(output);
  assert.equal(summary.status, 'degraded');
  assert.equal(summary.code, 'render_serving_previous_api_build');
  assert.match(summary.message, /older API build|latest deploy failed/);
  assert.equal(summary.checks.find((check) => check.name === 'api-ready').body.database, 'ok');
  assert.equal(summary.checks.find((check) => check.name === 'api-version').status, 404);
  assert.ok(summary.nextActions.some((action) => action.includes('Start Command')));
});

test('manual evidence validators fail pending templates without recursion', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'tradelogic-manual-'));
  const manualPath = path.join(dir, 'manual-pilot-run.json');
  const template = runNode(['scripts/write-pilot-manual-evidence-template.cjs', '--output', manualPath]);
  assert.equal(template.status, 0, template.stderr);

  const auditOutput = path.join(dir, 'pilot-readiness.json');
  const audit = runNode(['scripts/audit-pilot-readiness.cjs', '--artifacts-dir', dir, '--output', auditOutput]);
  assert.equal(audit.status, 0, audit.stderr);
  const readiness = readJson(auditOutput);
  const manual = readiness.evidence.find((item) => item.file === 'manual-pilot-run.json');
  assert.equal(manual.status, 'invalid');
  assert.match(manual.error, /status is not ok|missing concrete evidence|missing tester/);

  const verify = runNode(['scripts/verify-pilot-evidence.cjs', '--artifacts-dir', dir]);
  assert.equal(verify.status, 1);
  assert.doesNotMatch(verify.stderr, /Maximum call stack size exceeded/);
});

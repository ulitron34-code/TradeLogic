#!/usr/bin/env node
const { spawnSync } = require('node:child_process');
const { mkdirSync, readFileSync, writeFileSync } = require('node:fs');
const path = require('node:path');

const DEFAULT_ARTIFACTS_DIR = 'artifacts';
const DEFAULT_API_BASE_URL = 'https://tradelogic-api.onrender.com';
const DEFAULT_WEB_BASE_URL = 'https://tradelogic-git-main-ulitron34-codes-projects.vercel.app';

function usage() {
  return `Usage:
  node scripts/prepare-pilot-evidence.cjs [--artifacts-dir artifacts] [--api-base-url https://...] [--web-base-url https://...] [--timeout-ms 30000] [--retries 2] [--skip-smoke]

Prepares non-secret pilot evidence: deployment targets, environment readiness, tariff import input, optional public smoke, deployment diagnosis, and pilot readiness summary.
Authenticated smoke, Supabase tariff verification and manual browser evidence still require a real pilot session.
`;
}

function parseArgs(argv) {
  const options = {
    artifactsDir: DEFAULT_ARTIFACTS_DIR,
    apiBaseUrl: DEFAULT_API_BASE_URL,
    webBaseUrl: DEFAULT_WEB_BASE_URL,
    timeoutMs: '30000',
    retries: '2',
    skipSmoke: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    if (arg === '--skip-smoke') {
      options.skipSmoke = true;
      continue;
    }
    const value = argv[index + 1];
    if (!arg.startsWith('--')) throw new Error(`Unexpected argument: ${arg}`);
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
    if (arg === '--artifacts-dir') options.artifactsDir = value;
    else if (arg === '--api-base-url') options.apiBaseUrl = normalizeUrl(value, arg);
    else if (arg === '--web-base-url') options.webBaseUrl = normalizeUrl(value, arg);
    else if (arg === '--timeout-ms') options.timeoutMs = parseNonNegativeInteger(arg, value, 100);
    else if (arg === '--retries') options.retries = parseNonNegativeInteger(arg, value, 0);
    else throw new Error(`Unknown option: ${arg}`);
    index += 1;
  }
  return options;
}

function parseNonNegativeInteger(name, value, minimum) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || String(parsed) !== value) {
    throw new Error(`${name} must be an integer greater than or equal to ${minimum}`);
  }
  return value;
}

function normalizeUrl(value, name) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error(`${name} must be http or https`);
  return url.toString().replace(/\/$/, '');
}

function artifactPath(artifactsDir, fileName) {
  return path.join(artifactsDir, fileName);
}

function runStep(name, command, args, { allowFailure = false, failureStatus = 'failed' } = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: false });
  if (result.error) {
    if (!allowFailure) throw result.error;
    return { name, status: failureStatus, error: result.error.message };
  }
  if (result.status !== 0) {
    const step = { name, status: failureStatus, exitCode: result.status };
    if (!allowFailure) {
      const error = new Error(`${name} failed with exit code ${result.status}`);
      Object.assign(error, { step });
      throw error;
    }
    return step;
  }
  return { name, status: 'ok' };
}

function readJsonIfExists(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}
function writeJson(outputPath, payload) {
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(usage());
    return;
  }

  const artifactsDir = path.resolve(options.artifactsDir);
  mkdirSync(artifactsDir, { recursive: true });

  const generated = [];
  const node = process.execPath;
  generated.push(runStep('deployment-targets', node, [
    'scripts/record-deployment-targets.cjs',
    '--api-base-url', options.apiBaseUrl,
    '--web-base-url', options.webBaseUrl,
    '--output', artifactPath(artifactsDir, 'deployment-targets.json'),
  ]));
  generated.push(runStep('env-readiness', node, [
    'scripts/audit-env-readiness.cjs',
    '--strict',
    '--output', artifactPath(artifactsDir, 'env-readiness.json'),
  ]));
  generated.push(runStep('tariff-import-input', node, [
    'scripts/verify-tariff-import-input.cjs',
    '--output', artifactPath(artifactsDir, 'tariff-import-input.json'),
  ]));

  if (!options.skipSmoke) {
    const smoke = runStep('smoke-production', node, [
      'scripts/smoke-production.cjs',
      '--targets', artifactPath(artifactsDir, 'deployment-targets.json'),
      '--timeout-ms', options.timeoutMs,
      '--retries', options.retries,
      '--output', artifactPath(artifactsDir, 'smoke-production.json'),
    ], { allowFailure: true });
    generated.push(smoke);

    if (smoke.status !== 'ok') {
      generated.push(runStep('deployment-diagnosis', node, [
        'scripts/diagnose-deployment.cjs',
        '--targets', artifactPath(artifactsDir, 'deployment-targets.json'),
        '--timeout-ms', options.timeoutMs,
        '--output', artifactPath(artifactsDir, 'deployment-diagnosis.json'),
      ], { allowFailure: true, failureStatus: 'reported' }));
    }
  }

  generated.push(runStep('pilot-readiness', node, [
    'scripts/audit-pilot-readiness.cjs',
    '--artifacts-dir', artifactsDir,
    '--output', artifactPath(artifactsDir, 'pilot-readiness.json'),
  ]));

  const failed = generated.filter((step) => step.status !== 'ok');
  const readiness = readJsonIfExists(artifactPath(artifactsDir, 'pilot-readiness.json'));
  const summary = {
    status: failed.length === 0 ? 'ok' : 'needs-attention',
    checkedAt: new Date().toISOString(),
    artifactsDir,
    generated,
    next: failed.length > 0
      ? readiness?.next ?? 'Review failed generated steps and artifacts/deployment-diagnosis.json before rerunning smoke or closing pilot evidence.'
      : readiness?.next ?? 'Complete Supabase tariff verification, authenticated smoke with a pilot JWT, and manual-pilot-run.json before verify:pilot-evidence.',
  };
  const summaryPath = artifactPath(artifactsDir, 'pilot-evidence-prep.json');
  writeJson(summaryPath, summary);
  console.log(JSON.stringify({ ...summary, output: summaryPath }, null, 2));
  if (failed.length > 0) process.exitCode = 1;
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}

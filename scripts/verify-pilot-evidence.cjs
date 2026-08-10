#!/usr/bin/env node
const { existsSync, readFileSync } = require('node:fs');
const path = require('node:path');

const DEFAULT_ARTIFACTS_DIR = 'artifacts';

function usage() {
  return `Usage:
  node scripts/verify-pilot-evidence.cjs [--artifacts-dir artifacts]

Required files:
  deployment-targets.json
  smoke-production.json
  smoke-authenticated.json
  tariff-catalog-verification.json
`;
}

function parseArgs(argv) {
  const options = { artifactsDir: DEFAULT_ARTIFACTS_DIR };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    const value = argv[index + 1];
    if (!arg.startsWith('--')) throw new Error(`Unexpected argument: ${arg}`);
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
    if (arg === '--artifacts-dir') options.artifactsDir = value;
    else throw new Error(`Unknown option: ${arg}`);
    index += 1;
  }
  return options;
}

function readJson(filePath) {
  if (!existsSync(filePath)) throw new Error(`Missing evidence file: ${filePath}`);
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function requireSmoke(summary, filePath, expectedChecks) {
  if (summary.status !== 'ok') throw new Error(`${filePath} status is not ok`);
  if (!summary.checkedAt) throw new Error(`${filePath} missing checkedAt`);
  if (!Array.isArray(summary.checks)) throw new Error(`${filePath} missing checks array`);
  for (const checkName of expectedChecks) {
    const check = summary.checks.find((item) => item.name === checkName);
    if (!check) throw new Error(`${filePath} missing check ${checkName}`);
    if (check.ok !== true) throw new Error(`${filePath} check ${checkName} is not ok`);
  }
}

function requireDeploymentTargets(summary, filePath) {
  if (summary.status !== 'ok') throw new Error(`${filePath} status is not ok`);
  if (!summary.commitSha) throw new Error(`${filePath} missing commitSha`);
  if (!summary.runtime?.apiBaseUrl || !summary.runtime?.webBaseUrl) {
    throw new Error(`${filePath} must include apiBaseUrl and webBaseUrl`);
  }
  for (const [name, value] of Object.entries(summary.runtime)) {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error(`${filePath} runtime ${name} must be http or https`);
  }
}

function requireTariffVerification(summary, filePath) {
  if (summary.status !== 'ok') throw new Error(`${filePath} status is not ok`);
  if (summary.expectedRows !== 20227 && summary.rows !== 20227) {
    throw new Error(`${filePath} must prove 20227 imported tariff rows`);
  }
  if (Array.isArray(summary.checks)) {
    for (const check of summary.checks) {
      if (check.status && check.status !== 'ok') throw new Error(`${filePath} check ${check.name ?? 'unknown'} is not ok`);
    }
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(usage());
    return;
  }

  const artifactsDir = path.resolve(options.artifactsDir);
  const targetsPath = path.join(artifactsDir, 'deployment-targets.json');
  const productionPath = path.join(artifactsDir, 'smoke-production.json');
  const authenticatedPath = path.join(artifactsDir, 'smoke-authenticated.json');
  const tariffPath = path.join(artifactsDir, 'tariff-catalog-verification.json');

  const targets = readJson(targetsPath);
  requireDeploymentTargets(targets, targetsPath);

  const production = readJson(productionPath);
  requireSmoke(production, productionPath, ['api-health', 'api-ready', 'web-root']);

  const authenticated = readJson(authenticatedPath);
  requireSmoke(authenticated, authenticatedPath, ['auth-context', 'products-list', 'cases-list', 'alerts-list']);

  const tariff = readJson(tariffPath);
  requireTariffVerification(tariff, tariffPath);

  console.log(JSON.stringify({
    status: 'ok',
    artifactsDir,
    checkedAt: new Date().toISOString(),
    files: [targetsPath, productionPath, authenticatedPath, tariffPath],
  }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}

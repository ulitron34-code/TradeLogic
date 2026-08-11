#!/usr/bin/env node
const { existsSync, readFileSync } = require('node:fs');
const path = require('node:path');

const DEFAULT_ARTIFACTS_DIR = 'artifacts';
const REQUIRED_MANUAL_STEPS = [
  'login',
  'create-product',
  'upload-evidence',
  'start-classification-case',
  'submit-analysis',
  'review-decision',
  'download-dossier-pdf',
];

function usage() {
  return `Usage:
  node scripts/verify-pilot-evidence.cjs [--artifacts-dir artifacts]

Required files:
  deployment-targets.json
  smoke-production.json
  smoke-authenticated.json
  tariff-import-input.json
  tariff-catalog-verification.json
  manual-pilot-run.json
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

function requireIsoDate(value, field, filePath) {
  if (!value || Number.isNaN(Date.parse(value))) throw new Error(`${filePath} missing valid ${field}`);
}

function requireSmoke(summary, filePath, expectedChecks) {
  if (summary.status !== 'ok') throw new Error(`${filePath} status is not ok`);
  requireIsoDate(summary.checkedAt, 'checkedAt', filePath);
  if (!Array.isArray(summary.checks)) throw new Error(`${filePath} missing checks array`);
  for (const checkName of expectedChecks) {
    const check = summary.checks.find((item) => item.name === checkName);
    if (!check) throw new Error(`${filePath} missing check ${checkName}`);
    if (check.ok !== true) throw new Error(`${filePath} check ${checkName} is not ok`);
  }
}

function requireDossierSmoke(summary, filePath, caseId) {
  const check = summary.checks.find((item) => item.name === 'dossier-pdf');
  if (!check) throw new Error(`${filePath} missing check dossier-pdf for manual case ${caseId}`);
  if (check.ok !== true) throw new Error(`${filePath} check dossier-pdf is not ok`);
  if (check.caseId !== caseId) throw new Error(`${filePath} dossier-pdf caseId ${check.caseId ?? 'missing'} does not match manual case ${caseId}`);
  if (!Number.isSafeInteger(check.bytes) || check.bytes < 500) throw new Error(`${filePath} dossier-pdf bytes must be at least 500`);
  if (!String(check.contentType ?? '').toLowerCase().includes('application/pdf')) {
    throw new Error(`${filePath} dossier-pdf contentType must be application/pdf`);
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

function requireTariffImportInput(summary, filePath) {
  if (summary.status !== 'ok') throw new Error(`${filePath} status is not ok`);
  if (summary.expectedRecords !== 20227 || summary.records !== 20227) {
    throw new Error(`${filePath} must prove 20227 tariff input records`);
  }
  if (summary.uniqueImportKeys !== 20227) {
    throw new Error(`${filePath} must prove 20227 unique import keys`);
  }
  if (!summary.sourceVersions || Object.keys(summary.sourceVersions).length === 0) {
    throw new Error(`${filePath} missing sourceVersions summary`);
  }
}

function requireTariffVerification(summary, filePath) {
  if (summary.status !== 'ok') throw new Error(`${filePath} status is not ok`);
  if (summary.expectedRows !== 20227 || summary.rows !== 20227) {
    throw new Error(`${filePath} must prove 20227 imported tariff rows`);
  }
  if (Array.isArray(summary.checks)) {
    for (const check of summary.checks) {
      if (check.status && check.status !== 'ok') throw new Error(`${filePath} check ${check.name ?? 'unknown'} is not ok`);
    }
  }
}

function isPendingText(value) {
  return typeof value !== 'string' || value.trim().length < 4 || value.includes('PENDIENTE');
}

function requireManualStepEvidence(step, stepName, filePath = 'manual-pilot-run.json') {
  if (step.status !== 'ok') throw new Error(`${filePath} manual step ${stepName} is not ok`);
  if (isPendingText(step.evidence)) throw new Error(`${filePath} manual step ${stepName} missing concrete evidence`);
  if (isPendingText(step.expectedResult)) throw new Error(`${filePath} manual step ${stepName} missing expectedResult`);
  if (!step.checkedAt || Number.isNaN(Date.parse(step.checkedAt))) throw new Error(`${filePath} manual step ${stepName} missing valid checkedAt`);
}
function requireManualPilotRun(summary, filePath) {
  if (summary.status !== 'ok') throw new Error(`${filePath} status is not ok`);
  requireIsoDate(summary.checkedAt, 'checkedAt', filePath);
  if (!summary.tester || typeof summary.tester !== 'string') throw new Error(`${filePath} missing tester`);
  if (!summary.environment?.webBaseUrl) throw new Error(`${filePath} missing environment.webBaseUrl`);
  const webUrl = new URL(summary.environment.webBaseUrl);
  if (!['http:', 'https:'].includes(webUrl.protocol)) throw new Error(`${filePath} environment.webBaseUrl must be http or https`);
  if (!summary.scenario?.caseId) throw new Error(`${filePath} missing scenario.caseId`);
  if (summary.scenario.dossierDownloaded !== true) throw new Error(`${filePath} must confirm scenario.dossierDownloaded=true`);
  if (!String(summary.scenario.dossierFilename ?? '').toLowerCase().endsWith('.pdf')) {
    throw new Error(`${filePath} scenario.dossierFilename must be a PDF filename`);
  }
  if (Array.isArray(summary.blockers) && summary.blockers.length > 0) {
    throw new Error(`${filePath} has blockers: ${summary.blockers.join('; ')}`);
  }
  if (!Array.isArray(summary.steps)) throw new Error(`${filePath} missing steps array`);
  for (const stepName of REQUIRED_MANUAL_STEPS) {
    const step = summary.steps.find((item) => item.name === stepName);
    if (!step) throw new Error(`${filePath} missing manual step ${stepName}`);
    if (step.status !== 'ok') throw new Error(`${filePath} manual step ${stepName} is not ok`);
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
  const tariffInputPath = path.join(artifactsDir, 'tariff-import-input.json');
  const tariffPath = path.join(artifactsDir, 'tariff-catalog-verification.json');
  const manualPath = path.join(artifactsDir, 'manual-pilot-run.json');

  const targets = readJson(targetsPath);
  requireDeploymentTargets(targets, targetsPath);

  const production = readJson(productionPath);
  requireSmoke(production, productionPath, ['api-health', 'api-ready', 'web-root']);

  const authenticated = readJson(authenticatedPath);
  requireSmoke(authenticated, authenticatedPath, ['auth-context', 'products-list', 'cases-list', 'alerts-list', 'tariff-catalog-status']);

  const tariffInput = readJson(tariffInputPath);
  requireTariffImportInput(tariffInput, tariffInputPath);

  const tariff = readJson(tariffPath);
  requireTariffVerification(tariff, tariffPath);

  const manual = readJson(manualPath);
  requireManualPilotRun(manual, manualPath);
  requireDossierSmoke(authenticated, authenticatedPath, manual.scenario.caseId);

  console.log(JSON.stringify({
    status: 'ok',
    artifactsDir,
    checkedAt: new Date().toISOString(),
    files: [targetsPath, productionPath, authenticatedPath, tariffInputPath, tariffPath, manualPath],
  }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}

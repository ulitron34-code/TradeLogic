#!/usr/bin/env node
const { existsSync, mkdirSync, readFileSync, writeFileSync } = require('node:fs');
const path = require('node:path');

const DEFAULT_ARTIFACTS_DIR = 'artifacts';
const REQUIRED_EVIDENCE = [
  {
    file: 'deployment-targets.json',
    label: 'URLs publicas de deploy',
    command: 'npm run record:deployment-targets -- --api-base-url https://tradelogic-api.onrender.com --web-base-url https://tradelogic-git-main-ulitron34-codes-projects.vercel.app --output artifacts/deployment-targets.json',
    validate: requireDeploymentTargets,
  },
  {
    file: 'smoke-production.json',
    label: 'Smoke publico API/web',
    command: 'npm run smoke:production -- --targets artifacts/deployment-targets.json --output artifacts/smoke-production.json',
    validate: (summary, filePath) => requireSmoke(summary, filePath, ['api-health', 'api-ready', 'web-root']),
  },
  {
    file: 'tariff-import-input.json',
    label: 'Entrada FA/NICO validada',
    command: 'npm run verify:tariff-import-input -- --output artifacts/tariff-import-input.json',
    validate: requireTariffImportInput,
  },
  {
    file: 'tariff-catalog-verification.json',
    label: 'Catalogo FA/NICO importado en Supabase',
    command: 'Copiar tariff_catalog_verification_json desde supabase/verify_tariff_catalog.sql a artifacts/tariff-catalog-verification.json',
    validate: requireTariffVerification,
  },
  {
    file: 'smoke-authenticated.json',
    label: 'Smoke autenticado con catalogo completo',
    command: 'TRADELOGIC_ACCESS_TOKEN=eyJ... npm run smoke:authenticated -- --targets artifacts/deployment-targets.json --require-tariff-catalog --dossier-case-id CASE_ID --output artifacts/smoke-authenticated.json',
    validate: (summary, filePath) => requireSmoke(summary, filePath, ['auth-context', 'products-list', 'cases-list', 'alerts-list', 'tariff-catalog-status']),
  },
  {
    file: 'manual-pilot-run.json',
    label: 'Recorrido manual UI y expediente PDF',
    command: 'npm run write:pilot-manual-evidence-template -- --output artifacts/manual-pilot-run.json; completar el recorrido real y cambiar cada paso a ok',
    validate: requireManualPilotRun,
  },
];

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
  node scripts/audit-pilot-readiness.cjs [--artifacts-dir artifacts] [--output artifacts/pilot-readiness.json] [--strict]

Audits pilot evidence files and reports what is ready, missing, or invalid. Without --strict it exits 0 so it can be used during preparation.
`;
}

function parseArgs(argv) {
  const options = { artifactsDir: DEFAULT_ARTIFACTS_DIR, strict: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    if (arg === '--strict') {
      options.strict = true;
      continue;
    }
    const value = argv[index + 1];
    if (!arg.startsWith('--')) throw new Error(`Unexpected argument: ${arg}`);
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
    if (arg === '--artifacts-dir') options.artifactsDir = value;
    else if (arg === '--output') options.output = value;
    else throw new Error(`Unknown option: ${arg}`);
    index += 1;
  }
  return options;
}

function checkedAt(summary) {
  return typeof summary.checkedAt === 'string' && !Number.isNaN(Date.parse(summary.checkedAt)) ? summary.checkedAt : null;
}

function requireSmoke(summary, filePath, expectedChecks) {
  if (summary.status !== 'ok') throw new Error('status is not ok');
  if (!checkedAt(summary)) throw new Error('missing valid checkedAt');
  if (!Array.isArray(summary.checks)) throw new Error('missing checks array');
  for (const checkName of expectedChecks) {
    const check = summary.checks.find((item) => item.name === checkName);
    if (!check) throw new Error(`missing check ${checkName}`);
    if (check.ok !== true) throw new Error(`check ${checkName} is not ok`);
  }
  return { checkedAt: summary.checkedAt, checks: expectedChecks.length };
}

function requireDossierSmoke(summary, caseId) {
  const check = summary.checks.find((item) => item.name === 'dossier-pdf');
  if (!check) throw new Error(`missing check dossier-pdf for manual case ${caseId}`);
  if (check.ok !== true) throw new Error('check dossier-pdf is not ok');
  if (check.caseId !== caseId) throw new Error(`dossier-pdf caseId ${check.caseId ?? 'missing'} does not match manual case ${caseId}`);
  if (!Number.isSafeInteger(check.bytes) || check.bytes < 500) throw new Error('dossier-pdf bytes must be at least 500');
  if (!String(check.contentType ?? '').toLowerCase().includes('application/pdf')) throw new Error('dossier-pdf contentType must be application/pdf');
  return { caseId, bytes: check.bytes };
}

function requireDeploymentTargets(summary) {
  if (summary.status !== 'ok') throw new Error('status is not ok');
  if (!summary.commitSha) throw new Error('missing commitSha');
  if (!summary.runtime?.apiBaseUrl || !summary.runtime?.webBaseUrl) throw new Error('missing runtime apiBaseUrl/webBaseUrl');
  return { commitSha: summary.commitSha, apiBaseUrl: summary.runtime.apiBaseUrl, webBaseUrl: summary.runtime.webBaseUrl };
}

function requireTariffImportInput(summary) {
  if (summary.status !== 'ok') throw new Error('status is not ok');
  if (summary.expectedRecords !== 20227 || summary.records !== 20227) throw new Error('must prove 20227 tariff input records');
  if (summary.uniqueImportKeys !== 20227) throw new Error('must prove 20227 unique import keys');
  return { records: summary.records, uniqueImportKeys: summary.uniqueImportKeys };
}

function requireTariffVerification(summary) {
  if (summary.status !== 'ok') throw new Error('status is not ok');
  if (summary.expectedRows !== 20227 || summary.rows !== 20227) throw new Error('must prove 20227 imported tariff rows');
  if (Array.isArray(summary.checks)) {
    const failing = summary.checks.filter((check) => check.status && check.status !== 'ok');
    if (failing.length > 0) throw new Error(`failing checks: ${failing.map((check) => check.name ?? 'unknown').join(', ')}`);
  }
  return { rows: summary.rows, expectedRows: summary.expectedRows };
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
function requireManualPilotRun(summary) {
  if (summary.status !== 'ok') throw new Error('status is not ok');
  if (!checkedAt(summary)) throw new Error('missing valid checkedAt');
  if (!summary.tester) throw new Error('missing tester');
  if (!summary.environment?.webBaseUrl) throw new Error('missing environment.webBaseUrl');
  if (!summary.scenario?.caseId) throw new Error('missing scenario.caseId');
  if (summary.scenario.dossierDownloaded !== true) throw new Error('scenario.dossierDownloaded must be true');
  if (!String(summary.scenario.dossierFilename ?? '').toLowerCase().endsWith('.pdf')) throw new Error('scenario.dossierFilename must be a PDF filename');
  if (Array.isArray(summary.blockers) && summary.blockers.length > 0) throw new Error(`has blockers: ${summary.blockers.join('; ')}`);
  if (!Array.isArray(summary.steps)) throw new Error('missing steps array');
  for (const stepName of REQUIRED_MANUAL_STEPS) {
    const step = summary.steps.find((item) => item.name === stepName);
    if (!step) throw new Error(`missing manual step ${stepName}`);
    if (step.status !== 'ok') throw new Error(`manual step ${stepName} is not ok`);
  }
  return { tester: summary.tester, caseId: summary.scenario.caseId, steps: REQUIRED_MANUAL_STEPS.length };
}

function readEvidence(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function auditEvidence(artifactsDir) {
  const evidence = REQUIRED_EVIDENCE.map((item) => {
    const filePath = path.join(artifactsDir, item.file);
    if (!existsSync(filePath)) {
      return { file: item.file, label: item.label, status: 'missing', next: item.command };
    }
    try {
      const summary = readEvidence(filePath);
      const details = item.validate(summary, filePath);
      return { file: item.file, label: item.label, status: 'ok', details };
    } catch (error) {
      return { file: item.file, label: item.label, status: 'invalid', error: error instanceof Error ? error.message : String(error), next: item.command };
    }
  });

  const manual = evidence.find((item) => item.file === 'manual-pilot-run.json');
  const smoke = evidence.find((item) => item.file === 'smoke-authenticated.json');
  if (manual?.status === 'ok' && smoke?.status === 'ok') {
    try {
      const smokeSummary = readEvidence(path.join(artifactsDir, 'smoke-authenticated.json'));
      smoke.details = { ...smoke.details, dossierPdf: requireDossierSmoke(smokeSummary, manual.details.caseId) };
    } catch (error) {
      smoke.status = 'invalid';
      smoke.error = error instanceof Error ? error.message : String(error);
      smoke.next = smoke.next ?? 'TRADELOGIC_ACCESS_TOKEN=eyJ... npm run smoke:authenticated -- --targets artifacts/deployment-targets.json --require-tariff-catalog --dossier-case-id CASE_ID --output artifacts/smoke-authenticated.json';
    }
  }

  return evidence;
}

function writeSummary(outputPath, summary) {
  if (!outputPath) return;
  const resolved = path.resolve(outputPath);
  mkdirSync(path.dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(usage());
    return;
  }
  const artifactsDir = path.resolve(options.artifactsDir);
  const evidence = auditEvidence(artifactsDir);
  const ready = evidence.every((item) => item.status === 'ok');
  const summary = {
    status: ready ? 'ok' : 'needs-evidence',
    checkedAt: new Date().toISOString(),
    artifactsDir,
    ready,
    evidence,
    next: evidence.find((item) => item.status !== 'ok')?.next ?? 'npm run verify:pilot-evidence -- --artifacts-dir artifacts',
  };
  writeSummary(options.output, summary);
  console.log(JSON.stringify(summary, null, 2));
  if (options.strict && !ready) process.exitCode = 1;
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}

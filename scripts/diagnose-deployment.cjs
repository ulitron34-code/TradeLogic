#!/usr/bin/env node
const { execFileSync } = require('node:child_process');
const { existsSync, readFileSync } = require('node:fs');
const { mkdir, readFile, writeFile } = require('node:fs/promises');
const path = require('node:path');

const DEFAULT_API_BASE_URL = 'https://tradelogic-api.onrender.com';
const DEFAULT_WEB_BASE_URL = 'https://tradelogic-git-main-ulitron34-codes-projects.vercel.app';
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_RENDER_DASHBOARD = 'https://dashboard.render.com/web/srv-d9rvfk8n74is73fl9bt0';
const EXPECTED_RENDER_WEB_SETTINGS = {
  buildCommand: 'pnpm install --frozen-lockfile --prod=false && pnpm --filter @platform/api... build',
  preDeployCommand: 'pnpm --filter @platform/db prisma:deploy',
  startCommand: 'pnpm --filter @platform/api start',
  healthCheckPath: '/health',
};

function usage() {
  return `Usage:
  node scripts/diagnose-deployment.cjs [--api-base-url https://api.example.com] [--web-base-url https://app.example.com] [--targets artifacts/deployment-targets.json] [--expected-commit git-sha] [--render-dashboard-url https://dashboard.render.com/web/...] [--timeout-ms 30000] [--output artifacts/deployment-diagnosis.json]

Diagnoses the public deployment without secrets. It checks API health, database readiness, deployed commit metadata, and the public web app.
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
    else if (arg === '--targets') options.targets = value;
    else if (arg === '--expected-commit') options.expectedCommit = value;
    else if (arg === '--render-dashboard-url') options.renderDashboardUrl = normalizeBaseUrl(value, '--render-dashboard-url');
    else if (arg === '--timeout-ms') options.timeoutMs = parseTimeout(value);
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

function normalizeBaseUrl(value, name, { optional = false } = {}) {
  if (!value) {
    if (optional) return undefined;
    throw new Error(`${name} is required`);
  }
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error(`${name} must be http or https`);
  return url.toString().replace(/\/$/, '');
}

async function resolveTargets(targetsPath) {
  if (!targetsPath) return {};
  const resolved = path.resolve(targetsPath);
  const payload = JSON.parse(await readFile(resolved, 'utf8'));
  return {
    apiBaseUrl: payload.runtime?.apiBaseUrl,
    webBaseUrl: payload.runtime?.webBaseUrl,
    expectedCommit: payload.commitSha,
    renderDashboardUrl: payload.dashboards?.render,
  };
}

function currentCommitSha() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

async function fetchJson(url, timeoutMs) {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), headers: { Accept: 'application/json' } });
  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { parseError: 'response was not JSON', preview: text.slice(0, 200) };
    }
  }
  return { url, status: response.status, ok: response.ok, body };
}

async function fetchPage(url, timeoutMs) {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), headers: { Accept: 'text/html,*/*' } });
  const text = await response.text();
  const title = text.match(/<title>([^<]*)<\/title>/i)?.[1] ?? null;
  const preview = text.slice(0, 2000);
  const vercelProtected = /login\s*[–-]\s*vercel/i.test(String(title ?? '')) || (preview.includes('login?next=') && /vercel/i.test(preview));
  const tradeLogicMarker = /tradelogic|trade logic|inteligencia aduanera|clasificaci[oó]n/i.test(`${title ?? ''} ${preview}`);
  return {
    url,
    status: response.status,
    ok: response.status < 500 && !vercelProtected && tradeLogicMarker,
    bytes: Buffer.byteLength(text),
    title,
    ...(vercelProtected ? { error: 'web root is showing Vercel access protection instead of the TradeLogic app' } : {}),
    ...(!vercelProtected && !tradeLogicMarker ? { error: 'web root did not include a TradeLogic application marker' } : {}),
  };
}

async function safeCheck(name, operation) {
  try {
    const result = await operation();
    return { name, ok: result.ok, ...result };
  } catch (error) {
    return { name, ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function commitMatches(runningCommit, expectedCommit) {
  if (!runningCommit || !expectedCommit) return null;
  return runningCommit.startsWith(expectedCommit) || expectedCommit.startsWith(runningCommit);
}

function renderBlueprintStatus() {
  const blueprintPath = path.resolve('render.yaml');
  if (!existsSync(blueprintPath)) return { status: 'missing', path: blueprintPath, checks: [] };
  const text = readFileSync(blueprintPath, 'utf8');
  const expected = [
    ['api-build-command', `buildCommand: ${EXPECTED_RENDER_WEB_SETTINGS.buildCommand}`],
    ['api-pre-deploy-command', `preDeployCommand: ${EXPECTED_RENDER_WEB_SETTINGS.preDeployCommand}`],
    ['api-start-command', `startCommand: ${EXPECTED_RENDER_WEB_SETTINGS.startCommand}`],
    ['api-health-check-path', `healthCheckPath: ${EXPECTED_RENDER_WEB_SETTINGS.healthCheckPath}`],
  ];
  const checks = expected.map(([name, marker]) => ({ name, ok: text.includes(marker), marker }));
  return {
    status: checks.every((check) => check.ok) ? 'ok' : 'drift',
    path: blueprintPath,
    checks,
  };
}
function renderRecovery(renderDashboardUrl, blueprint = renderBlueprintStatus()) {
  return {
    dashboardUrl: renderDashboardUrl,
    settingsPath: 'Settings -> Build & Deploy',
    expectedSettings: EXPECTED_RENDER_WEB_SETTINGS,
    localBlueprint: blueprint,
    manualDeployAction: 'Manual Deploy -> Deploy latest commit',
    verifyAfterDeploy: [
      'GET https://tradelogic-api.onrender.com/version must return 200.',
      'commitSha must match the expected commit from this diagnosis.',
      'Then rerun smoke-production with --expected-commit.',
    ],
  };
}
function summarize({ checks, expectedCommit, renderDashboardUrl, renderBlueprint }) {
  const health = checks.find((check) => check.name === 'api-health');
  const ready = checks.find((check) => check.name === 'api-ready');
  const version = checks.find((check) => check.name === 'api-version');
  const web = checks.find((check) => check.name === 'web-root');
  const readyDatabaseOk = ready?.status === 200 && ready.body?.database === 'ok';
  const versionMissing = version?.status === 404;
  const runningCommit = version?.body?.commitSha ?? null;
  const matchesExpectedCommit = commitMatches(runningCommit, expectedCommit);

  if (health?.status === 200 && readyDatabaseOk && versionMissing) {
    return {
      status: 'degraded',
      code: 'render_serving_previous_api_build',
      message: 'API process and database are healthy, but /version is missing. Render is serving an older API build or the latest deploy failed before promotion.',
      expectedRenderWebSettings: EXPECTED_RENDER_WEB_SETTINGS,
      renderRecovery: renderRecovery(renderDashboardUrl, renderBlueprint),
      nextActions: [
        `Open Render deploy logs: ${renderDashboardUrl}`,
        'Check runtime logs for the latest deploy, not only build logs.',
        'In Settings -> Build & Deploy, ensure the web service Start Command is exactly: pnpm --filter @platform/api start',
        'Keep tariff:import out of the web service start command; run the catalog import as a controlled post-deploy operation.',
        'Run Manual Deploy -> Deploy latest commit, then rerun this diagnosis with --expected-commit.',
      ],
    };
  }

  if (version?.status === 200 && matchesExpectedCommit === false) {
    return {
      status: 'degraded',
      code: 'render_commit_mismatch',
      message: `Render reports commit ${runningCommit}, but expected ${expectedCommit}.`,
      renderRecovery: renderRecovery(renderDashboardUrl, renderBlueprint),
      nextActions: [
        `Open Render deploy logs: ${renderDashboardUrl}`,
        'Confirm Auto-Deploy is enabled for main or trigger Manual Deploy -> Deploy latest commit.',
      ],
    };
  }

  if (health?.status === 200 && readyDatabaseOk && version?.status === 200 && matchesExpectedCommit !== false && (!web || web.ok)) {
    return {
      status: 'ok',
      code: 'deployment_public_checks_passed',
      message: 'Public API, database readiness, deployed version metadata, and web checks passed.',
      nextActions: [],
    };
  }

  return {
    status: 'failed',
    code: 'deployment_public_checks_failed',
    message: 'One or more public deployment checks failed. Inspect the checks array for the failing endpoint.',
    renderRecovery: renderRecovery(renderDashboardUrl, renderBlueprint),
    nextActions: [`Open Render deploy logs: ${renderDashboardUrl}`],
  };
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

  const targets = await resolveTargets(options.targets);
  const apiBaseUrl = normalizeBaseUrl(options.apiBaseUrl ?? targets.apiBaseUrl ?? process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL, '--api-base-url');
  const webBaseUrl = normalizeBaseUrl(options.webBaseUrl ?? targets.webBaseUrl ?? process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_BASE_URL ?? DEFAULT_WEB_BASE_URL, '--web-base-url', { optional: true });
  const expectedCommit = options.expectedCommit ?? targets.expectedCommit ?? currentCommitSha();
  const renderDashboardUrl = normalizeBaseUrl(options.renderDashboardUrl ?? targets.renderDashboardUrl ?? DEFAULT_RENDER_DASHBOARD, '--render-dashboard-url');

  const checks = [];
  checks.push(await safeCheck('api-health', () => fetchJson(`${apiBaseUrl}/health`, options.timeoutMs)));
  checks.push(await safeCheck('api-ready', () => fetchJson(`${apiBaseUrl}/ready`, options.timeoutMs)));
  checks.push(await safeCheck('api-version', () => fetchJson(`${apiBaseUrl}/version`, options.timeoutMs)));
  if (webBaseUrl) checks.push(await safeCheck('web-root', () => fetchPage(webBaseUrl, options.timeoutMs)));

  const renderBlueprint = renderBlueprintStatus();
  const diagnosis = summarize({ checks, expectedCommit, renderDashboardUrl, renderBlueprint });
  const summary = {
    ...diagnosis,
    checkedAt: new Date().toISOString(),
    expectedCommit,
    runtime: { apiBaseUrl, webBaseUrl },
    checks,
  };

  await writeSummary(options.output, summary);
  console.log(JSON.stringify(summary, null, 2));
  if (summary.status !== 'ok') process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

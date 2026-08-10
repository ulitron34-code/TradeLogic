#!/usr/bin/env node
const { execFileSync } = require('node:child_process');
const { mkdirSync, writeFileSync } = require('node:fs');
const path = require('node:path');

const DEFAULT_OUTPUT = 'artifacts/deployment-targets.json';
const DEFAULT_SUPABASE_DASHBOARD = 'https://supabase.com/dashboard/project/zmixonmbencmmtmhdrjr';
const DEFAULT_RENDER_DASHBOARD = 'https://dashboard.render.com/web/srv-d9rvfk8n74is73fl9bt0';
const DEFAULT_VERCEL_DASHBOARD = 'https://vercel.com/ulitron34-codes-projects/tradelogic';

function usage() {
  return `Usage:
  node scripts/record-deployment-targets.cjs --api-base-url https://api.onrender.com --web-base-url https://app.vercel.app [--output artifacts/deployment-targets.json]

Optional:
  --commit-sha <git-sha>
  --supabase-dashboard-url <url>
  --render-dashboard-url <url>
  --vercel-dashboard-url <url>

Environment fallback:
  API_BASE_URL or NEXT_PUBLIC_API_BASE_URL
  APP_BASE_URL or NEXT_PUBLIC_APP_BASE_URL
`;
}

function parseArgs(argv) {
  const options = { output: DEFAULT_OUTPUT };
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
    else if (arg === '--output') options.output = value;
    else if (arg === '--commit-sha') options.commitSha = value;
    else if (arg === '--supabase-dashboard-url') options.supabaseDashboardUrl = value;
    else if (arg === '--render-dashboard-url') options.renderDashboardUrl = value;
    else if (arg === '--vercel-dashboard-url') options.vercelDashboardUrl = value;
    else throw new Error(`Unknown option: ${arg}`);
    index += 1;
  }
  return options;
}

function normalizeUrl(value, name) {
  if (!value) throw new Error(`${name} is required`);
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error(`${name} must be http or https`);
  return url.toString().replace(/\/$/, '');
}

function currentCommitSha() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function writeJson(outputPath, payload) {
  const resolved = path.resolve(outputPath);
  mkdirSync(path.dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return resolved;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(usage());
    return;
  }

  const apiBaseUrl = normalizeUrl(options.apiBaseUrl ?? process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL, '--api-base-url');
  const webBaseUrl = normalizeUrl(options.webBaseUrl ?? process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_BASE_URL, '--web-base-url');
  const payload = {
    status: 'ok',
    recordedAt: new Date().toISOString(),
    commitSha: options.commitSha ?? currentCommitSha(),
    runtime: { apiBaseUrl, webBaseUrl },
    dashboards: {
      supabase: normalizeUrl(options.supabaseDashboardUrl ?? DEFAULT_SUPABASE_DASHBOARD, '--supabase-dashboard-url'),
      render: normalizeUrl(options.renderDashboardUrl ?? DEFAULT_RENDER_DASHBOARD, '--render-dashboard-url'),
      vercel: normalizeUrl(options.vercelDashboardUrl ?? DEFAULT_VERCEL_DASHBOARD, '--vercel-dashboard-url'),
    },
  };
  if (!payload.commitSha) throw new Error('--commit-sha is required outside a Git checkout');

  const output = writeJson(options.output, payload);
  console.log(JSON.stringify({ status: 'ok', output, commitSha: payload.commitSha, runtime: payload.runtime }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}

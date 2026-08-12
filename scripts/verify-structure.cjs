const fs = require('fs');
const required = [
  'package.json',
  'MANIFEST.json',
  'apps/api/src/app.ts',
  'apps/api/src/routes.test.ts',
  'packages/domain/src/index.test.ts',
  'docs/PUBLISHING_SETUP.md',
  'docs/SUPABASE_PRISMA_SETUP.md',
  'docs/VERCEL_ENV_SETUP.md',
  'docs/TESTING.md',
  'render.yaml',
];
for (const file of required) {
  if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
}
for (const file of ['package.json', 'MANIFEST.json']) {
  JSON.parse(fs.readFileSync(file, 'utf8'));
}
const renderBlueprint = fs.readFileSync('render.yaml', 'utf8');
for (const marker of ['name: tradelogic-api', 'name: tradelogic-worker', 'healthCheckPath: /health', 'preDeployCommand: pnpm --filter @platform/db prisma:deploy', 'startCommand: pnpm --filter @platform/api start', 'startCommand: pnpm --filter @platform/worker start']) {
  if (!renderBlueprint.includes(marker)) throw new Error(`Render blueprint missing ${marker}`);
}
console.log('Structure OK');

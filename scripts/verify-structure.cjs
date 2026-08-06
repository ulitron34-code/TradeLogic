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
];
for (const file of required) {
  if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
}
for (const file of ['package.json', 'MANIFEST.json']) {
  JSON.parse(fs.readFileSync(file, 'utf8'));
}
console.log('Structure OK');
#!/usr/bin/env sh
set -eu

required="
package.json
pnpm-workspace.yaml
pnpm-lock.yaml
docker-compose.yml
README.md
apps/api/src/app.ts
apps/api/src/routes.ts
apps/api/src/routes.test.ts
apps/worker/src/index.ts
apps/web/app/page.tsx
packages/db/prisma/schema.prisma
packages/domain/src/index.ts
packages/domain/src/index.test.ts
openapi/openapi.yaml
docs/PUBLISHING_SETUP.md
docs/SUPABASE_PRISMA_SETUP.md
docs/VERCEL_ENV_SETUP.md
docs/TESTING.md
docs/DEPLOYMENT_RUNBOOK.md
docs/PILOT_ACCEPTANCE_CHECKLIST.md
scripts/smoke-production.cjs
scripts/smoke-authenticated.cjs
scripts/record-deployment-targets.cjs
scripts/diagnose-deployment.cjs
scripts/operational-scripts.test.cjs
scripts/verify-tariff-source.cjs
scripts/verify-tariff-import-input.cjs
scripts/generate-supabase-tariff-import-sql.cjs
scripts/write-supabase-tariff-import-guide.cjs
scripts/write-pilot-manual-evidence-template.cjs
scripts/audit-pilot-readiness.cjs
scripts/audit-env-readiness.cjs
scripts/prepare-pilot-evidence.cjs
scripts/verify-pilot-evidence.cjs
supabase/verify_tariff_catalog.sql
render.yaml
"

for f in $required; do
  test -f "$f" || { echo "Missing required file: $f"; exit 1; }
done

node -e "for (const f of ['package.json','MANIFEST.json','apps/api/package.json','apps/worker/package.json','packages/db/package.json']) JSON.parse(require('fs').readFileSync(f,'utf8'));"
node scripts/verify-tariff-source.cjs
node scripts/verify-tariff-import-input.cjs
node --check scripts/generate-supabase-tariff-import-sql.cjs
node scripts/generate-supabase-tariff-import-sql.cjs --help >/dev/null
node --check scripts/write-supabase-tariff-import-guide.cjs
node scripts/write-supabase-tariff-import-guide.cjs --help >/dev/null
node --check scripts/write-pilot-manual-evidence-template.cjs
node scripts/write-pilot-manual-evidence-template.cjs --help >/dev/null
node --check scripts/audit-pilot-readiness.cjs
node scripts/audit-pilot-readiness.cjs --help >/dev/null
node --check scripts/audit-env-readiness.cjs
node scripts/audit-env-readiness.cjs --strict >/dev/null
node --check scripts/prepare-pilot-evidence.cjs
node scripts/prepare-pilot-evidence.cjs --help >/dev/null
node --check scripts/record-deployment-targets.cjs
node scripts/record-deployment-targets.cjs --help >/dev/null
node --check scripts/diagnose-deployment.cjs
node scripts/diagnose-deployment.cjs --help >/dev/null
node --check scripts/smoke-production.cjs
node scripts/smoke-production.cjs --help >/dev/null
node --check scripts/smoke-authenticated.cjs
node scripts/smoke-authenticated.cjs --help >/dev/null
node --check scripts/verify-pilot-evidence.cjs
node scripts/verify-pilot-evidence.cjs --help >/dev/null
node --test scripts/operational-scripts.test.cjs >/dev/null

echo "Preflight structure OK"

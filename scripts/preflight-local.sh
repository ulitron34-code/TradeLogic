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
scripts/smoke-production.cjs
scripts/smoke-authenticated.cjs
scripts/verify-tariff-source.cjs
render.yaml
"

for f in $required; do
  test -f "$f" || { echo "Missing required file: $f"; exit 1; }
done

node -e "for (const f of ['package.json','MANIFEST.json','apps/api/package.json','apps/worker/package.json','packages/db/package.json']) JSON.parse(require('fs').readFileSync(f,'utf8'));"
node scripts/verify-tariff-source.cjs >/dev/null

echo "Preflight structure OK"

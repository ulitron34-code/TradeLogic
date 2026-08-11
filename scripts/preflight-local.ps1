$ErrorActionPreference = 'Stop'

$required = @(
  'package.json',
  'pnpm-workspace.yaml',
  'pnpm-lock.yaml',
  'docker-compose.yml',
  'README.md',
  'apps/api/src/app.ts',
  'apps/api/src/routes.ts',
  'apps/api/src/routes.test.ts',
  'apps/worker/src/index.ts',
  'apps/web/app/page.tsx',
  'packages/db/prisma/schema.prisma',
  'packages/domain/src/index.ts',
  'packages/domain/src/index.test.ts',
  'openapi/openapi.yaml',
  'docs/PUBLISHING_SETUP.md',
  'docs/SUPABASE_PRISMA_SETUP.md',
  'docs/VERCEL_ENV_SETUP.md',
  'docs/TESTING.md',
  'docs/DEPLOYMENT_RUNBOOK.md',
  'docs/PILOT_ACCEPTANCE_CHECKLIST.md',
  'scripts/smoke-production.cjs',
  'scripts/smoke-authenticated.cjs',
  'scripts/record-deployment-targets.cjs',
  'scripts/verify-tariff-source.cjs',
  'scripts/verify-tariff-import-input.cjs',
  'scripts/generate-supabase-tariff-import-sql.cjs',
  'scripts/verify-pilot-evidence.cjs',
  'supabase/verify_tariff_catalog.sql',
  'render.yaml'
)

foreach ($file in $required) {
  if (-not (Test-Path $file)) {
    throw "Missing required file: $file"
  }
}

$jsonFiles = @('package.json', 'MANIFEST.json', 'apps/api/package.json', 'apps/worker/package.json', 'packages/db/package.json')
foreach ($file in $jsonFiles) {
  Get-Content -Raw $file | ConvertFrom-Json | Out-Null
}

$secretPatterns = @(
  'sk-[A-Za-z0-9_-]{20,}',
  'SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["''`]?[A-Za-z0-9._-]{20,}',
  'postgresql://postgres:[^<][^@]+@',
  'JWT_SECRET=.*[A-Za-z0-9]{32,}'
)

$roots = @('apps', 'packages', 'docs', 'openapi', 'scripts')
$scanFiles = foreach ($root in $roots) {
  if (Test-Path $root) {
    Get-ChildItem -Path $root -Recurse -File -Include *.ts,*.tsx,*.js,*.cjs,*.json,*.md,*.yaml,*.yml -ErrorAction Stop |
      Where-Object { $_.FullName -notmatch '[\\/]node_modules[\\/]|[\\/]\.next[\\/]|[\\/]dist[\\/]' }
  }
}
$scanFiles += Get-ChildItem -File -Include package.json,MANIFEST.json,pnpm-workspace.yaml,.env.example -ErrorAction SilentlyContinue

foreach ($pattern in $secretPatterns) {
  $hit = $scanFiles | Select-String -Pattern $pattern -List
  if ($hit) {
    throw "Potential secret-like value found by pattern '$pattern' in $($hit.Path)"
  }
}

$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCommand) {
  & $nodeCommand.Source scripts/verify-tariff-source.cjs | Out-Null
  & $nodeCommand.Source scripts/verify-tariff-import-input.cjs | Out-Null
  & $nodeCommand.Source --check scripts/generate-supabase-tariff-import-sql.cjs | Out-Null
  & $nodeCommand.Source scripts/generate-supabase-tariff-import-sql.cjs --help | Out-Null
  & $nodeCommand.Source --check scripts/record-deployment-targets.cjs | Out-Null
  & $nodeCommand.Source scripts/record-deployment-targets.cjs --help | Out-Null
  & $nodeCommand.Source --check scripts/smoke-production.cjs | Out-Null
  & $nodeCommand.Source scripts/smoke-production.cjs --help | Out-Null
  & $nodeCommand.Source --check scripts/smoke-authenticated.cjs | Out-Null
  & $nodeCommand.Source scripts/smoke-authenticated.cjs --help | Out-Null
  & $nodeCommand.Source --check scripts/verify-pilot-evidence.cjs | Out-Null
  & $nodeCommand.Source scripts/verify-pilot-evidence.cjs --help | Out-Null
} else {
  Write-Warning 'Node.js not found on PATH; skipping Node-based integrity checks in PowerShell preflight. Run npm run verify:tariff-source and operational script checks where Node.js is available.'
}

Write-Output 'Preflight structure OK'

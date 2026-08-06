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
  'docs/TESTING.md'
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
  'supabase_service_role',
  'postgresql://postgres:[^<][^@]+@',
  'JWT_SECRET=.*[A-Za-z0-9]{32,}'
)

$roots = @('apps', 'packages', 'docs', 'openapi', 'scripts')
$scanFiles = foreach ($root in $roots) {
  if (Test-Path $root) {
    Get-ChildItem -Path $root -Recurse -File -Include *.ts,*.tsx,*.js,*.cjs,*.json,*.md,*.yaml,*.yml -ErrorAction Stop
  }
}
$scanFiles += Get-ChildItem -File -Include package.json,MANIFEST.json,pnpm-workspace.yaml,.env.example -ErrorAction SilentlyContinue

foreach ($pattern in $secretPatterns) {
  $hit = $scanFiles | Select-String -Pattern $pattern -List
  if ($hit) {
    throw "Potential secret-like value found by pattern '$pattern' in $($hit.Path)"
  }
}

Write-Output 'Preflight structure OK'
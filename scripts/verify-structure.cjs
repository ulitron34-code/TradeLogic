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
  'docs/CORPUS_INTEGRATION.md',
  'docs/OFFICIAL_REGULATORY_SOURCES.md',
  'render.yaml',
  'corpus/README.md',
  'corpus/ligie/README.md',
  'corpus/senasica/README.md',
  'corpus/tratados/README.md',
  'corpus/noms/README.md',
  'corpus/cofepris/README.md',
  'corpus/scjn/README.md',
  'corpus/dof/README.md',
  'corpus/scripts/README.md',
  'corpus/scripts/validate-corpus.py',
  'corpus/scripts/extract-ligie-corpus.ps1',
  'corpus/scripts/transform-senasica.py',
  'corpus/scripts/import-senasica-catalog.ts',
  'corpus/ligie/fracciones_arancelarias_20260420.xlsx',
  'corpus/ligie/nico_20240404.xlsx',
  'corpus/ligie/arancel_cupos_20240423.xlsx',
  'corpus/ligie/niveles_arancelarios_20240423.xlsx',
  'corpus/ligie/tablas_correlacion_20240404.xlsx',
  'corpus/ligie/modificaciones_abril2026_20260427.xlsx',
  'corpus/ligie/ligie_unificada_20250728.pdf',
  'corpus/senasica/productos_alimenticios.csv',
  'corpus/senasica/productos_biologicos.csv',
  'corpus/senasica/productos_regulados.csv',
  'corpus/senasica/regulatory-catalog.csv',
  'corpus/tratados/rgce_2026.pdf',
  'corpus/tratados/rgce_compilada_2026.pdf',
  'corpus/tratados/origin-rules.csv',
  'corpus/noms/catalogo_noms_economia.json',
  'corpus/noms/regulatory-catalog-noms.csv',
  'corpus/cofepris/registros_medicamentos.csv',
  'corpus/cofepris/regulatory-catalog-cofepris.csv',
  'corpus/scjn/tesis_supremacorte.json',
  'corpus/scjn/jurisprudencia-catalog.csv',
  'corpus/regulatory-catalog-master.csv',
  'corpus/scripts/extract-tratados.py',
  'corpus/scripts/extract-nom-catalog.py',
  'corpus/scripts/extract-cofepris-scjn.py',
  'corpus/scripts/consolidate-corpus.py',
];
for (const file of required) {
  if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
}
for (const file of ['package.json', 'MANIFEST.json']) {
  JSON.parse(fs.readFileSync(file, 'utf8'));
}
const renderBlueprint = fs.readFileSync('render.yaml', 'utf8');
for (const marker of ['name: tradelogic-api', 'name: tradelogic-worker', 'healthCheckPath: /health', 'preDeployCommand: DIRECT_URL="$DATABASE_URL" pnpm --filter @platform/db prisma:deploy', 'startCommand: DIRECT_URL="$DATABASE_URL" pnpm --filter @platform/db prisma:deploy && node apps/api/dist/server.js', 'startCommand: pnpm --filter @platform/worker start']) {
  if (!renderBlueprint.includes(marker)) throw new Error(`Render blueprint missing ${marker}`);
}
console.log('Structure OK');

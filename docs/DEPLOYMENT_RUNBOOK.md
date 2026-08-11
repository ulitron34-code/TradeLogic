# Runbook de deploy y smoke test

Actualizado: 2026-08-10

## Tableros

- Supabase project dashboard: https://supabase.com/dashboard/project/zmixonmbencmmtmhdrjr
- Render API dashboard: https://dashboard.render.com/web/srv-d9rvfk8n74is73fl9bt0
- Vercel web dashboard: https://vercel.com/ulitron34-codes-projects/tradelogic

Estos enlaces son tableros de administracion. Para los smoke tests se necesitan las URLs publicas de runtime:

- API publica de Render: `https://tradelogic-api.onrender.com`
- Web publica de Vercel: `https://tradelogic-git-main-ulitron34-codes-projects.vercel.app`

## Secuencia despues de cada push

1. Confirmar que GitHub `main` recibio el commit esperado y guardar auditoria local de variables sin secretos: `npm run audit:env-readiness -- --strict --output artifacts/env-readiness.json`.
2. Abrir Supabase y verificar que la base este disponible, sin migraciones pendientes ni alertas criticas.
3. Abrir el dashboard de Render y verificar que el deploy de API termine correctamente.
4. Abrir el dashboard de Vercel y verificar que el deploy de web termine correctamente.
5. Preparar evidencia publica/local sin secretos en un solo paso, incluyendo URLs, auditoria de entorno, entrada FA/NICO y smoke publico:

```bash
npm run prepare:pilot-evidence -- --api-base-url https://tradelogic-api.onrender.com --web-base-url https://tradelogic-git-main-ulitron34-codes-projects.vercel.app --artifacts-dir artifacts
```

6. Si solo se necesita repetir el smoke publico, ejecutar el smoke leyendo esas URLs. El script espera hasta 30 segundos por request y reintenta 2 veces para tolerar arranques frios:

```bash
npm run smoke:production -- --targets artifacts/deployment-targets.json --output artifacts/smoke-production.json
```

7. Con una sesion piloto real, obtener un access token de Supabase Auth y ejecutar smoke autenticado read-only. Despues de importar FA/NICO, agregar `--require-tariff-catalog` para exigir 20,227 filas visibles por API:

```bash
TRADELOGIC_ACCESS_TOKEN=eyJ... npm run smoke:authenticated -- --targets artifacts/deployment-targets.json --output artifacts/smoke-authenticated.json
# Cuando ya exista un caso piloto revisado, agregar: --dossier-case-id CASE_ID
```

8. Guardar los JSON de smoke junto con la evidencia del deploy/piloto.
9. Antes de importar FA/NICO, guardar evidencia de entrada con `npm run verify:tariff-import-input -- --output artifacts/tariff-import-input.json`. Si la ruta Prisma/pnpm no responde, generar `artifacts/import_tariff_catalog.sql` con `npm run generate:supabase-tariff-import-sql -- --output artifacts/import_tariff_catalog.sql`, crear `artifacts/import_tariff_catalog_guide.md` con `npm run write:supabase-tariff-import-guide -- --sql artifacts/import_tariff_catalog.sql --input-summary artifacts/tariff-import-input.json --output artifacts/import_tariff_catalog_guide.md`, y pegar el SQL completo en el SQL editor de Supabase.
10. Generar `artifacts/manual-pilot-run.json` con `npm run write:pilot-manual-evidence-template -- --output artifacts/manual-pilot-run.json`, completar el recorrido UI real y confirmar descarga del PDF.
11. Auditar faltantes con `npm run audit:pilot-readiness -- --artifacts-dir artifacts --output artifacts/pilot-readiness.json`.
12. Validar evidencia minima con `npm run verify:pilot-evidence -- --artifacts-dir artifacts`.
13. Respaldar el estado del repo en `F:/ADUANA/TradeLogic/backups`.

## Criterios de no-go

- Render API no llega a estado live.
- Vercel web no llega a estado ready/production.
- `/ready` no devuelve `database: ok`.
- El smoke autenticado no puede resolver `/api/v1/me` con organizacion y roles.
- El catalogo oficial no pasa `npm run verify:tariff-source`.

## Pendientes operativos

- Registrar aqui la API publica exacta de Render cuando se confirme desde el dashboard.
- Registrar aqui la web publica exacta de Vercel cuando se confirme desde el dashboard.
- Ejecutar la importacion controlada del catalogo FA/NICO en Supabase/produccion y guardar el resultado del conteo.
- Despues de importar, pegar `supabase/verify_tariff_catalog.sql` en el SQL editor de Supabase. Copiar el valor final `tariff_catalog_verification_json` a `artifacts/tariff-catalog-verification.json`; todos los checks deben devolver `ok`.

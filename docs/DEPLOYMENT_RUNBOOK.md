# Runbook de deploy y smoke test

Actualizado: 2026-08-12

## Tableros

- Supabase project dashboard: https://supabase.com/dashboard/project/zmixonmbencmmtmhdrjr
- Render API dashboard: https://dashboard.render.com/web/srv-d9rvfk8n74is73fl9bt0
- Vercel web dashboard: https://vercel.com/ulitron34-codes-projects/tradelogic

Estos enlaces son tableros de administracion. Para los smoke tests se necesitan las URLs publicas de runtime:

- API publica de Render: `https://tradelogic-api.onrender.com`
- Web publica de Vercel: `https://tradelogic-git-main-ulitron34-codes-projects.vercel.app`

El Background Worker de Render todavía no está creado. Cuando se active, debe
usar el mismo repositorio y rama `main`, región Oregon, y la configuración del
blueprint `render.yaml`:

```text
Build Command:
pnpm install --frozen-lockfile --prod=false && pnpm --filter @platform/worker... build

Start Command:
pnpm --filter @platform/worker start
```

El arranque ejecuta `node dist/index.js`. Deben configurarse en Render las
variables `DATABASE_URL`, `REDIS_URL`, Supabase, S3, JWT, `ENCRYPTION_KEY`,
calendarios regulatorios y, si se desea enriquecimiento con IA,
`ANTHROPIC_API_KEY`. El plan Starter mostrado por Render cuesta $7 USD/mes.

## Secuencia despues de cada push

1. Confirmar que GitHub `main` recibio el commit esperado y guardar auditoria local de variables sin secretos: `npm run audit:env-readiness -- --strict --output artifacts/env-readiness.json`.
2. Abrir Supabase y verificar que la base este disponible, sin migraciones pendientes ni alertas criticas.
3. Abrir el dashboard de Render y verificar que el deploy de API termine correctamente.
4. Abrir el dashboard de Vercel y verificar que el deploy de web termine correctamente.
5. Preparar evidencia publica/local sin secretos en un solo paso, incluyendo URLs, auditoria de entorno, entrada FA/NICO y smoke publico:

```bash
npm run prepare:pilot-evidence -- --api-base-url https://tradelogic-api.onrender.com --web-base-url https://tradelogic-git-main-ulitron34-codes-projects.vercel.app --artifacts-dir artifacts
```

6. Si solo se necesita repetir el smoke publico, ejecutar el smoke leyendo esas URLs. Cuando `deployment-targets.json` incluye `commitSha`, tambien valida `/version` para confirmar que Render corre ese commit. El script espera hasta 30 segundos por request y reintenta 2 veces para tolerar arranques frios:

```bash
npm run smoke:production -- --targets artifacts/deployment-targets.json --output artifacts/smoke-production.json
```

Si el smoke falla, `artifacts/smoke-production.json` queda escrito con `status: failed` y checks parciales. Para explicar rapidamente el estado publicado sin secretos, correr tambien:

```bash
npm run diagnose:deployment -- --targets artifacts/deployment-targets.json --output artifacts/deployment-diagnosis.json
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
13. Respaldar el estado del repo en `E:/ADUANA/TradeLogic/backups`.

## Criterios de no-go

- Render API no llega a estado live o `/version` no reporta el commit esperado.
- Vercel web no llega a estado ready/production.
- `/ready` no devuelve `database: ok`.
- El smoke autenticado no puede resolver `/api/v1/me` con organizacion y roles.
- El catalogo oficial no pasa `npm run verify:tariff-source`.

## Pendientes operativos

- Activar el Background Worker de Render y verificar sus logs de arranque, Redis y procesamiento de una cola real.
- Ejecutar el smoke autenticado y el recorrido manual UI/PDF del piloto.
- Probar la ingesta DOF y el enriquecimiento Anthropic contra servicios reales cuando estén configuradas sus credenciales.

## Recuperacion de deploy atorado en Render

Si `GET /health` y `GET /ready` responden 200 pero `GET /version` devuelve 404, Render esta sirviendo una version anterior de la API. En ese caso el problema no es Supabase ni Vercel: el ultimo deploy no llego a publicarse.

1. Abrir Render API dashboard: https://dashboard.render.com/web/srv-d9rvfk8n74is73fl9bt0
2. Entrar al ultimo deploy y revisar logs de runtime, no solo build logs.
3. Confirmar que el commit del deploy sea el mismo que `git rev-parse HEAD`.
4. Revisar Settings -> Build & Deploy. El servicio web debe usar exactamente:

```text
Build Command:
pnpm install --frozen-lockfile --prod=false && pnpm --filter @platform/api... build

Pre-Deploy Command:
pnpm --filter @platform/db prisma:deploy

Start Command:
pnpm --filter @platform/api start
```

5. Si el dashboard conserva un comando largo que ejecuta `tariff:import` o arranca worker y API juntos, reemplazarlo. La importacion FA/NICO es una operacion controlada posterior al deploy; no debe ejecutarse en cada arranque del servicio web.
6. Ejecutar Manual Deploy -> Deploy latest commit.
7. Confirmar el commit publicado:

```bash
curl https://tradelogic-api.onrender.com/version
```

La respuesta debe incluir `commitSha` con el commit esperado. Despues correr `npm run diagnose:deployment -- --targets artifacts/deployment-targets.json` y el smoke publico con `--expected-commit`. En Render, el `healthCheckPath` del web service debe ser `/health`; `/ready` valida dependencias y se usa para smoke/monitoreo, no para promover deploys.

### Caso Redis mal configurado

Si los logs del runtime muestran errores rojos como `getaddrinfo ENOTFOUND red...`, revisar `REDIS_URL` antes de empujar mas commits. Ese error indica que la API intenta resolver un host Redis incompleto o inexistente.

1. En Render, crear o abrir el recurso **Key Value** usado por TradeLogic.
2. Copiar su **Internal Redis URL** completa. Debe empezar con `redis://` y verse como `redis://red-xxxxxxxxxxxxxxxxxxxx:6379`.
3. En el servicio `tradelogic-api`, entrar a **Environment** y configurar `REDIS_URL` con esa URL completa.
4. Guardar cambios y ejecutar **Manual Deploy -> Clear build cache & deploy**.
5. Confirmar que `/ready` incluya `redis: ok` y que `/version` reporte el commit esperado.

Mientras `/version` siga reportando un commit anterior y `/ready` no incluya `redis: ok`, no conviene empujar otro commit: cada push puede disparar otro deploy encima del problema original y complicar el diagnostico.

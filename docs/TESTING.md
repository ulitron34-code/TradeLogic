# Estrategia de pruebas

## Objetivo

Proteger el flujo minimo del MVP antes de conectar servicios externos como Supabase, Vercel o GitHub Actions.

## Cobertura agregada

### API

`apps/api/src/routes.test.ts` usa `buildApp()` con dependencias inyectadas para correr sin PostgreSQL ni Redis reales.

Casos cubiertos:

- Crear producto con version inicial.
- Crear caso de clasificacion con `Idempotency-Key`.
- Repetir el mismo request y recibir la misma respuesta idempotente.
- Reutilizar la misma llave con payload distinto y recibir `409 IDEMPOTENCY_CONFLICT`.
- Enviar un caso `DRAFT` a `INTAKE` y encolar `classification.case.submitted`.

### Dominio

`packages/domain/src/index.test.ts` prueba el ranking deterministico sin infraestructura.

Casos cubiertos:

- Producto electronico rankea una fraccion electrica sobre una plastica generica.
- Contradiccion textil/circuito fuerza revision humana.

## Estado actual

- La suite completa pasa con 19 tareas Turbo y 95 pruebas; incluye API, dominio, base de datos, IA, regulatorio, jurisprudencia y worker.
- El catalogo oficial NICO/LIGIE de 11,507 registros tiene una prueba de integridad que valida claves unicas, NICO de dos digitos y ausencia de tasas inventadas.
- Las pruebas API incluyen aislamiento multiempresa para productos, casos, documentos, alertas, escenarios de costo y auditorias.

## Pendiente

- Ejecutar pruebas contra PostgreSQL/Supabase y Redis reales despues de publicar migraciones.
- Completar el smoke test navegador con una cuenta piloto y validar el worker desplegado.
- Agregar pruebas de repositorios Prisma reales con dos organizaciones en un entorno controlado.
## Smoke test de produccion

Despues de cada deploy, registrar las URLs publicas sin secretos y ejecutar el smoke test sin credenciales para validar que API y web respondan antes de iniciar pruebas autenticadas. Los smoke tests usan 30 segundos de timeout y 2 reintentos por defecto para tolerar arranques frios de Render; ajusta `--timeout-ms` o `--retries` si el servicio esta despertando:

```bash
npm run record:deployment-targets -- --api-base-url https://TU_API_RENDER --web-base-url https://TU_WEB --output artifacts/deployment-targets.json
npm run smoke:production -- --targets artifacts/deployment-targets.json --output artifacts/smoke-production.json
```

Tambien puede usar variables de entorno directamente:

```bash
API_BASE_URL=https://TU_API_RENDER APP_BASE_URL=https://TU_WEB npm run smoke:production
```

Criterio de exito:

- `GET /health` responde HTTP 2xx con `status: ok`.
- `GET /ready` responde HTTP 2xx con `status: ready` y `database: ok`.
- La web, si se proporciona `--web-base-url`, responde con HTTP menor a 500.

Si se usa `--output`, guardar el JSON junto con la evidencia del deploy o piloto. Ese archivo incluye fecha de ejecucion, URLs consultadas, codigos HTTP y resultado de cada check.

Este smoke test no reemplaza la prueba autenticada de producto -> evidencia -> caso -> revision; solo confirma que el despliegue quedo vivo y conectado a base de datos.

## Smoke test autenticado

Cuando exista una cuenta piloto y se tenga un access token de Supabase para esa sesion, ejecutar el smoke autenticado de solo lectura. Tambien usa los reintentos por defecto para evitar falsos negativos por arranque frio:

```bash
TRADELOGIC_ACCESS_TOKEN=eyJ... npm run smoke:authenticated -- --targets artifacts/deployment-targets.json --output artifacts/smoke-authenticated.json
```

Criterio de exito:

- `GET /api/v1/me` devuelve email, organizacion y roles del usuario autenticado.
- `GET /api/v1/products` devuelve un envelope `data` de arreglo.
- `GET /api/v1/classification-cases` devuelve un envelope `data` de arreglo.
- `GET /api/v1/alerts` devuelve un envelope `data` de arreglo.

El script es read-only: no crea productos, casos ni alertas. Guardar el JSON de `--output` como evidencia del piloto autenticado.

Despues de importar FA/NICO en Supabase, repetir el smoke autenticado con validacion estricta del catalogo:

```bash
TRADELOGIC_ACCESS_TOKEN=eyJ... npm run smoke:authenticated -- --targets artifacts/deployment-targets.json --require-tariff-catalog --output artifacts/smoke-authenticated.json
```

## Evidencia manual del piloto

Despues de completar la importacion FA/NICO y el smoke autenticado con `--require-tariff-catalog`, generar una plantilla con:

```bash
npm run write:pilot-manual-evidence-template -- --output artifacts/manual-pilot-run.json
```

Completar `tester`, `commitSha`, IDs del producto/caso y cada paso del recorrido real: login, producto, evidencia, caso, submit, revision y descarga del expediente PDF. El archivo solo debe quedar con `status: "ok"` cuando no haya bloqueos y todos los pasos esten en `ok`.

Antes de cerrar el piloto, revisar faltantes sin fallar la preparacion:

```bash
npm run audit:pilot-readiness -- --artifacts-dir artifacts --output artifacts/pilot-readiness.json
```

Cuando el reporte quede en `status: "ok"`, ejecutar `npm run verify:pilot-evidence -- --artifacts-dir artifacts` como compuerta estricta.

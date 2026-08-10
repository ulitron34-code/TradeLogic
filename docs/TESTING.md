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

Despues de cada deploy, ejecutar el smoke test sin credenciales para validar que API y web respondan antes de iniciar pruebas autenticadas:

```bash
npm run smoke:production -- --api-base-url https://TU_API_RENDER --web-base-url https://TU_WEB --output artifacts/smoke-production.json
```

Tambien puede usar variables de entorno:

```bash
API_BASE_URL=https://TU_API_RENDER APP_BASE_URL=https://TU_WEB npm run smoke:production
```

Criterio de exito:

- `GET /health` responde HTTP 2xx con `status: ok`.
- `GET /ready` responde HTTP 2xx con `status: ready` y `database: ok`.
- La web, si se proporciona `--web-base-url`, responde con HTTP menor a 500.

Si se usa `--output`, guardar el JSON junto con la evidencia del deploy o piloto. Ese archivo incluye fecha de ejecucion, URLs consultadas, codigos HTTP y resultado de cada check.

Este smoke test no reemplaza la prueba autenticada de producto -> evidencia -> caso -> revision; solo confirma que el despliegue quedo vivo y conectado a base de datos.

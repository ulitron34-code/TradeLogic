# Plataforma de Inteligencia Aduanera y Fiscal

Paquete de arranque técnico v1.0 para construir el MVP en un monorepo TypeScript.

## Objetivo

Crear una plataforma multiempresa para clasificación arancelaria asistida, vigilancia regulatoria, alertas de impacto, divisas, simulación determinista de costos, validación documental, expediente defendible y auditoría histórica.

## Principios no negociables

1. La IA propone y explica; los cálculos fiscales y reglas críticas son deterministas.
2. Toda conclusión regulatoria conserva fuente, fecha, versión y evidencia.
3. Ningún resultado crítico se presenta como resolución vinculante.
4. El aislamiento por organización se prueba automáticamente.
5. La revisión humana es obligatoria cuando la política de confianza lo indique.

## Stack propuesto

- Monorepo: pnpm + Turborepo
- Web: Next.js + TypeScript
- API: Fastify + TypeScript
- Workers: Node.js + BullMQ
- Base de datos: PostgreSQL + Prisma
- Cache/colas: Redis
- Storage: S3 compatible
- Contratos: OpenAPI + JSON Schema
- Observabilidad: OpenTelemetry

## Arranque local

```bash
cp .env.example .env
pnpm install
docker compose up -d postgres redis minio
pnpm db:generate
pnpm db:migrate
pnpm dev
```

## Estructura

- `apps/web`: interfaz Next.js.
- `apps/api`: API REST y SSE.
- `apps/worker`: trabajos de ingestión, documentos y alertas.
- `packages/db`: Prisma y repositorios.
- `packages/contracts`: esquemas compartidos.
- `packages/domain`: reglas de negocio puras.
- `packages/config`: validación de variables.
- `openapi`: contrato HTTP.
- `docs`: ADR, backlog y tickets iniciales.

## Primer hito

Un usuario de una organización puede registrar un producto, abrir un caso de clasificación, adjuntar evidencia, recibir candidatos explicables, enviar a revisión humana y generar un expediente PDF con snapshot normativo.

## Estado implementado

Ver `docs/IMPLEMENTATION_STATUS.md` para el corte actual.

Endpoints disponibles en la API inicial:

- `GET /health`
- `GET /api/v1/me`
- `GET /api/v1/products`
- `POST /api/v1/products`
- `GET /api/v1/products/:id`
- `POST /api/v1/classification-cases`
- `POST /api/v1/classification-cases/:caseId/submit`
- `GET /api/v1/classification-cases/:caseId`

La creacion y el envio de casos usan `Idempotency-Key` y persisten un registro para repetir la misma respuesta ante reintentos seguros. El envio encola `classification.case.submitted` para que el worker inicie analisis.
## Clasificador deterministico inicial

El worker `classification-analysis` ya genera candidatos arancelarios desde el catalogo semilla `TariffCode`, calcula confianza, registra auditoria y decide `NEEDS_INFORMATION`, `NEEDS_REVIEW` o `APPROVED`. Ver `docs/DETERMINISTIC_CLASSIFIER.md`.
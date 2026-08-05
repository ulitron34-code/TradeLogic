# Primeros tickets para GitHub

## EPIC-01 Fundación técnica

### T-001 Inicializar monorepo
**Resultado:** pnpm, Turbo, aplicaciones y paquetes compilan localmente.  
**Aceptación:** `pnpm build`, `pnpm lint` y `pnpm typecheck` concluyen sin errores.

### T-002 Infraestructura local
**Resultado:** PostgreSQL, Redis y MinIO levantan con Docker Compose.  
**Aceptación:** healthchecks verdes y buckets creados por script.

### T-003 Validación de configuración
**Resultado:** todas las variables se validan al arrancar.  
**Aceptación:** la aplicación falla con mensaje seguro si falta una variable obligatoria.

## EPIC-02 Identidad y organizaciones

### T-010 Modelar usuarios, organizaciones y membresías
**Aceptación:** migración Prisma, seed y pruebas de unicidad.

### T-011 Middleware de contexto organizacional
**Aceptación:** `organizationId` se deriva del token y no del body.

### T-012 Pruebas anti-fuga multiempresa
**Aceptación:** usuarios de A nunca consultan ni modifican objetos de B.

## EPIC-03 Productos y documentos

### T-020 CRUD de productos y versiones
**Aceptación:** historial inmutable y versión consecutiva.

### T-021 Carga firmada a storage
**Aceptación:** MIME, tamaño, hash SHA-256 y registro de auditoría.

### T-022 Extracción documental asincrónica
**Aceptación:** estado visible, reintentos y campos críticos pendientes de confirmación.

## EPIC-04 Clasificación

### T-030 Crear y enviar caso
**Aceptación:** idempotencia, estados válidos y evento publicado.

### T-031 Recuperación de códigos candidatos
**Aceptación:** candidatos vigentes con fuente y versión.

### T-032 Contrato de salida de agentes
**Aceptación:** JSON Schema obligatorio; rechazo de citas inexistentes.

### T-033 Política de confianza
**Aceptación:** casos bajos, contradictorios o críticos van a revisión humana.

### T-034 Expediente PDF
**Aceptación:** incluye hashes, fuentes, snapshot, revisión, versión de motor y disclaimer.

## EPIC-05 Regulación y alertas

### T-040 Registro de fuentes regulatorias
**Aceptación:** URL, hash, autoridad, fecha, original y versión.

### T-041 Comparador de versiones
**Aceptación:** diferencias trazables por disposición.

### T-042 Motor de impacto
**Aceptación:** cruza referencias contra productos y operaciones de la organización.

### T-043 Centro de alertas
**Aceptación:** severidad, acuse, snooze, deduplicación y tareas.

## EPIC-06 Divisas y costos

### T-050 Snapshot FX
**Aceptación:** fuente, fecha efectiva, tasa y recuperación histórica.

### T-051 Motor determinista de costos
**Aceptación:** fórmula explicable, reglas versionadas, redondeos y pruebas doradas.

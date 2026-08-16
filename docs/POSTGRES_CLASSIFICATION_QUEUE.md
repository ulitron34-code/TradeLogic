# Cola de clasificación en PostgreSQL

## Motivo

Upstash Redis alcanzó el límite mensual de solicitudes. Para no detener el flujo principal, la clasificación ya no depende de Redis.

## Flujo nuevo

```text
API -> ClassificationJob en Supabase/PostgreSQL -> worker Render -> análisis -> candidatos/auditoría -> UI
```

La API registra el evento de clasificación con `eventId` único. El worker consulta cada dos segundos, reclama un trabajo con `FOR UPDATE SKIP LOCKED`, lo marca `ACTIVE`, ejecuta el clasificador existente y lo marca `COMPLETED` o `FAILED`.

## Reintentos y recuperación

- Los trabajos fallidos se reintentan hasta tres veces.
- Un trabajo `ACTIVE` con más de cinco minutos puede volver a ser reclamado.
- Los diagnósticos de operaciones leen ahora `ClassificationJob` y se filtran por organización.
- `/ready` valida PostgreSQL, no Redis.

## Alcance temporal

Este cambio mantiene operativo el flujo de clasificación. Las ingestas programadas de DOF y jurisprudencia que dependían de BullMQ quedan pausadas hasta crear un scheduler alternativo respaldado por PostgreSQL. No se pierde el código de esas ingestas; únicamente se separan del camino crítico.

## Despliegue

La migración `7_add_postgres_classification_queue` debe aplicarse antes de que el worker procese trabajos nuevos. Render ya ejecuta `prisma migrate deploy` antes de iniciar los servicios según el runbook existente.

## Verificación

1. Confirmar `/health` y `/ready` en Render.
2. Crear o reencolar un caso de prueba.
3. Revisar `/api/v1/ops/classification-queue` con sesión autenticada.
4. Confirmar estados `waiting -> active -> completed`.
5. Confirmar candidatos y auditoría en el caso.
6. Guardar evidencia en `artifacts/` y generar respaldo en `E:\ADUANA\TradeLogic\backups`.

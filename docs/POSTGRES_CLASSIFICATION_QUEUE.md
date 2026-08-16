# Colas PostgreSQL de TradeLogic

## Motivo

La clasificacion, DOF y jurisprudencia no deben detenerse por el costo o los limites de Redis. Las tres capacidades usan ahora PostgreSQL como transporte durable y el worker de Render como ejecutor.

## Flujos

```text
API -> ClassificationJob en Supabase/PostgreSQL -> worker Render -> analisis -> candidatos/auditoria -> UI
worker -> IngestionJob REGULATORY -> ingesta DOF -> fuentes/provisiones/alertas
worker -> IngestionJob JURISPRUDENCE -> tesis -> embeddings/referencias arancelarias
```

La API registra cada evento de clasificacion con `eventId` unico. El worker consulta cada dos segundos y reclama trabajos con `FOR UPDATE SKIP LOCKED`. Los trabajos activos abandonados se recuperan despues de cinco minutos para clasificacion y diez minutos para ingestas.

## Programacion

- DOF: cada hora.
- Jurisprudencia: cada siete dias.
- Fallos transitorios: hasta tres reintentos con espera incremental.
- Cada tipo de ingesta tiene una sola fila global en `IngestionJob`, evitando duplicados si se ejecuta mas de una instancia.

## Despliegue

La migracion `7_add_postgres_classification_queue` y la migracion `8_add_postgres_ingestion_scheduler` deben aplicarse antes de procesar trabajos nuevos. Render ejecuta `prisma migrate deploy` antes de iniciar los servicios segun el runbook existente.

## Verificacion

1. Confirmar `/health` y `/ready` en Render.
2. Confirmar en logs `transport: postgresql` y las colas `regulatory-postgres` y `jurisprudence-postgres`.
3. Confirmar `postgres ingestion job received` y `postgres ingestion job completed`.
4. Para clasificacion, revisar estados `waiting -> active -> completed`, candidatos y auditoria.
5. Para DOF y jurisprudencia, confirmar una respuesta real de la fuente externa y el registro persistido.

Redis queda opcional para estos tres caminos; no se elimina de la configuracion heredada hasta hacer una limpieza separada de variables y servicios.

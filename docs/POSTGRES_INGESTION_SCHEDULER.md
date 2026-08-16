# Programador PostgreSQL para DOF y jurisprudencia

## Objetivo

Mantener activas las ingestas oficiales de DOF y jurisprudencia sin pagar ni depender de Redis. El worker de Render usa PostgreSQL como almacenamiento durable de la agenda y como mecanismo de bloqueo entre instancias.

## Flujo

1. Al iniciar, el worker crea, si no existen, los trabajos globales `REGULATORY` y `JURISPRUDENCE`.
2. Reclama un trabajo vencido con `FOR UPDATE SKIP LOCKED`.
3. Ejecuta el adaptador existente de DOF o del Semanario Judicial.
4. Conserva la deduplicacion y persistencia actuales.
5. Programa la siguiente ejecucion: DOF cada hora y jurisprudencia cada siete dias.
6. Reintenta tres veces los errores transitorios y libera bloqueos abandonados despues de diez minutos.

## Que verificar en Render

- El servicio `Trade logic worker` debe desplegar el commit que contiene la migracion `8_add_postgres_ingestion_scheduler`.
- El arranque debe registrar `transport: postgresql` y las colas `regulatory-postgres` y `jurisprudence-postgres`.
- Despues de aplicar la migracion, los logs deben mostrar `postgres ingestion job received` y `postgres ingestion job completed`.
- Un fallo de la fuente externa no debe apagar el worker: debe aparecer como `postgres ingestion job failed` y reintentarse.

## Alcance y limite actual

Esto corrige la disponibilidad operativa del programador. La validacion de contenido oficial todavia requiere observar una ejecucion real y confirmar que el DOF y el buscador de jurisprudencia responden, que el registro se persiste y que las alertas o referencias muestran la fuente correcta.

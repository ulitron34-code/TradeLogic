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

- La suite completa pasa con 19 tareas Turbo y 89 pruebas; incluye API, dominio, base de datos, IA, regulatorio, jurisprudencia y worker.
- El catalogo oficial NICO/LIGIE de 11,507 registros tiene una prueba de integridad que valida claves unicas, NICO de dos digitos y ausencia de tasas inventadas.
- Las pruebas API incluyen aislamiento multiempresa para productos, casos, documentos, alertas, escenarios de costo y auditorias.

## Pendiente

- Ejecutar pruebas contra PostgreSQL/Supabase y Redis reales despues de publicar migraciones.
- Completar el smoke test navegador con una cuenta piloto y validar el worker desplegado.
- Agregar pruebas de repositorios Prisma reales con dos organizaciones en un entorno controlado.

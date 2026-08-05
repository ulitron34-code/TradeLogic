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

## Pendiente

- Ejecutar la suite cuando `pnpm install` complete sin cortes de red.
- Agregar pruebas del worker con DB fake o repositorios abstraidos.
- Agregar pruebas anti-fuga multiempresa para cada repositorio real.
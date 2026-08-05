# Estado de Implementacion

Actualizado: 2026-08-05

## Avance aplicado en esta iteracion

- API separada en `server.ts` y `routes.ts`.
- Contexto dev persistido con usuario, organizacion y membresia estables.
- CRUD inicial de productos:
  - `GET /api/v1/products`
  - `POST /api/v1/products`
  - `GET /api/v1/products/:id`
- Creacion persistida de casos de clasificacion con producto/version:
  - `POST /api/v1/classification-cases`
  - `GET /api/v1/classification-cases/:caseId`
- Registro de auditoria al crear casos.
- Submit de casos implementado: `POST /api/v1/classification-cases/:caseId/submit` cambia `DRAFT`/`NEEDS_INFORMATION` a `INTAKE`, registra auditoria y encola `classification.case.submitted`.
- Worker escucha `classification-analysis` y cambia casos `INTAKE` a `IN_ANALYSIS` al iniciar procesamiento.
- Modelo `IdempotencyRecord` para repetir respuestas si se reusa la misma llave con el mismo payload y rechazar conflictos.
- Seed idempotente para evitar duplicar la organizacion piloto.
- OpenAPI actualizado con productos y payloads implementados.
- Scripts `lint` ajustados para no depender de ESLint antes de configurarlo formalmente.
- Scripts `test` ajustados con `--passWithNoTests` mientras se crea la primera suite.

## Pendiente inmediato

1. Completar `pnpm install` cuando npm deje de cortar descargas.
2. Ejecutar `pnpm db:generate` y `pnpm db:migrate`.
3. Ejecutar `pnpm typecheck` y `pnpm build`.
4. Crear pruebas de API con `app.inject` o separar `buildApp()` para testear sin levantar puerto.
5. Agregar repositorios con enforcement explicito de `organizationId` y pruebas anti-fuga multiempresa.
6. Conectar storage para documentos y evidencias.
7. Implementar recuperacion inicial de candidatos arancelarios.

## Bloqueo de verificacion

La instalacion ya genero `pnpm-lock.yaml` y descargo parte del arbol, pero sigue fallando por cortes `ECONNREFUSED` al descargar tarballs desde npm. Se intento `pnpm typecheck`; `pnpm` primero trato de completar instalacion y tambien fallo por red antes de ejecutar TypeScript.
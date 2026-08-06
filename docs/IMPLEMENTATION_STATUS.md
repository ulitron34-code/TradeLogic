# Estado de Implementacion

Actualizado: 2026-08-06

## Avance aplicado en esta iteracion

- API separada en `app.ts`, `server.ts` y `routes.ts`; `buildApp()` permite pruebas con dependencias inyectadas.
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
- Worker escucha `classification-analysis`, cambia casos `INTAKE` a `IN_ANALYSIS`, genera candidatos deterministas y termina en `NEEDS_INFORMATION`, `NEEDS_REVIEW` o `APPROVED`.
- Clasificador deterministico inicial agregado en `@platform/domain` con ranking por coincidencia de descripcion/atributos contra `TariffCode`.
- Seed agrega catalogo arancelario MX minimo para probar el flujo end-to-end.
- Modelo `IdempotencyRecord` para repetir respuestas si se reusa la misma llave con el mismo payload y rechazar conflictos.
- Seed idempotente para evitar duplicar la organizacion piloto.
- OpenAPI actualizado con productos y payloads implementados.
- Scripts `lint` ajustados para no depender de ESLint antes de configurarlo formalmente.
- Suite inicial de pruebas agregada para flujo critico de API: producto, caso, idempotencia y submit con cola mockeada.
- Pruebas puras agregadas para el ranking deterministico de candidatos arancelarios.
- Guias de publicacion agregadas para GitHub, Supabase, Vercel y siguiente sesion.
- Scripts de preflight local agregados para validar estructura, JSON y posibles secretos obvios sin depender de instalacion completa.
- Referencia de `F:\13apps` documentada para capturar patrones reutilizados de COBITO.

## Pendiente inmediato

1. Completar `pnpm install` cuando npm deje de cortar descargas.
2. Ejecutar `pnpm db:generate` y `pnpm db:migrate`.
3. Ejecutar `pnpm typecheck`, `pnpm test` y `pnpm build`.
4. Agregar repositorios con enforcement explicito de `organizationId` y pruebas anti-fuga multiempresa.
5. Conectar storage para documentos y evidencias.
6. Reemplazar catalogo semilla por ingesta LIGIE/DOF completa y recuperacion regulatoria versionada.
7. Agregar pruebas del worker con DB fake o repositorios abstraidos.

## Bloqueo de verificacion

La instalacion ya genero `pnpm-lock.yaml` y descargo parte del arbol, pero sigue fallando por cortes `ECONNREFUSED` al descargar tarballs desde npm. Se intento `pnpm typecheck`; `pnpm` primero trato de completar instalacion y tambien fallo por red antes de ejecutar TypeScript.
# Estado de Implementacion

Actualizado: 2026-08-08

## Avance aplicado en esta iteracion (2026-08-08, bloque 5: UI real + revision humana)

- `POST /api/v1/classification-cases/:caseId/review` nueva: primer RBAC real del repo (solo `OWNER`/`ADMIN`/`REVIEWER`, `RBAC.md`), solo transiciona desde `NEEDS_REVIEW`, crea `HumanReview`, y decide el siguiente estado — `APPROVED` (fija `selectedCodeId` con el candidato rank 1) o `REJECTED` son terminales; `CHANGES_REQUESTED` regresa el caso a `NEEDS_INFORMATION` para poder corregir y reenviar. 5 pruebas nuevas (RBAC, transicion invalida, y las tres decisiones).
- `GET /api/v1/me` ahora tambien devuelve `email` y `organizationName` (ya estaban cargados en el contexto de auth, sin query nueva) para el nav.
- UI real completa por primera vez: layout con nav (organizacion/usuario/salir, solo visible con sesion activa), formulario de creacion de producto en `/products`, boton "Iniciar caso de clasificacion" en `/products/[id]`, y pagina nueva `/cases/[id]` (estado, enviar a analisis, candidatos con score/banda de confianza — reutiliza `confidenceBand` de `@platform/domain` en vez de duplicar la logica —, rationale, evaluacion de IA cuando existe, contradicciones, historial de revisiones, y acciones de revision solo visibles si el rol del usuario aplica y el caso esta en `NEEDS_REVIEW`).
- **No verificado en un navegador real en esta sesion**: Docker no esta disponible en este entorno (sin Redis local) y no hay credenciales de login a mano, asi que no se pudo hacer login -> crear producto -> subir evidencia -> iniciar caso -> enviar -> revisar de punta a punta. Typecheck/test/build si corrieron en verde para las 9 paquetes. Recomendado: el usuario haga una pasada manual rapida antes de confiar en el flujo completo.

## Avance aplicado en esta iteracion (2026-08-08, bloque 4: capa de IA)

- `packages/ai` nuevo: cliente `@anthropic-ai/sdk` (`claude-opus-5`, salida estructurada via `output_config.format` contra `AgentResultJsonSchema`). El ranking/score deterministico de `@platform/domain` no cambia; la IA solo agrega `rationale.ai_enrichment` (claims con evidencia citada) a los candidatos que ya calculo el clasificador.
- Validacion en dos capas antes de aceptar cualquier respuesta del modelo: schema `AgentResult` (zod, ya existia en `@platform/contracts`) y rechazo explicito (T-032) de cualquier `claim.evidence.sourceId` que no sea uno de los ids de `TariffCode` ya rankeados deterministicamente — cualquier fallo (sin API key, red, JSON invalido, schema invalido, cita inventada, refusal) hace que `enrichClassification` devuelva `null` sin lanzar, asi que `apps/worker` sigue exactamente igual sin esta capa.
- `packages/contracts` ahora tambien exporta `AgentResultJsonSchema` (lee `schemas/agent-result.schema.json` en runtime) para pasarselo a Claude como `output_config.format`, reutilizando el mismo contrato que ya validaba con zod en vez de duplicarlo con ajv.
- `enrichClassification` acepta un `createMessage` inyectable (mismo patron de dependencias que `RouteDependencies` en `apps/api`), lo que permitio probar el validador y el rechazo de citas con fixtures sin llamadas reales a Anthropic (9 pruebas nuevas en `packages/ai`).
- Pendiente (fuera de alcance de este bloque, no probado en vivo): no hay `ANTHROPIC_API_KEY` real todavia, asi que la capa esta escrita y probada con fixtures pero no ejercida contra la API real. No se agrego el parametro `fallbacks` de refusal (server-side fallback) — la funcion ya degrada con seguridad ante un refusal (devuelve `null`), pero no reintenta en otro modelo; queda como mejora futura si el volumen de refusals en produccion lo justifica.

## Avance aplicado en esta iteracion (2026-08-08, bloque 3: storage)

- `packages/storage` nuevo: cliente S3 (`@aws-sdk/client-s3` + `s3-request-presigner`), URL de subida firmada con TTL de 5 minutos, `HeadObject` para verificar lo realmente subido.
- `POST /api/v1/documents/presign` y `POST /api/v1/documents`: el registro valida que el `storageKey` empiece con `org/{organizationId}/` (evita que una organizacion registre un archivo subido por otra) y que `size_bytes` coincida con el objeto real en el bucket antes de crear el `Document`.
- Bug real encontrado al escribir la ruta: `Document.sizeBytes` es `BigInt` en Prisma y Fastify no lo sabe serializar (`TypeError`); corregido una sola vez en `@platform/db` con `BigInt.prototype.toJSON`, no solo en la ruta nueva — tambien afectaba la lectura de `evidence.document` en `GET /classification-cases/:caseId`, que hoy no tenia pruebas que lo cubrieran.
- `apps/web/app/products/[id]` nuevo (antes no existia, solo el link roto desde `/products`): sube evidencia con URL firmada, calcula `sha256` en el navegador (Web Crypto) antes de subir.
- Limitacion documentada en `docs/SUPABASE_PRISMA_SETUP.md`: el hash se confia del cliente, sin re-hash server-side todavia.

## Avance aplicado en esta iteracion (2026-08-08)

- Bloqueo real de instalacion resuelto: no era de red, era que el working copy vivia en una unidad exFAT (USB), que no soporta los hardlinks que pnpm necesita. Working copy movido a `C:\Users\ulitr\TradeLogic` (NTFS); `E:\ADUANA\MVP_Tecnico` queda como copia de respaldo.
- `pnpm typecheck`/`test`/`build` corrieron de verdad por primera vez y fallaban: import roto de `ioredis`, faltaba `@types/node` en `packages/db`, tipado de error de Fastify, cast de JSON de Prisma, fixtures de test desalineadas, y un bug real en el clasificador (tokenizador sin singular/plural en espanol). Todo corregido; `pnpm test` agregado a `ci.yml` (antes solo corria typecheck+build).
- `packages/config` valida ahora todas las variables de `.env.example`, no solo 5, y carga `.env` de la raiz automaticamente (antes `pnpm dev` fallaba siempre fuera de Docker Compose).
- Auth real con Supabase Auth: `apps/api/src/auth.ts` verifica JWT contra el JWKS del proyecto, resuelve `User`/`Membership` (nunca confia `organizationId` del cliente). `ensureDevContext` solo sobrevive detras de `DEV_AUTH_BYPASS` y nunca en `NODE_ENV=production`.
- RLS real en Supabase, verificada en produccion: `packages/db` expone `scopeToOrganization()` (fija `app.current_org_id` por operacion via `set_config`, parametrizado). `supabase/rls.sql` tiene las politicas reales, incluyendo el hallazgo de que el SQL editor de Supabase auto-activa RLS sin politicas en cualquier tabla nueva (bloqueaba 12 tablas que no estaban en el plan original hasta que se corrigio). Rol `app_user` dedicado sin `BYPASSRLS` (el `postgres` de siempre es superusuario y ignora RLS por completo).
- Historial de migraciones de Prisma establecido por primera vez (`prisma/migrations/0_init`); antes todo el esquema vivia solo en `supabase/init.sql` corrido a mano, con drift real (foreign keys faltantes) contra el schema.
- Login real probado de punta a punta contra produccion: Supabase Auth -> JWT -> API -> Postgres con RLS, incluyendo escritura (`POST /api/v1/products` con 201 real).
- `apps/web` tiene su primera UI real: login, middleware de sesion, pagina de productos conectada a la API con el JWT de la sesion. Tailwind agregado.

## Avance aplicado en esta iteracion (2026-08-06, historico)

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

1. Ingesta regulatoria DOF real (conector a `diariooficial.gob.mx`, verificado que responde JSON real en vivo) — unico bloque que queda del plan original de 6.
2. Verificar el flujo completo de la UI en un navegador real (login -> crear producto -> subir evidencia -> iniciar caso -> enviar -> revisar) — no se pudo hacer en esta sesion por falta de Docker/Redis local y credenciales.
3. Agregar pruebas del worker con DB fake o repositorios abstraidos (incluido el punto de enganche de `enrichClassification`, hoy solo probado a nivel de `packages/ai`).
4. Probar la capa de IA contra la API real de Anthropic en cuanto haya `ANTHROPIC_API_KEY` — hoy solo esta verificada con fixtures.
5. Alertas de UI para regulacion (queda fuera del alcance actual, mencionado en el README original).

## Notas operativas

- `DATABASE_URL`/`DIRECT_URL` en `.env` local ya usan el rol `app_user` (no `postgres`) para que RLS aplique de verdad.
- Al agregar una tabla nueva via SQL editor de Supabase: verificar su estado de RLS explicitamente (ver `supabase/rls.sql`), no asumir que queda abierta por default.
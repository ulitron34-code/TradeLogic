# Estado de Implementacion

Actualizado: 2026-08-10

## Verificacion de produccion (2026-08-10)

- Render ejecuta `DIRECT_URL="$DATABASE_URL" pnpm --filter @platform/db prisma:deploy` antes de iniciar API y worker; se usa el pooler de Supabase porque el host directo `db.*:5432` no es accesible desde Render.
- Supabase confirma las migraciones `0_init` a `6_add_tariff_trade_rates` finalizadas. Las migraciones 1 y 2 tienen ademas una fila historica revertida por los intentos fallidos; las filas aplicadas actuales estan finalizadas y no bloquean `migrate deploy`.
- Se verifico que existen las tablas `RegulatoryRequirement`, `JurisprudenceCase`, `HistoricalAuditRun` y `HistoricalDeclaration`, junto con sus columnas y politicas RLS. `/health` y `/ready` de Render responden 200; `/ready` confirma `database: ok`.
- El catalogo CSV oficial ya esta versionado en el repositorio. El importador cuenta con dry-run sin conexion a Prisma y guardia de conteo esperado (`--expected-records 20227`); la importacion masiva en la base de produccion sigue pendiente de ejecutar desde el entorno controlado.

## Correccion de estado (2026-08-10)

El worker ya cuenta con pruebas inyectables en `apps/worker/src/classificationAnalysis.test.ts` y `apps/worker/src/regulatoryIngestion.test.ts`. La refactorizacion de `classification-analysis` permite probar ranking, persistencia de candidatos, estados finales y bloqueo por falta de version del producto. La suite del worker queda en 7 pruebas; la validacion completa de monorepo (test, typecheck y build) esta en verde.

## Plan original de 6 bloques: COMPLETO

Los 6 bloques del plan aprobado el 07 Ago 2026 (`ancient-coalescing-hinton.md`) estan cerrados: CI/config, auth real + multiempresa, storage, capa de IA, UI real, ingesta regulatoria DOF.

## Avance aplicado en esta iteracion (2026-08-08, post-plan: primeros diferenciadores del plan maestro actualizado)

Del `TradeLogic_Informe_Sesion_y_Plan_Maestro_v1.md` (entregado esta misma sesion, ver `E:\ADUANA`), se implementaron los dos diferenciadores que no tenian bloqueo externo (sin credenciales de WhatsApp, sin datos de tasas arancelarias reales, etc.):

- **Pantalla de alertas** (`GET /api/v1/alerts`, `POST /api/v1/alerts/:alertId/status`, pagina `/alerts`): el modelo `Alert` ya existia desde el bloque 6 (lo llena el worker de ingesta regulatoria) pero no habia ninguna pantalla para verlas — era la brecha mas obvia entre lo construido y lo visible para el usuario. Transiciones de estado limitadas por el estado actual (`OPEN` -> `ACKNOWLEDGED`/`DISMISSED`, etc.), no un cambio de estado libre.
- **Calculadora de landed cost** (`packages/domain` funcion pura `calculateLandedCost`, `POST`/`GET /api/v1/classification-cases/:caseId/cost-scenarios`, seccion nueva en `/cases/[id]`): usa el modelo `CostScenario` que ya existia en el schema desde el bloque 2 (tenia RLS aplicada) pero nunca se habia usado. Calcula DTA (8 al millar, formula real de la Ley Federal de Derechos), IVA (16% por defecto, parametrizable), y arancel — **el arancel se captura manualmente** porque no hay una fuente de tasas arancelarias reales (T-MEC/general) seedeada; inventar una tasa habria producido un calculo financiero incorrecto. Documentado como limitacion explicita en la UI, no oculto.
- Bug real encontrado al construir esto: el bundler de Next.js (webpack) no resuelve imports relativos internos con extension `.js` que apuntan a un archivo `.ts` (a diferencia de `tsc`/`tsx`, que si lo hacen via `moduleResolution: NodeNext`). Al separar `calculateLandedCost` en su propio archivo dentro de `packages/domain` con un barrel export en `index.ts`, el build de `apps/web` fallaba con "Module not found" aunque `tsc` y `vitest` lo aceptaban sin problema. Se resolvio manteniendo la funcion dentro de `index.ts` (sin modulo interno separado) ya que `apps/web` consume este paquete directamente.
- 5 pruebas nuevas para la calculadora (`packages/domain`), 7 pruebas nuevas para las rutas de alertas y cost-scenarios (`apps/api` pasa de 23 a 30 pruebas).

## Avance aplicado en esta iteracion (2026-08-08, bloque 6: ingesta regulatoria DOF)

- `packages/regulatory` nuevo: cliente contra los endpoints **reales** del DOF, verificados con el navegador (no los asumidos en el plan original — `WS_getDiarioFecha.php`/`BB_*.php` no existen; el sitio es HTML server-renderizado, no una API JSON). Detalle completo de la discrepancia, el parsing, y el filtrado en `docs/REGULATORY_INGESTION.md` (nuevo).
- Bug real encontrado al probar contra una respuesta real: `nota_detalle.php` envuelve el documento real dentro de la pagina exterior del sitio, que trae su propio `<title>`; sin manejarlo, el titulo extraido siempre habria sido "DOF - Diario Oficial de la Federacion" en vez del titulo real de la nota.
- `apps/worker`: el worker `regulatory-ingestion` (antes un `console.log`) ahora hace el flujo completo — job repetible BullMQ (`env.REGULATORY_POLL_CRON`, registro idempotente), descarga la edicion del dia, filtra por Hacienda/Economia, guarda el HTML crudo en S3 (reusando `packages/storage` del bloque 3), hace `upsert` de `RegulatorySource` (dedupe por `sha256`) y `RegulatoryProvision`, y corre deteccion de impacto deterministica (T-042, sin IA): fracciones arancelarias mencionadas que coinciden con un `TariffCode` ya usado como `selectedCodeId` de algun caso generan `RegulatoryImpact` + `Alert` (severidad `WARNING`).
- `SourceAuthority.SHCP` agregado al enum para Hacienda (antes solo existia `SE` para Economia). La migracion esta generada en `packages/db/prisma/migrations/1_add_shcp_source_authority/` pero **no aplicada a produccion** — el rol `app_user` no tiene permiso de crear la shadow database que usa `prisma migrate dev` (restriccion de seguridad correcta, no un error). Aplicar con `prisma migrate deploy` cuando el usuario lo confirme explicitamente.
- 17 pruebas nuevas en `packages/regulatory` contra fixtures grabados (recortes reales de las paginas del DOF, truncados por tamano donde hizo falta) — sin llamadas de red en la suite, como pedia el plan.
- `packages/storage` gano `putRawObject()` (subida server-side directa, sin URL presignada) para que el worker pueda guardar el HTML crudo del DOF.

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

La lista historica de abajo conserva decisiones y bloqueos externos; los puntos de pruebas del worker deben leerse junto con la correccion de estado anterior.

El plan original de 6 bloques esta completo. Lo que queda es trabajo de endurecimiento fuera de ese alcance:

Actualizacion 2026-08-10: la jurisprudencia ya no queda aislada en el catalogo. El endpoint de detalle de caso y el expediente PDF buscan tesis del SJF cuyas referencias de fraccion coinciden con los candidatos deterministas, y muestran IUS, clave, rubro, fuente, URL y motivo de coincidencia. La coincidencia es informativa y no altera el ranking.

1. **Aplicar la migracion de `SHCP` a produccion** (`prisma migrate deploy` con permisos de superusuario) — generada pero no aplicada, ver bloque 6 arriba.
2. Verificar el flujo completo de la UI en un navegador real (login -> crear producto -> subir evidencia -> iniciar caso -> enviar -> revisar) — no se pudo hacer en esta sesion por falta de Docker/Redis local y credenciales.
3. Completar pruebas de integracion del worker desplegado con Redis/DB reales; ya existen pruebas inyectables para `classification-analysis` y `regulatoryIngestion.ts`, incluido el manejo de `enrichClassification` en su punto de enganche.
4. Probar la capa de IA contra la API real de Anthropic en cuanto haya `ANTHROPIC_API_KEY` — hoy solo esta verificada con fixtures.
5. Verificar la ingesta DOF contra el servicio real corriendo (no solo fixtures) una vez que el worker este desplegado con Redis real.
6. Ampliar fuentes regulatorias mas alla de Hacienda/Economia (ANAM/SAT/COFEPRIS/SENASICA/SEMARNAT ya estan en el enum `SourceAuthority`).
7. Ejecutar la importacion controlada del catalogo SNICE FA/NICO 2026 en produccion y despues conectar la calculadora de landed cost a tasas reales disponibles en `TariffCode`, evitando captura manual cuando el dato exista.
8. Expediente en PDF (queda fuera del alcance del plan original).
9. Del plan maestro actualizado, siguen pendientes por bloqueos externos: digest semanal por correo/WhatsApp (necesita credenciales de mensajeria), portal white-label para despachos (decision de diseño/producto antes de programar), bot de WhatsApp Business (necesita cuenta de WhatsApp Business API), conciliacion IMMEX (modulo nuevo, requiere diseño de datos).

## Notas operativas

- `DATABASE_URL`/`DIRECT_URL` en `.env` local ya usan el rol `app_user` (no `postgres`) para que RLS aplique de verdad.
- Al agregar una tabla nueva via SQL editor de Supabase: verificar su estado de RLS explicitamente (ver `supabase/rls.sql`), no asumir que queda abierta por default.

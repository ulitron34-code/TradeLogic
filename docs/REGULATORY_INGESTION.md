# Ingesta regulatoria (DOF)

## Endpoints reales — distintos a los asumidos en el plan original

El plan de este bloque asumia una API JSON (`WS_getDiarioFecha.php`, `BB_menuPrincipal.php`, `BB_DetalleEdicion.php`) verificada por WebFetch en una sesion anterior. Al implementar el bloque se verifico de nuevo, esta vez con el navegador real (inspeccionando las peticiones de red del sitio, no solo el HTML convertido a markdown), y esos endpoints **no existen** en `dof.gob.mx`. El sitio real es HTML server-renderizado con tablas anidadas de estilo de principios de los 2000, sin una API JSON separada. Los endpoints que si son reales y estan en uso:

| Endpoint | Uso | Ejemplo |
|---|---|---|
| `GET /index_111.php?year=YYYY&month=MM&day=DD` | Lista de notas publicadas ese dia, agrupadas por secretaria | `https://dof.gob.mx/index_111.php?year=2026&month=08&day=07` |
| `GET /nota_detalle.php?codigo=ID&fecha=DD/MM/YYYY` | Detalle completo de una nota (titulo + cuerpo) | `https://dof.gob.mx/nota_detalle.php?codigo=5795797&fecha=07/08/2026` |

No hay documentacion oficial de estos endpoints ni SLA — son parte del sitio publico legado del DOF, no una API publicada. Pueden cambiar de formato sin aviso; el parser en `packages/regulatory/src/dofClient.ts` esta escrito contra marcadores estables observados (`class="subtitle_azul"` para encabezados de secretaria, `class="enlaces"` para links de nota), no contra una estructura de datos con contrato.

## Encoding: no hay mojibake

El plan original asumia que habria que decodificar como `latin1`/`windows-1252` por acentos corruptos (`Protecci??n`). Verificado en vivo: el `Content-Type` de ambos endpoints declara `charset=UTF-8`, y los acentos van como entidades HTML normales (`&aacute;`, `&oacute;`, etc.), no como bytes crudos mal interpretados. `packages/regulatory/src/html.ts` decodifica esas entidades con una tabla fija de las que aparecen en el DOF — no hace falta tocar el encoding del fetch.

## Estructura anidada de `nota_detalle.php`

La respuesta de `nota_detalle.php` envuelve el documento real (un export de Word a HTML, con su propio `<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN">`, `<head>`, `<title>` y `<body>`) dentro de la pagina exterior del sitio, que trae su **propio** `<title>DOF - Diario Oficial de la Federacion</title>`. `parseNoteDetail()` busca la ultima ocurrencia del DOCTYPE anidado y parsea desde ahi — de lo contrario el titulo extraido seria siempre "DOF - Diario Oficial de la Federacion" en vez del titulo real de la nota (bug real encontrado al probar contra una respuesta real, no un caso hipotetico).

## Estrategia de filtrado

Alcance acotado para este bloque (T-042): solo se procesan notas cuya seccion de secretaria contenga `HACIENDA` (mapeada a `SourceAuthority.SHCP`, agregada al enum en esta migracion) o `ECONOMIA` (mapeada a `SourceAuthority.SE`, ya existia). Ampliable despues a ANAM/SAT/COFEPRIS/SENASICA/SEMARNAT, que ya estan en el enum `SourceAuthority` sin usar.

## Flujo de ingesta

### Estado actual de implementacion (2026-08-16)

La implementacion vigente usa `IngestionJob` en PostgreSQL y `FOR UPDATE SKIP
LOCKED`; no depende de BullMQ ni Redis. El worker procesa las secretarias
`SHCP`, `SE`, `ANAM`, `COFEPRIS`, `SENASICA` y `SEMARNAT` cuando el encabezado
del DOF se puede mapear de forma explicita. La fecha de consulta se calcula en
`America/Mexico_City` y los jobs de clasificacion, DOF y jurisprudencia son
independientes.

1. `apps/worker` registra un job repetible en la cola `regulatory-ingestion` con `repeat: { pattern: env.REGULATORY_POLL_CRON }` (hoy `0 * * * 1-5`, cada hora en dias habiles). El registro es idempotente: BullMQ dedupe por cola + patron + `jobId` fijo, asi que reiniciar el worker no crea jobs repetibles duplicados.
2. Cada corrida procesa el dia actual en UTC (simplificacion deliberada — no se uso una libreria de zonas horarias para este alcance; si el DOF publica cerca de medianoche hora Ciudad de Mexico el dia detectado podria no coincidir exactamente con el dia calendario CDMX).
3. Por cada nota relevante: se descarga el detalle, se calcula `sha256` del HTML crudo, y se verifica contra el `@@unique([authority, canonicalUrl, sha256])` ya existente en `RegulatorySource` — mismo contenido no se reprocesa; si el DOF corrige una nota, el `sha256` cambia y se ingiere como fuente nueva.
4. El HTML crudo se guarda en el bucket S3 (via `packages/storage`, el mismo paquete del bloque 3) bajo `regulatory/dof/{year}/{month}/{day}/{codigo}.html`, referenciado en `RegulatorySource.rawStorageKey`.
5. Se crea `RegulatoryProvision` con el cuerpo en texto plano y las fracciones arancelarias detectadas en `normalizedRefs`.
6. Impacto deterministico (T-042, sin IA): si el cuerpo menciona una fraccion arancelaria (`\d{4}\.\d{2}(\.\d{2})?`) que coincide con el `code` de algun `TariffCode` ya usado como `selectedCodeId` de un `ClassificationCase`, se crea un `RegulatoryImpact` y una `Alert` (severidad `WARNING`) por cada organizacion afectada.
7. Un fallo en la ingesta (el DOF esta caido, cambio su HTML, etc.) se registra en el log y no tumba el worker ni afecta la cola de clasificacion — son colas independientes.

## Pruebas

Actualizacion 2026-08-10: ademas de las 17 pruebas de fixtures de `packages/regulatory`, `apps/worker` ya prueba el punto de enganche con dependencias inyectables: filtrado por autoridad, persistencia, impactos, alertas y deduplicacion. La migracion de produccion sigue siendo un paso operativo pendiente.

`packages/regulatory` tiene 17 pruebas contra fixtures grabados (recortes reales de `index_111.php` y `nota_detalle.php`, capturados el 08 Ago 2026 y truncados por tamano donde hace falta) — sin llamadas de red en la suite. El punto de enganche en `apps/worker/src/regulatoryIngestion.ts` acepta dependencias inyectables (`db`, `fetchDailyEditions`, `fetchNoteDetail`, `putRawObject`) siguiendo el mismo patron que `RouteDependencies` en `apps/api`, pero no tiene pruebas propias todavia — ver el pendiente general de pruebas del worker en `docs/IMPLEMENTATION_STATUS.md`.

## Migracion pendiente de aplicar

Se agrego `SHCP` al enum `SourceAuthority` y se genero la migracion en `packages/db/prisma/migrations/1_add_shcp_source_authority/migration.sql`, pero **no se aplico a la base de datos de produccion** en esta sesion (el rol `app_user` no tiene permiso de crear la shadow database que usa `prisma migrate dev`, por diseno — es una restriccion de seguridad correcta). Aplicar con `prisma migrate deploy` (no requiere shadow database) cuando se confirme explicitamente.

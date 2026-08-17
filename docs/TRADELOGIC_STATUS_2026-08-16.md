# TradeLogic — estado técnico actualizado

Fecha de corte: 16 de agosto de 2026.

## Actualizacion de esta sesion

- `78e7d14b`: la pantalla de solicitudes de revisión permite a un revisor
  asignar o retirar responsable; la API valida que pertenezca a la
  organización y deja auditoría del cambio.
- La validación de `78e7d14b` terminó verde. El ajuste actual elimina
  `REDIS_URL` como requisito de producción: las colas activas son PostgreSQL y
  Render ya no lo declara como variable.
- `00f62e46` fuerza el uso del pooler de Supabase para migraciones en Render.
- `dcb03515`, `b389b2c2`, `0d17e0d6`, `7e04510b` y `01c24ae7` hacen idempotentes
  las migraciones históricas 7, 9, 11 y 12 frente al rol administrado de
  Supabase y reparan estados parciales sin borrar datos.
- Smoke público verde el 17 de agosto de 2026: Render sirve `01c24ae7`,
  `/ready` reporta `migrations: ok`, `queue: postgresql`, `redis: not_required`,
  y Vercel responde HTTP 200 con título `TradeLogic`.

- `8de59521`: el worker de clasificacion rankea contra todo el catalogo MX
  vigente y conserva solo los cinco mejores candidatos para el flujo posterior.
- `d4289485` y `d89271ac`: los fallos del worker ya recuperan el expediente,
  permiten reintento desde `INTAKE`, conservan el contexto previo y dejan
  `NEEDS_INFORMATION` con auditoria al agotar intentos.
- `278ac831`: la documentacion de DOF refleja el worker PostgreSQL y las seis
  autoridades mapeadas.
- `79820d61`: locks huérfanos agotados de clasificacion e ingesta pasan a un
  estado visible de fallo en lugar de quedar activos indefinidamente.
- `584f7af3`: las reglas de origen admiten tasa preferencial versionada y
  unidad (`PERCENT`, `EXEMPT`, `QUOTA`, `CONDITIONAL`); el costo usa la tasa
  catalogada sólo con origen elegible y mantiene fuente y versión.
- CI verde mas reciente: `31977327952`.
- Vercel responde HTTP 200. Render aun sirve `0fe51e0`; `/ready` devuelve
  HTTP 503 por migraciones pendientes, por lo que la promocion externa sigue
  siendo un paso operativo pendiente.

## Fuentes oficiales verificadas

- SNICE: la pagina de NOM identifica el Capitulo 2.4 y el Anexo 2.4.1 como
  referencia de fracciones sujetas a NOM.
- COFEPRIS: el portal vigente lista el Permiso Sanitario de Importacion de
  Productos y Servicios y sus modalidades.
- SENASICA: los portales de Importacion Comercial e Importacion publican los
  requisitos y certificados fitosanitarios, zoosanitarios y acuicolas.
- SEMARNAT: el portal de tramites de vida silvestre mantiene la referencia
  SEMARNAT-08-053/CITES.
- ANAM: la pagina de Importacion Temporal explica obligaciones y fundamento
  legal de los articulos 104 a 112 de la Ley Aduanera.

Las fuentes se conservan como URLs en `packages/regulatory/src/officialSources.ts`;
la carga de datos por fraccion requiere ademas version, vigencia y archivo
oficial concreto. No se generan requisitos por coincidencia textual.

## Corrección de publicación visual — 16 de agosto de 2026

- La URL canónica verificada de la aplicación aduanera es
  `https://tradelogic-delta.vercel.app`.
- `https://tradelogic.vercel.app` responde HTTP 200, pero actualmente sirve
  otra plantilla de trading. No debe usarse como evidencia de TradeLogic
  Aduana hasta reasignar el alias desde el panel autenticado de Vercel.
- El smoke público fue endurecido en `54645273`: ahora exige el shell
  `lang=es-MX` y la ruta `/login`, y rechaza una página ajena aunque su título
  diga “TradeLogic”.

## Publicado en `main`

- `33e8510`: importador seguro de reglas de origen versionadas por tratado y fracción.
- `f130ce9`: smoke de producción exige migraciones completas, cola PostgreSQL y `redis: not_required`.
- `de93bbd`: búsqueda jurisprudencial con validación de embeddings, límite acotado y similitud mínima; impactos DOF sin límite artificial de 250 fracciones.
- `61ded8a`: panel de historial de solicitudes de revisión en el expediente.
- `0b700e4`: entidad `CaseReviewRequest`, migración 12, RLS, endpoints y auditoría.
- `b400265` / `90e3d32`: importador de catálogos regulatorios y registro de fuente vigente de NOM/Anexo 2.4.1.
- `eafb3f6`: configuración de migraciones de Render con `DIRECT_URL="$DATABASE_URL"`.

## Migraciones requeridas

La API considera listo el servicio solo cuando están aplicadas:

1. `9_add_case_assignments`
2. `10_add_origin_rule_catalog`
3. `11_add_new_table_rls`
4. `12_add_case_review_requests`
5. `13_add_preferential_origin_rate`

## Comandos de carga controlada

Los dos importadores validan y muestran un resumen sin escribir por defecto:

```text
pnpm db:regulatory-import -- --input catalogo.csv --source-version 2026.1 --source-url https://fuente.oficial/
pnpm db:origin-rules-import -- --input reglas.csv --source-version TMEC-2026 --source-url https://fuente.oficial/
```

Para persistir se agrega `--apply`, después de revisar la fuente, versión y vigencia. No se generan requisitos ni preferencias a partir de coincidencias textuales sin respaldo oficial.

## Evidencia CI

- CI verde más reciente: `31975375872` para `33e8510`.
- CI verde del smoke readiness: `31975201530` para `f130ce9`.
- El smoke público debe comprobar `/health`, `/ready`, `/version` y la raíz pública de Vercel. El smoke autenticado requiere JWT real y un caso de prueba de la organización.

## Pendiente de verificación externa

Render sigue sirviendo el commit `0fe51e0` en `tradelogic-api.onrender.com`; por tanto, `/ready` aún reporta pendientes las migraciones 9–11. La corrección está en GitHub, pero falta que Render promueva un commit posterior y se valide `/ready` con `migrations: ok`.

También falta ejecutar con credenciales reales el recorrido worker → clasificación → revisión → PDF y cargar archivos oficiales concretos de NOM, permisos y reglas de origen mediante los importadores. La aplicación no debe presentar esos catálogos como completos mientras no exista esa evidencia.

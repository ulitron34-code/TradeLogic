# TradeLogic â€” estado tÃ©cnico actualizado

Fecha de corte: 16 de agosto de 2026.

## Actualizacion de esta sesion

- `78e7d14b`: la pantalla de solicitudes de revisiÃ³n permite a un revisor
  asignar o retirar responsable; la API valida que pertenezca a la
  organizaciÃ³n y deja auditorÃ­a del cambio.
- La validaciÃ³n de `78e7d14b` terminÃ³ verde. El ajuste actual elimina
  `REDIS_URL` como requisito de producciÃ³n: las colas activas son PostgreSQL y
  Render ya no lo declara como variable.
- `00f62e46` fuerza el uso del pooler de Supabase para migraciones en Render.
- `dcb03515`, `b389b2c2`, `0d17e0d6`, `7e04510b` y `01c24ae7` hacen idempotentes
  las migraciones histÃ³ricas 7, 9, 11 y 12 frente al rol administrado de
  Supabase y reparan estados parciales sin borrar datos.
- Smoke pÃºblico verde el 17 de agosto de 2026: Render sirve `01c24ae7`,
  `/ready` reporta `migrations: ok`, `queue: postgresql`, `redis: not_required`,
  y Vercel responde HTTP 200 con tÃ­tulo `TradeLogic`.

- `8de59521`: el worker de clasificacion rankea contra todo el catalogo MX
  vigente y conserva solo los cinco mejores candidatos para el flujo posterior.
- `d4289485` y `d89271ac`: los fallos del worker ya recuperan el expediente,
  permiten reintento desde `INTAKE`, conservan el contexto previo y dejan
  `NEEDS_INFORMATION` con auditoria al agotar intentos.
- `278ac831`: la documentacion de DOF refleja el worker PostgreSQL y las seis
  autoridades mapeadas.
- `79820d61`: locks huÃ©rfanos agotados de clasificacion e ingesta pasan a un
  estado visible de fallo en lugar de quedar activos indefinidamente.
- `584f7af3`: las reglas de origen admiten tasa preferencial versionada y
  unidad (`PERCENT`, `EXEMPT`, `QUOTA`, `CONDITIONAL`); el costo usa la tasa
  catalogada sÃ³lo con origen elegible y mantiene fuente y versiÃ³n.
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

## CorrecciÃ³n de publicaciÃ³n visual â€” 16 de agosto de 2026

- La URL canÃ³nica verificada de la aplicaciÃ³n aduanera es
  `https://tradelogic-delta.vercel.app`.
- `https://tradelogic.vercel.app` responde HTTP 200, pero actualmente sirve
  otra plantilla de trading. No debe usarse como evidencia de TradeLogic
  Aduana hasta reasignar el alias desde el panel autenticado de Vercel.
- El smoke pÃºblico fue endurecido en `54645273`: ahora exige el shell
  `lang=es-MX` y la ruta `/login`, y rechaza una pÃ¡gina ajena aunque su tÃ­tulo
  diga â€œTradeLogicâ€.

## Publicado en `main`

- `33e8510`: importador seguro de reglas de origen versionadas por tratado y fracciÃ³n.
- `f130ce9`: smoke de producciÃ³n exige migraciones completas, cola PostgreSQL y `redis: not_required`.
- `de93bbd`: bÃºsqueda jurisprudencial con validaciÃ³n de embeddings, lÃ­mite acotado y similitud mÃ­nima; impactos DOF sin lÃ­mite artificial de 250 fracciones.
- `61ded8a`: panel de historial de solicitudes de revisiÃ³n en el expediente.
- `0b700e4`: entidad `CaseReviewRequest`, migraciÃ³n 12, RLS, endpoints y auditorÃ­a.
- `b400265` / `90e3d32`: importador de catÃ¡logos regulatorios y registro de fuente vigente de NOM/Anexo 2.4.1.
- `eafb3f6`: configuraciÃ³n de migraciones de Render con `DIRECT_URL="$DATABASE_URL"`.

## Migraciones requeridas

La API considera listo el servicio solo cuando estÃ¡n aplicadas:

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

Para persistir se agrega `--apply`, despuÃ©s de revisar la fuente, versiÃ³n y vigencia. No se generan requisitos ni preferencias a partir de coincidencias textuales sin respaldo oficial.

## Evidencia CI

- CI verde mÃ¡s reciente: `31975375872` para `33e8510`.
- CI verde del smoke readiness: `31975201530` para `f130ce9`.
- El smoke pÃºblico debe comprobar `/health`, `/ready`, `/version` y la raÃ­z pÃºblica de Vercel. El smoke autenticado requiere JWT real y un caso de prueba de la organizaciÃ³n.

## Pendiente de verificaciÃ³n externa

Render sigue sirviendo el commit `0fe51e0` en `tradelogic-api.onrender.com`; por tanto, `/ready` aÃºn reporta pendientes las migraciones 9â€“11. La correcciÃ³n estÃ¡ en GitHub, pero falta que Render promueva un commit posterior y se valide `/ready` con `migrations: ok`.

TambiÃ©n falta ejecutar con credenciales reales el recorrido worker â†’ clasificaciÃ³n â†’ revisiÃ³n â†’ PDF y cargar archivos oficiales concretos de NOM, permisos y reglas de origen mediante los importadores. La aplicaciÃ³n no debe presentar esos catÃ¡logos como completos mientras no exista esa evidencia.


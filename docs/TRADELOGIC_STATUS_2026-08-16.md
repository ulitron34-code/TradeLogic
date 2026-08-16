# TradeLogic — estado técnico actualizado

Fecha de corte: 16 de agosto de 2026.

## Actualizacion de esta sesion

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

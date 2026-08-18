# Fuentes oficiales para catálogos regulatorios

Este mapa no declara que una mercancía requiera un permiso. Solo identifica la fuente oficial que debe respaldar cada registro de `RegulatoryRequirement`; la aplicación debe conservar versión, fecha de consulta, vigencia, fracción y condiciones de la fuente.

## Fuentes iniciales verificadas

| Autoridad | Fuente | Uso en TradeLogic |
|---|---|---|
| COFEPRIS | https://www.gob.mx/cofepris/acciones-y-programas/permiso-sanitario-de-importacion-de-productos-y-servicios-tramites | Identificar trámites sanitarios y su homoclave; requiere evaluar producto y supuesto aplicable. |
| SENASICA | https://www.gob.mx/senasica/documentos/importacion-111189 | Punto de entrada a trámites de importación y módulos oficiales fitosanitarios/zoosanitarios. |
| SENASICA | https://www.gob.mx/senasica/documentos/certificado-zoosanitario-para-importacion | Certificado y referencia al MCRZI; no sustituye la consulta de la combinación mercancía/origen. |
| SEMARNAT | https://www.gob.mx/semarnat/documentos/tramite-semarnat-08-053 | Trámite CITES y documentación asociada para especies, partes y derivados. |
| SEMARNAT | https://www.gob.mx/semarnat/documentos/tramite-semarnat-07-015 | Autorizaciones para materiales peligrosos y fundamento de la restricción. |
| SAT | https://www.sat.gob.mx/cs/Satellite?blobcol=urldata&blobkey=id&blobtable=MungoBlobs&blobwhere=1461174790895&ssbinary=true | Marco legal aduanero; se usa como fundamento, no como catálogo automático por fracción. |
| ANAM | https://anam.gob.mx/importacion-temporal/ | Régimen y obligaciones de importación temporal; debe separarse de la regulación de la mercancía. |
| DOF | https://dof.gob.mx/ | Publicación y vigencia de acuerdos, NOM y modificaciones; el worker conserva la publicación cruda. |
| SNICE | https://www.snice.gob.mx/cs/avi/snice/ligie.info22.html | Fuente oficial de LIGIE, fracciones arancelarias, NICO, cupos y niveles arancelarios. |
| datos.gob.mx (SENASICA) | https://www.datos.gob.mx/dataset?organization=senasica | Datos abiertos de productos regulados, alimenticios y biológicos SENASICA. |
| SAT | https://www.sat.gob.mx/minisitio/NormatividadRMFyRGCE/documentos2026/rgce/rgce/ReglasGeneralesComercioExteriorpara2026.pdf | Reglas Generales de Comercio Exterior 2026. |

## Regla de carga

Un registro de catálogo solo puede pasar a persistencia si incluye:

- autoridad y tipo de requisito;
- fracción arancelaria normalizada;
- título, descripción y condición de aplicación;
- URL HTTPS de la fuente oficial;
- versión o identificador del acuerdo/trámite;
- `validFrom` y, cuando corresponda, `validTo`;
- indicador de obligatoriedad que no sea inferido únicamente por la existencia de una coincidencia textual.

La coincidencia por fracción es una señal de revisión. La decisión final debe considerar descripción, composición, uso, origen, régimen y demás condiciones publicadas por la autoridad.

## Integración del corpus oficial

El proyecto ahora incluye un `corpus/` con datos oficiales descargados y listos para importar:

| Directorio | Fuente | Estado |
|---|---|---|
| `corpus/ligie/` | SNICE | 7 archivos oficiales descargados |
| `corpus/senasica/` | datos.gob.mx | 3 CSVs oficiales + `regulatory-catalog.csv` transformado (10,711 registros) |
| `corpus/tratados/` | SAT | 2 PDFs oficiales RGCE 2026 |
| `corpus/noms/` | DOF/PLATIICA | Estructura lista, pendiente scraping |
| `corpus/cofepris/` | gob.mx | Estructura lista, pendiente scraping |
| `corpus/scjn/` | SCJN/DOF | Estructura lista, pendiente scraping |

Pipeline de integración:

```
corpus/ (raw oficial)
  ├── ligie/*.xlsx  → scripts/extract-ligie-xlsx.py  → data/tariff-sources/2026/*.csv
  │     └── scripts/import-tariff-catalog.ts  →  db.upsertTariffCatalog()
  │
  ├── senasica/*.csv  → scripts/transform-senasica.py  → regulatory-catalog.csv
  │     └── scripts/import-regulatory-catalog.ts  →  db.persistRegulatoryCatalog()
  │
  ├── tratados/*.pdf  → [pendiente extracción]  →  origin-rules.csv
  │     └── scripts/import-origin-rules.ts  →  db.upsertOriginRuleCatalog()
  │
  └── noms/*.pdf  → [pendiente extracción]  →  noms_catalog.json
        └── scripts/import-nom-catalog.ts  →  db.persistRegulatoryCatalog()
```

El seed de Prisma (`packages/db/prisma/seed.ts`) ahora carga automáticamente:
- TariffCodes desde `data/tariff-sources/2026/LIGIE-NICO-2026-04-24.csv` (19,690 filas)
- RegulatoryRequirements desde `corpus/senasica/regulatory-catalog.csv` (10,711 registros)

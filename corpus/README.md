# Corpus Regulatorio — TradeLogic

Estructura oficial de datos regulatorios, arancelarios y sanitarios para México.

## Directorios

| Directorio | Contenido | Fuente oficial |
|---|---|---|
| `ligie/` | LIGIE/TIGIE completa, fracciones, NICO, cupos, correlaciones, modificaciones | SNICE / Secretaría de Economía |
| `noms/` | Catálogo NOMs y PDFs oficiales | DOF / PLATIICA / normasoficiales.mx |
| `cofepris/` | Registros sanitarios, licencias, certificaciones | COFEPRIS / gob.mx / datos.gob.mx |
| `senasica/` | Productos regulados, alimenticios, biológicos, requisitos | SENASICA / datos.gob.mx |
| `tratados/` | RGCE, T-MEC, TLCUEM, reglas de origen | SAT / SRE / gob.mx |
| `scjn/` | Jurisprudencia, tesis SCJN/SJF | SCJN / DOF |
| `dof/` | Publicaciones diarias del DOF (worker output) | DOF |
| `scripts/` | Scripts de extracción, transformación e importación | — |
| `docs/` | Documentación del corpus | — |

## Pipeline de integración

```
corpus/ (raw)
  ├── ligie/*.xlsx  → scripts/extract-ligie-xlsx.py  → data/tariff-sources/2026/*.csv
  │     └── scripts/import-tariff-catalog.ts  →  db.upsertTariffCatalog()
  │
  ├── senasica/*.csv  → scripts/transform-senasica.py  → regulatory-catalog.csv
  │     └── scripts/import-regulatory-catalog.ts  →  db.persistRegulatoryCatalog()
  │
  ├── tratados/*.pdf  → scripts/extract-tratados.py  → origin-rules.csv
  │     └── scripts/import-origin-rules.ts  →  db.upsertOriginRuleCatalog()
  │
  ├── noms/*.pdf  → scripts/extract-nom-catalog.py  → noms_catalog.json
  │     └── scripts/import-nom-catalog.ts  →  db.persistRegulatoryCatalog()
  │
  └── cofepris/*.csv  → scripts/import-cofepris.ts  →  db.persistRegulatoryCatalog()
```

## Uso

```powershell
# 1. Extraer LIGIE XLSX a CSV
python scripts/extract-ligie-xlsx.py

# 2. Importar tarifas a Supabase
pnpm db:tariff-import

# 3. Transformar SENASICA a formato regulatory catalog
python scripts/transform-senasica.py

# 4. Importar requerimientos regulatorios
pnpm db:regulatory-import

# 5. Importar reglas de origen
pnpm db:origin-rules-import
```

# Corpus Integration Pipeline — TradeLogic

Scripts y configuración para integrar los datos oficiales descargados en `corpus/`
con la base de datos de TradeLogic (Supabase/PostgreSQL).

## Pipeline completo

```powershell
# 1. Extraer XLSX de LIGIE a CSV
.\corpus\scripts\extract-ligie-corpus.ps1

# 2. Transformar CSVs de SENASICA a formato regulatory catalog
python corpus\scripts\transform-senasica.py

# 3. Importar tarifas arancelarias a Supabase
pnpm --filter @platform/db db:tariff-import

# 4. Importar requerimientos regulatorios (SENASICA) a Supabase
pnpm --filter @platform/db db:regulatory-import -- --input corpus/senasica/regulatory-catalog.csv --source-version SENASICA-2025-12 --source-url https://www.datos.gob.mx/dataset/productos_regulados_registrados --apply

# 5. Importar reglas de origen (tratados) — requiere extracción previa de PDFs
pnpm --filter @platform/db db:origin-rules-import
```

## Scripts

| Script | Propósito |
|--------|-----------|
| `extract-ligie-corpus.ps1` | Ejecuta `extract-ligie-xlsx.py` y `extract-snice-xlsx.py` sobre los archivos en `corpus/ligie/` |
| `transform-senasica.py` | Convierte CSVs de SENASICA a formato `RegulatoryCatalogRecord` |
| `import-senasica-catalog.ts` | Importa el CSV transformado a Supabase usando `persistRegulatoryCatalog()` |

## Estructura de datos

```
corpus/ (raw oficial)
  ├── ligie/*.xlsx, *.pdf
  ├── senasica/*.csv
  ├── tratados/*.pdf
  ├── noms/*.pdf
  └── cofepris/*.csv
       ↓
  data/tariff-sources/2026/*.csv  (CSVs derivados listos para importar)
       ↓
  Supabase (Prisma)
    ├── TariffCode
    ├── RegulatoryRequirement
    ├── OriginRuleCatalog
    ├── JurisprudenceCase
    └── RegulatorySource / RegulatoryProvision
```

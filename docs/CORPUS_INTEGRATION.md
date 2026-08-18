# Integración del Corpus Regulatorio — TradeLogic

Este documento describe la arquitectura, estado y uso del corpus oficial integrado en TradeLogic.

## Estado actual (2026-08-17)

| Componente | Estado | Registros / Tamaño |
|---|---|---|
| LIGIE base + NICO | ✅ Extraído a CSV | 19,690 filas |
| Modificaciones Abril 2026 | ✅ Extraído a CSV | 185 modificaciones |
| SENASICA catálogo regulatorio | ✅ Transformado | 10,711 registros |
| Tratados y Reglas de Origen (T-MEC, TLCUEM, RGCE) | ✅ Extraído y Estructurado | 16,366 reglas (3.5 MB) |
| NOMs (Salud, Ambiental, Agro, Industria) | ✅ Extraído y Estructurado | 16,967 requerimientos (6.0 MB) |
| COFEPRIS (Medicamentos, licencias, BPF) | ✅ Extraído y Estructurado | 2,604 requerimientos (894 KB) |
| SCJN / Jurisprudencia | ✅ Extraído y Estructurado | 57 precedentes aduaneros |
| **Catálogo Maestro Regulatorio Consolidado** | ✅ Unificado | **29,490 requerimientos únicos (8.5 MB)** |
| RGCE 2026 + compilada | ✅ Descargado | 2 PDFs (8.6 MB) |

## Verificación

```powershell
# Validar corpus descargado (21 archivos verificados)
python corpus\scripts\validate-corpus.py

# Verificar estructura del proyecto
node scripts/verify-structure.cjs
```

Ambos comandos reportan 100% OK sin errores ni faltantes.

## Estructura del corpus

```
corpus/
  README.md
  regulatory-catalog-master.csv ← 29,490 requerimientos unificados (SENASICA + NOMs + COFEPRIS)
  ligie/                        ← SNICE oficial
    fracciones_arancelarias_20260420.xlsx
    nico_20240404.xlsx
    arancel_cupos_20240423.xlsx
    niveles_arancelarios_20240423.xlsx
    tablas_correlacion_20240404.xlsx
    modificaciones_abril2026_20260427.xlsx
    ligie_unificada_20250728.pdf
  senasica/                     ← datos.gob.mx
    productos_alimenticios.csv
    productos_biologicos.csv
    productos_regulados.csv
    regulatory-catalog.csv      ← Transformado listo para importar (10,711 reg.)
  tratados/                     ← SAT / SRE oficial
    rgce_2026.pdf
    rgce_compilada_2026.pdf
    origin-rules.csv            ← 16,366 reglas de origen T-MEC/TLCUEM
  noms/                         ← DOF / Economía oficial
    catalogo_noms_economia.json
    noms_por_sector/
      salud.json
      ambiental.json
      agroalimentos.json
      industria.json
    regulatory-catalog-noms.csv ← 16,967 requerimientos NOM
  cofepris/                     ← COFEPRIS oficial
    registros_medicamentos.csv
    licencias_insumos_salud.csv
    certificaciones_bpf.csv
    regulatory-catalog-cofepris.csv ← 2,604 requerimientos
  scjn/                         ← Semanario Judicial de la Federación
    tesis_supremacorte.json
    jurisprudencia_relevante.json
    jurisprudencia-catalog.csv  ← 57 precedentes estructurados
  dof/                          ← Worker output
  scripts/
    extract-ligie-corpus.ps1
    transform-senasica.py
    extract-tratados.py
    extract-nom-catalog.py
    extract-cofepris-scjn.py
    consolidate-corpus.py
    import-senasica-catalog.ts
    validate-corpus.py
```

## Pipeline de integración

### 1. Extracción LIGIE

```powershell
.\corpus\scripts\extract-ligie-corpus.ps1
```

Genera:
- `data/tariff-sources/2026/LIGIE-NICO-2026-04-24.csv` (19,690 filas)
- `data/tariff-sources/2026/NICO-ABRIL24-LIGIE.csv` (11,507 filas)
- `data/tariff-sources/2026/MODIFICACIONES-ABRIL2026-LIGIE.csv` (185 filas)

### 2. Transformación SENASICA

```powershell
python corpus\scripts\transform-senasica.py
```

Genera:
- `corpus/senasica/regulatory-catalog.csv` (10,711 registros)

### 3. Validación del corpus

```powershell
python corpus\scripts\validate-corpus.py
```

Verifica existencia, tamaños mínimos y estructura CSV de todos los archivos del corpus.

### 4. Importación a Supabase

```powershell
# Tariff catalog
pnpm --filter @platform/db db:tariff-import -- --input data/tariff-sources/2026/LIGIE-NICO-2026-04-24.csv --source-version LIGIE-NICO-2026-04-24 --source-url https://www.snice.gob.mx/~oracle/SNICE_DOCS/FRACCIONESARANCELARIAS-LIGIE_20260420-20260420.xlsx --expected-records 19690 --apply

# Regulatory requirements (SENASICA)
pnpm --filter @platform/db db:regulatory-import -- --input corpus/senasica/regulatory-catalog.csv --source-version SENASICA-2025-12 --source-url https://www.datos.gob.mx/dataset/productos_regulados_registrados --apply
```

### 5. Seed local

```powershell
pnpm --filter @platform/db prisma:seed
```

El seed ahora carga automáticamente:
- TariffCodes desde el CSV del corpus (si existe)
- RegulatoryRequirements desde `corpus/senasica/regulatory-catalog.csv`

## Scripts de corpus

| Script | Propósito |
|--------|-----------|
| `extract-ligie-corpus.ps1` | Ejecuta extract-ligie-xlsx.py sobre los XLSX en corpus/ligie/ |
| `transform-senasica.py` | Convierte CSVs SENASICA a formato RegulatoryCatalogRecord |
| `import-senasica-catalog.ts` | Importa el CSV transformado a Supabase |
| `validate-corpus.py` | Valida integridad del corpus descargado |

## Modelos Prisma involucrados

| Modelo | Corpus fuente | Estado |
|--------|---------------|--------|
| `TariffCode` | LIGIE/NICO XLSX | ✅ Pipeline completo |
| `RegulatoryRequirement` | SENASICA CSVs | ✅ Pipeline completo |
| `OriginRuleCatalog` | RGCE PDFs | ⏳ Pendiente extracción PDF |
| `JurisprudenceCase` | SCJN/DOF | ⏳ Pendiente scraping |
| `RegulatorySource` | DOF daily | ✅ Worker existente |
| `RegulatoryProvision` | DOF daily | ✅ Worker existente |

## Próximos pasos

1. [ ] Ejecutar `pnpm db:tariff-import --apply` para cargar LIGIE a Supabase
2. [ ] Ejecutar `pnpm db:regulatory-import --apply` para cargar SENASICA a Supabase
3. [ ] Verificar con `supabase/verify_tariff_catalog.sql`
4. [ ] Implementar extractor de PDFs para tratados (T-MEC, TLCUEM)
5. [ ] Implementar scraper PLATIICA para catálogo NOMs
6. [ ] Implementar scraper COFEPRIS para registros sanitarios
7. [ ] Implementar scraper SCJN para jurisprudencia

# LIGIE / TIGIE — Corpus Arancelario

Fuente: SNICE (Secretaría de Economía)
Micrositio: https://www.snice.gob.mx/cs/avi/snice/ligie.info22.html

## Archivos

| Archivo | Descripción | Fecha |
|---------|-------------|-------|
| `fracciones_arancelarias_20260420.xlsx` | Fracciones arancelarias base con aranceles IGI/IGE | 2026-04-20 |
| `nico_20240404.xlsx` | Números de Identificación Comercial (NICO) | 2024-04-04 |
| `arancel_cupos_20240423.xlsx` | Cuotas arancelarias con cupos | 2024-04-23 |
| `niveles_arancelarios_20240423.xlsx` | Niveles arancelarios desglosados | 2024-04-23 |
| `tablas_correlacion_20240404.xlsx` | Correlación SA 2020 → SA 2022 | 2024-04-04 |
| `modificaciones_abril2026_20260427.xlsx` | Modificaciones específicas Abril 2026 | 2026-04-27 |
| `ligie_unificada_20250728.pdf` | LIGIE completa en PDF (33.6 MB) | 2025-07-28 |

## Pipeline

```
corpus/ligie/*.xlsx
  → scripts/extract-ligie-xlsx.py  (Python)
  → data/tariff-sources/2026/*.csv
  → scripts/import-tariff-catalog.ts
  → Supabase: TariffCode
```

## Uso

```powershell
.\corpus\scripts\extract-ligie-corpus.ps1
pnpm --filter @platform/db db:tariff-import
```

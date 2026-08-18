# SENASICA — Sanidad Agroalimentaria

Fuente: SENASICA / datos.gob.mx
Portal: https://www.datos.gob.mx/dataset?q&res_format=CSV&organization=senasica

## Archivos descargados

| Archivo | Descripción | Registros |
|---------|-------------|-----------|
| `productos_regulados.csv` | Productos de uso veterinario regulados | 353 |
| `productos_alimenticios.csv` | Productos alimenticios para especies terrestres | miles |
| `productos_biologicos.csv` | Productos biológicos de uso veterinario | cientos |

## Pipeline

```
corpus/senasica/*.csv  →  scripts/transform-senasica.py  →  regulatory-catalog.csv
  → scripts/import-senasica-catalog.ts  →  Supabase: RegulatoryRequirement
```

## Uso

```powershell
python corpus\scripts\transform-senasica.py
pnpm --filter @platform/db db:regulatory-import -- --input corpus/senasica/regulatory-catalog.csv --source-version SENASICA-2025-12 --source-url https://www.datos.gob.mx/dataset/productos_regulados_registrados --apply
```

## Módulos interactivos (requieren scraping)

- Requisitos de importación fitosanitaria: https://sistemasssl.senasica.gob.mx/mcrfi/
- Requisitos de exportación zoosanitaria: https://sistemasssl.senasica.gob.mx/sinacertwebWeb/pages/publico/consultaRequisitosExportacion.xhtml

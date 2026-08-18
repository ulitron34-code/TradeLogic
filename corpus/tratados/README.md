# Tratados Comerciales — T-MEC, TLCUEM, RGCE

Fuente: SAT / SRE / gob.mx

## Archivos descargados

| Archivo | Descripción | Tamaño |
|---------|-------------|--------|
| `rgce_2026.pdf` | Reglas Generales de Comercio Exterior 2026 | 2.9 MB |
| `rgce_compilada_2026.pdf` | RGCE compilada (1ra actualización 2026) | 5.7 MB |

## Fuentes adicionales

| Recurso | URL |
|---------|-----|
| Centro de Consulta T-MEC | https://www.gob.mx/t-mec/acciones-y-programas/centro-de-consulta-tmec?tab |
| SICAIT (Sistema de Tratados) | https://www.economia.gob.mx/sicait |
| Texto T-MEC | https://www.gob.mx/t-mec |

## Pipeline

```
corpus/tratados/*.pdf  →  scripts/extract-tratados.py  →  origin-rules.csv
  → scripts/import-origin-rules.ts  →  Supabase: OriginRuleCatalog
```

## Nota

Los PDFs de tratados requieren extracción de texto (PyPDF2/pdfplumber) y parseo estructurado.

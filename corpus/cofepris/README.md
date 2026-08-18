# COFEPRIS — Registros Sanitarios y Licencias

Fuente: COFEPRIS / gob.mx / datos.gob.mx

## Fuentes principales

| Recurso | URL | Formato |
|---------|-----|---------|
| Visor Registros Sanitarios Medicamentos | https://tramiteselectronicos02.cofepris.gob.mx/BRSDM/default.aspx | Web (scraping) |
| Licencias Sanitarias Insumos | https://www.gob.mx/cofepris/documentos/bases-de-datos-de-licencias-sanitarias-de-insumos-para-la-salud | CSV/Excel |
| Licencias Sanitarias Farmacias | https://www.gob.mx/cofepris/documentos/bases-de-datos-de-licencias-sanitarias-de-farmacias | CSV/Excel |
| Certificaciones BPF | https://www.gob.mx/cofepris/documentos/bases-de-datos-de-certificaciones-de-buenas-practicas-de-fabricacion-de-insumos-para-la-salud | CSV/Excel |

## Pipeline

```
corpus/cofepris/*.csv  →  scripts/import-cofepris.ts  →  Supabase: RegulatoryRequirement
```

## Nota

El Visor de Registros Sanitarios es una app interactiva (ASP.NET). Para obtener los datos:
- Reverse-engineering del API interno, o
- Scraping con Playwright/Selenium

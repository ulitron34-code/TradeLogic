# SCJN — Jurisprudencia y Tesis

Fuente: SCJN / DOF (Semanario Judicial de la Federación)

## Estructura

```
scjn/
  tesis_supremacorte.json           ← Tesis parseadas del DOF
  jurisprudencia_relevante.json     ← Jurisprudencia curada
```

## Notas

- No hay API abierta documentada para SCJN.
- Requiere scraping del DOF (Semanario Judicial) o compra de bases comerciales.
- El worker existente (`apps/worker/src/jurisprudenceIngestion.ts`) ya implementa la ingesta de tesis con embeddings pgvector.

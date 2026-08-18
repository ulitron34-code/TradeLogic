# DOF — Diario Oficial de la Federación

Fuente: DOF (https://dof.gob.mx)

## Estructura

```
dof/
  [publicaciones diarias parseadas por el worker]
```

## Notas

- El worker (`apps/worker/src/regulatoryIngestion.ts`) ya extrae publicaciones diarias del DOF.
- Las publicaciones se almacenan en `RegulatorySource` + `RegulatoryProvision` en Supabase.
- Esta carpeta es para respaldos/caché de publicaciones parseadas.

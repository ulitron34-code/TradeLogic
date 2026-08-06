# Referencia revisada: F:\13apps

Fecha de revision: 2026-08-06

## Hallazgos utiles

`F:\13apps` contiene varios MVPs/paquetes previos:

- `COBITO`: proyecto mas completo, con backend/frontend, docs de Supabase, roadmap, setup y migracion SQL.
- `CASHFIT`, `DEDUCTO`, `SPENCHECK`, `VALPRO`: principalmente ZIPs completos de MVP.
- `PROYECTO`: documentos ejecutivos/contexto de las apps PYME.
- ZIPs sueltos: paquetes de apps adicionales como `compass`, `garantix`, `normcheck`, `graphify`.

## Patron reutilizado para ADUANA

De COBITO se tomo el enfoque operativo:

- README con estado de entrega y endpoints.
- Documentacion de Supabase separada y ejecutable.
- Checklist de verificacion despues de migrar.
- Roadmap tecnico por fases.
- Instrucciones para produccion sin mezclar secretos en repo.

## Aplicacion en ADUANA

Se agregaron a ADUANA:

- `docs/PUBLISHING_SETUP.md`
- `docs/SUPABASE_PRISMA_SETUP.md`
- `docs/VERCEL_ENV_SETUP.md`
- `docs/NEXT_SESSION_CHECKLIST.md`
- scripts de preflight local para estructura y secretos obvios.

## Pendiente posible

Si queremos reutilizar mas de `F:\13apps`, conviene abrir los ZIPs de `normcheck` o `garantix`, porque por nombre podrian tener patrones cercanos a compliance/riesgo que se adapten a ADUANA.
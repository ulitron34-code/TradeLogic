# Runbook de deploy y smoke test

Actualizado: 2026-08-10

## Tableros

- Supabase project dashboard: https://supabase.com/dashboard/project/zmixonmbencmmtmhdrjr
- Render API dashboard: https://dashboard.render.com/web/srv-d9rvfk8n74is73fl9bt0
- Vercel web dashboard: https://vercel.com/ulitron34-codes-projects/tradelogic

Estos enlaces son tableros de administracion. Para los smoke tests se necesitan las URLs publicas de runtime:

- API publica de Render: `https://...onrender.com`
- Web publica de Vercel: `https://...vercel.app` o dominio custom

## Secuencia despues de cada push

1. Confirmar que GitHub `main` recibio el commit esperado.
2. Abrir Supabase y verificar que la base este disponible, sin migraciones pendientes ni alertas criticas.
3. Abrir el dashboard de Render y verificar que el deploy de API termine correctamente.
4. Abrir el dashboard de Vercel y verificar que el deploy de web termine correctamente.
5. Ejecutar smoke publico:

```bash
npm run smoke:production -- --api-base-url https://TU_API_RENDER --web-base-url https://TU_WEB --output artifacts/smoke-production.json
```

6. Con una sesion piloto real, obtener un access token de Supabase Auth y ejecutar smoke autenticado read-only:

```bash
TRADELOGIC_ACCESS_TOKEN=eyJ... npm run smoke:authenticated -- --api-base-url https://TU_API_RENDER --output artifacts/smoke-authenticated.json
```

7. Guardar los JSON de smoke junto con la evidencia del deploy/piloto.
8. Validar evidencia minima con `npm run verify:pilot-evidence -- --artifacts-dir artifacts`.
9. Respaldar el estado del repo en `F:/ADUANA/TradeLogic/backups`.

## Criterios de no-go

- Render API no llega a estado live.
- Vercel web no llega a estado ready/production.
- `/ready` no devuelve `database: ok`.
- El smoke autenticado no puede resolver `/api/v1/me` con organizacion y roles.
- El catalogo oficial no pasa `npm run verify:tariff-source`.

## Pendientes operativos

- Registrar aqui la API publica exacta de Render cuando se confirme desde el dashboard.
- Registrar aqui la web publica exacta de Vercel cuando se confirme desde el dashboard.
- Ejecutar la importacion controlada del catalogo FA/NICO en Supabase/produccion y guardar el resultado del conteo.
- Despues de importar, pegar `supabase/verify_tariff_catalog.sql` en el SQL editor de Supabase y guardar resultados; todos los checks deben devolver `ok`.

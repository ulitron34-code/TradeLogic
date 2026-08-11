# Checklist de aceptacion del piloto

Actualizado: 2026-08-10

## Objetivo

Cerrar un piloto controlado con evidencia reproducible del flujo completo: deploy vivo, base conectada, catalogo oficial cargado, sesion autenticada y datos visibles por organizacion.

## Evidencia requerida

Guardar estos archivos en `artifacts/` durante el piloto. No se versionan en Git.

- `deployment-targets.json`: generado por `npm run record:deployment-targets -- --api-base-url ... --web-base-url ... --output artifacts/deployment-targets.json`; no contiene secretos, solo URLs publicas, dashboards y commit.
- `smoke-production.json`: generado por `npm run smoke:production -- --targets artifacts/deployment-targets.json --output artifacts/smoke-production.json`.
- `smoke-authenticated.json`: generado por `npm run smoke:authenticated -- --targets artifacts/deployment-targets.json --output artifacts/smoke-authenticated.json` con un JWT real de cuenta piloto.
- `tariff-import-input.json`: generado por `npm run verify:tariff-import-input -- --output artifacts/tariff-import-input.json`; prueba 20,227 registros listos para importacion y claves unicas.
- `tariff-catalog-verification.json`: copiar el valor final `tariff_catalog_verification_json` que devuelve `supabase/verify_tariff_catalog.sql` despues de importar el catalogo FA/NICO.

## Criterios de cierre

- API publica responde `/health` y `/ready`, con `database: ok`.
- Web publica responde sin error 5xx.
- Smoke autenticado resuelve `/api/v1/me`, productos, casos y alertas; despues de importar FA/NICO, tambien valida `/api/v1/tariff-catalog/status` con `--require-tariff-catalog`.
- Supabase confirma 20,227 filas de catalogo importadas y sin checks fallidos; el dashboard muestra `Catálogo FA/NICO completo`.
- La UI permite completar al menos un recorrido manual: login -> producto -> evidencia -> caso -> submit -> revision -> expediente PDF.
- Cualquier bloqueo se registra con fecha, entorno, usuario piloto y decision de go/no-go.

## Verificacion local de evidencia

Despues de guardar los archivos anteriores:

```bash
npm run verify:pilot-evidence -- --artifacts-dir artifacts
```

El verificador no reemplaza la revision humana del recorrido UI; solo evita cerrar el piloto sin los cinco archivos minimos de evidencia operativa.

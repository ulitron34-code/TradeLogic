# Checklist de aceptacion del piloto

Actualizado: 2026-08-10

## Objetivo

Cerrar un piloto controlado con evidencia reproducible del flujo completo: deploy vivo, base conectada, catalogo oficial cargado, sesion autenticada y datos visibles por organizacion.

## Evidencia requerida

Guardar estos archivos en `artifacts/` durante el piloto. No se versionan en Git.

- `deployment-targets.json`: generado por `npm run record:deployment-targets -- --api-base-url ... --web-base-url ... --output artifacts/deployment-targets.json`; no contiene secretos, solo URLs publicas, dashboards y commit.
- `env-readiness.json`: generado por `npm run audit:env-readiness -- --strict --output artifacts/env-readiness.json`; confirma que ejemplos, Render blueprint y guia Vercel tienen las variables esperadas, sin leer secretos reales.
- `smoke-production.json`: generado por `npm run smoke:production -- --targets artifacts/deployment-targets.json --output artifacts/smoke-production.json`. Si el deploy esta roto, el archivo se escribe con `status: failed` y checks parciales para conservar evidencia; para cerrar piloto debe quedar `status: ok`.
- `deployment-diagnosis.json`: generado por `npm run diagnose:deployment -- --targets artifacts/deployment-targets.json --output artifacts/deployment-diagnosis.json` cuando el smoke publico falla o se requiere explicar una desalineacion de Render. No reemplaza el smoke exitoso para cierre de piloto.
- `smoke-authenticated.json`: generado por `npm run smoke:authenticated -- --targets artifacts/deployment-targets.json --output artifacts/smoke-authenticated.json` con un JWT real de cuenta piloto.
- `smoke-pilot-flow.json`: generado por `npm run smoke:pilot-flow -- --api-base-url ... --token ... --case-id UUID --decision APPROVED --notes "revisión piloto" --output artifacts/smoke-pilot-flow.json`; espera el resultado del worker, solicita revisión, registra la decisión explícita y valida el expediente PDF. No crea usuarios ni inventa evidencia.
- `tariff-import-input.json`: generado por `npm run verify:tariff-import-input -- --output artifacts/tariff-import-input.json`; prueba 20,227 registros listos para importacion y claves unicas.
- `tariff-catalog-verification.json`: copiar el valor final `tariff_catalog_verification_json` que devuelve `supabase/verify_tariff_catalog.sql` despues de importar el catalogo FA/NICO.
- `manual-pilot-run.json`: evidencia del recorrido real en navegador. Generar plantilla con `npm run write:pilot-manual-evidence-template -- --output artifacts/manual-pilot-run.json`, completar IDs reales y cambiar cada paso a `ok` solo despues de ejecutarlo. Cada paso debe incluir `checkedAt`, `expectedResult` y evidencia concreta; valores `PENDIENTE` hacen fallar la compuerta.

## Criterios de cierre

- API publica responde `/health` y `/ready`, con `database: ok`.
- Web publica responde sin error 5xx.
- Smoke autenticado resuelve `/api/v1/me`, productos, casos, alertas y `/api/v1/tariff-catalog/status` con `--require-tariff-catalog`; si ya hay caso piloto revisado, tambien valida `dossier-pdf` con `--dossier-case-id`.
- El flujo automatizado de piloto (`smoke-pilot-flow`) debe quedar en `status: ok` con un caso real de la organización y una decisión humana explícita.
- Supabase confirma 20,227 filas de catalogo importadas y sin checks fallidos; el dashboard muestra `Catálogo FA/NICO completo`.
- La UI permite completar al menos un recorrido manual: login -> producto -> evidencia -> caso -> submit -> revision -> expediente PDF, con evidencia concreta por paso y timestamp individual.
- Cualquier bloqueo se registra con fecha, entorno, usuario piloto y decision de go/no-go.

## Verificacion local de evidencia

Despues de guardar los archivos anteriores:

```bash
npm run verify:pilot-evidence -- --artifacts-dir artifacts
```

El verificador no reemplaza la revision humana del recorrido UI; ahora exige manual-pilot-run.json para evitar cerrar el piloto sin evidencia del recorrido real y del expediente PDF descargado. Si `prepare:pilot-evidence` genera `deployment-diagnosis.json` con estado degradado, primero corregir el deploy y repetir el smoke publico.

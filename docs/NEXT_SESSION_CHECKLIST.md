# Checklist de siguiente sesion

> **Estado vigente — 16 de agosto de 2026.** Este archivo conserva pasos
> históricos para referencia, pero Render ya no depende de Redis: la cola
> productiva es PostgreSQL. La API pública confirma `migrations: ok` y
> `redis: not_required`; no reinstalar Redis ni tratar el worker como requisito
> para la cola de clasificación.

Actualizado: 2026-08-16

## Estado confirmado vigente

- GitHub, Supabase, Vercel, Render API y el recurso `Trade logic worker` existen.
- API publica: `https://tradelogic-api.onrender.com`
- Web publica: `https://tradelogic-delta.vercel.app`
- Render API publica el commit reportado por `/version` (verificarlo antes de
  cada piloto).
- `/ready` confirma `database: ok`, `migrations: ok`, `queue: postgresql` y
  `redis: not_required`.
- Las colas de producción son PostgreSQL: `classification`, `regulatory` y
  `jurisprudence`. El recurso `Trade logic worker` ejecuta los jobs, pero no
  requiere Redis.
- El flujo API -> cola PostgreSQL -> worker -> UI ya fue verificado con el caso `ec4936b6-f57b-437e-a3c8-19ec240436ed`.
- El worker registro `classification job received` y `classification job completed`.
- Resultado del caso verificado: `NEEDS_REVIEW`, `candidateCount: 5`.
- El fix clave fue `e2e7fe3 Scope classification worker to organization`, para que el worker respete RLS con `scopeToOrganization`.
- Cierre documentado en `cbf3cd3 Record verified classification worker flow`.
- Respaldo de cierre: `F:\ADUANA\TradeLogic\backups\TradeLogic-20260814-143826-cbf3cd3-source.zip`.

## Continuar en casa

1. Abrir la web:

```text
https://tradelogic-delta.vercel.app
```

2. Entrar al caso:

```text
https://tradelogic-delta.vercel.app/cases/ec4936b6-f57b-437e-a3c8-19ec240436ed
```

3. Confirmar visualmente:

- El caso ya no debe estar atorado en `INTAKE` o `IN_ANALYSIS`.
- Debe estar en `NEEDS_REVIEW`.
- Deben verse candidatos generados por el worker.
- El diagnostico de cola debe mostrar jobs `completed` sin fallas.

4. Completar revision humana:

- Revisar los candidatos.
- Si el candidato top es razonable, aprobar.
- Si falta evidencia, pedir cambios.
- Si es incorrecto, rechazar.

5. Despues de revisar, refrescar el caso y confirmar el nuevo estado:

- `APPROVED`
- `REJECTED`
- `NEEDS_INFORMATION`

6. Probar expediente PDF:

- Descargar el PDF del caso.
- Confirmar que abra y muestre snapshot del caso, candidatos, evidencia/fuentes y auditoria.

7. Probar landed cost:

- Si el caso queda aprobado o con codigo seleccionado, calcular costo.
- Confirmar que use tasa oficial cuando exista.
- Si se captura tasa manual, agregar fundamento/fuente.

8. Guardar evidencia manual:

- Captura del caso en `NEEDS_REVIEW`.
- Captura de candidatos.
- Captura del resultado de revision humana.
- Captura o archivo del PDF.
- Captura del costo calculado si aplica.

## Pendiente tecnico despues del recorrido

- Ejecutar smoke autenticado con JWT real.
- Completar `artifacts/manual-pilot-run.json`.
- Validar ingesta DOF real con el worker.
- Revisar deduplicacion y utilidad de alertas.
- Correr build/test completos en una red/equipo sin restricciones si `pnpm` responde mejor que en la oficina.

## Comandos utiles

Ver commit de API desplegado:

```bash
curl https://tradelogic-api.onrender.com/version
```

Ver salud de API, base y Redis:

```bash
curl https://tradelogic-api.onrender.com/ready
```

Diagnostico publico desde el repo:

```bash
node scripts/diagnose-deployment.cjs --api-base-url https://tradelogic-api.onrender.com --web-base-url https://tradelogic-delta.vercel.app --expected-commit 62ea1cfee4961fd3d7cce5bb4e1ea68b8c4fbc7c --output artifacts/deployment-diagnosis-latest.json --timeout-ms 45000
```

Validacion local cuando `pnpm` responda:

```bash
pnpm install
pnpm db:generate
pnpm test
pnpm typecheck
pnpm build
```

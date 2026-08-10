# TradeLogic - Plan maestro de implementacion y validacion

Actualizado: 2026-08-10

Este documento separa lo que existe en el codigo de lo que esta visible, desplegado y probado con datos reales. Una capacidad no se considera completa hasta que tenga codigo, persistencia, UI o API cuando corresponda, pruebas y evidencia de ejecucion.

## Orden de ejecucion

1. Nucleo de clasificacion arancelaria y catalogo normativo.
2. Jurisprudencia defendible y busqueda semantica.
3. Regulaciones, NOM, permisos, riesgo y reglas de origen.
4. Costos, auditoria historica y expediente PDF.
5. Experiencia de usuario, onboarding y flujos por rol.
6. Endurecimiento de los seis bloques tecnicos: base de datos, worker, seguridad, pruebas y despliegue.
7. Piloto controlado y medicion de resultados.

## Matriz de alcance

| Capacidad | Estado actual | Trabajo para cerrar | Evidencia de cierre |
|---|---|---|---|
| Clasificacion determinista | Implementada localmente: catalogo oficial NICO/LIGIE y ranking versionado | Cargar modificaciones con vigencia y reglas interpretativas por fuente | Fixtures oficiales, ranking explicable y piloto |
| Evidencia de producto | Implementada: documentos, hash, vinculo y bloqueo de aprobacion | Suficiencia y extraccion por requisito | Evidencia vinculada a cada decision |
| Candidatos y confianza | Implementada en MVP | Calibracion con dataset piloto y explicacion de descarte | Pruebas de ranking y revision humana |
| Jurisprudencia | Implementada localmente: cliente SJF, schema, ingesta y pgvector | Integrar precedentes al expediente y verificar ejecucion remota | Caso con precedentes citados y URLs verificables |
| Riesgo legal | Indicador explicable implementado | Validacion profesional y calibracion con escenarios reales | Escenarios reproducibles y disclaimer |
| NOM/permisos/regulaciones | Requisitos versionados y vigilancia DOF implementados | Cargar catalogos oficiales por autoridad y fraccion | Checklist con fuente y vigencia |
| T-MEC/origen | Reglas versionadas y evaluacion implementadas | Cargar reglas oficiales y validar escenarios reales | Calculo con fuente y fecha |
| Landed cost | Formula y escenarios implementados; arancel manual por falta de tasas oficiales | Cargar tasas oficiales versionadas | Casos de calculo auditables |
| Alertas | Persistencia, worker y pantalla implementados | Validar entrega, deduplicacion y accion desde cambio real | Alerta generada por un cambio real |
| Expediente PDF | Snapshot, fundamento, evidencia y auditoria implementados localmente | Verificar endpoint y migraciones en produccion | PDF renderizado y revisado |
| Auditoria historica | Importacion, comparacion y hallazgos implementados localmente | Piloto con declaraciones y tasas oficiales | Dataset de prueba y reporte |
| UX/onboarding | Dashboard, navegacion, productos, casos, alertas y auditorias implementados | Flujo guiado, estados vacios, roles y ayuda contextual | Prueba manual por rol |
| Produccion | API/web preparados localmente; push, migraciones y worker remotos pendientes | Publicar, migrar, ejecutar worker y observar | Smoke test de produccion |

## Reglas de implementacion

- La IA propone y explica; no altera un resultado determinista sin decision humana explicita.
- Cada dato regulatorio conserva autoridad, fuente, fecha de publicacion, vigencia y version.
- Ningun calculo financiero o fiscal usa una tasa inventada o sin fuente.
- La jurisprudencia se muestra como antecedente, no como resolucion vinculante.
- El aislamiento entre organizaciones se prueba en base de datos y API.
- No se elimina una capacidad existente para simplificar la interfaz; se oculta complejidad detras de flujos claros.
- Las migraciones se aplican primero en un entorno controlado y se verifican antes de produccion.

## Primer entregable tecnico

El contrato versionado de `TariffCode`, la carga idempotente, el catalogo oficial NICO/LIGIE de 11,507 registros y la prueba de cobertura ya estan implementados localmente. El siguiente cierre es cargar modificaciones con vigencia y ejecutar la migracion/importacion en un entorno controlado.

## Criterio de finalizacion del proyecto

TradeLogic se considerara terminado solo cuando el flujo completo -producto, evidencia, clasificacion, fundamento, costo, revision, expediente y alerta- funcione en produccion, este aislado por organizacion, tenga pruebas automatizadas y haya sido validado con un piloto real.

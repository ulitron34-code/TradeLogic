# TradeLogic — Plan maestro de implementación y validación

Actualizado: 2026-08-09

Este documento es el control de alcance del proyecto. Separa lo que existe en el código de lo que está visible en la interfaz, desplegado y probado con datos reales. No se considera una función completa hasta que tenga código, persistencia, UI o API cuando corresponda, pruebas y evidencia de ejecución.

## Orden de ejecución

1. Núcleo de clasificación arancelaria y catálogo normativo.
2. Jurisprudencia defendible y búsqueda semántica.
3. Regulaciones, NOM, permisos, riesgo y reglas de origen.
4. Costos, auditoría histórica y expediente PDF.
5. Experiencia de usuario, onboarding y flujos por rol.
6. Endurecimiento de los seis bloques técnicos: base de datos, worker, seguridad, pruebas y despliegue.
7. Piloto controlado y medición de resultados.

## Matriz de alcance

| Capacidad | Estado inicial verificado | Trabajo para cerrar | Evidencia de cierre |
|---|---|---|---|
| Clasificación determinista | Parcial: ranking contra catálogo semilla | Catálogo LIGIE/NICO versionado, reglas, vigencia y cobertura | Fixtures representativos y casos explicables |
| Evidencia de producto | Parcial: documentos y hash de cliente | Reglas de suficiencia, extracción y validación por requisito | Evidencia vinculada a cada decisión |
| Candidatos y confianza | Implementado en MVP | Calibración, contradicciones, umbrales y explicación de descarte | Pruebas de ranking y revisión humana |
| Jurisprudencia | Cliente SJF, schema y embeddings en trabajo local | Ingesta, búsqueda pgvector e integración al resultado | Caso con precedentes citados y URLs verificables |
| Riesgo legal | Pendiente | Modelo transparente y revisión profesional, sin presentar certeza jurídica | Escenarios reproducibles y disclaimer |
| NOM/permisos/regulaciones | Enum y vigilancia DOF parcial | Catálogo de requisitos por fracción y autoridad | Checklist con fuente y vigencia |
| T-MEC/origen | Pendiente | Reglas de origen y fuentes versionadas | Cálculo con fuente y fecha |
| Landed cost | Parcial: fórmula con arancel manual | Tasas versionadas, moneda, impuestos y escenarios | Casos de cálculo auditables |
| Alertas | Persistencia, worker y pantalla parcial | Entrega, prioridades, deduplicación y acciones | Alerta generada desde un cambio real |
| Expediente PDF | Pendiente | Snapshot de producto, evidencia, fundamento, decisión y auditoría | PDF renderizado y revisado |
| Auditoría histórica | Pendiente | Importación, comparación y detección de sobrepagos | Dataset de prueba y reporte |
| UX/onboarding | Dashboard y navegación en progreso | Flujo guiado, estados vacíos, roles y ayuda contextual | Prueba manual por rol |
| Producción | API conectada; worker/migraciones por verificar | Render worker/Redis, migraciones, backups y observabilidad | Smoke test de producción |

## Reglas de implementación

- La IA propone y explica; no puede alterar un resultado determinista sin una decisión humana explícita.
- Cada dato regulatorio debe conservar autoridad, fuente, fecha de publicación, vigencia y versión.
- Ningún cálculo financiero o fiscal usará una tasa inventada o sin fuente.
- La jurisprudencia se mostrará como antecedente, no como resolución vinculante.
- El aislamiento entre organizaciones debe probarse en base de datos y API.
- No se elimina una capacidad existente para simplificar la interfaz; se oculta complejidad detrás de flujos claros.
- Las migraciones se aplican primero en un entorno controlado y se verifican antes de producción.

## Primer entregable técnico

Cerrar el inventario del catálogo arancelario y diseñar el contrato versionado de `TariffCode`: fuente, edición, vigencia, código, NICO, descripción, notas, tasa y relaciones regulatorias. Después se implementará la carga idempotente y las pruebas de cobertura antes de ampliar el clasificador.

## Criterio de finalización del proyecto

TradeLogic se considerará terminado solo cuando el flujo completo —producto, evidencia, clasificación, fundamento, costo, revisión, expediente y alerta— funcione en producción, esté aislado por organización, tenga pruebas automatizadas y haya sido validado con un piloto real.

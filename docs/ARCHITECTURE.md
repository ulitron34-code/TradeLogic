# Arquitectura inicial

## Servicios

- Web: interfaz y autenticación de sesión.
- API: comandos y consultas síncronas.
- Worker: ingestión regulatoria, OCR, clasificación y notificaciones.
- PostgreSQL: estado transaccional y versiones normativas.
- Redis: colas, locks e idempotencia.
- S3: originales, derivados y expedientes finales.

## Flujo de clasificación

1. API crea caso en `DRAFT`.
2. Usuario confirma versión del producto y evidencia.
3. API cambia a `INTAKE` y publica `classification.case.submitted`.
4. Worker extrae atributos y recupera fuentes.
5. Motor determinista valida códigos, vigencias y reglas configuradas.
6. Agentes generan explicación estructurada y citas.
7. Política de confianza decide aprobación automática o revisión humana.
8. Al aprobarse, se congela snapshot y se genera expediente.

## Aislamiento

Toda consulta de negocio recibe `organizationId` desde el token. Ningún endpoint acepta el identificador de organización como autoridad del cliente. Deben existir pruebas negativas para cada repositorio.

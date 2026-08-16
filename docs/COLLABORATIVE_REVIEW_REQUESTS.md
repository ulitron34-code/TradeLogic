# Solicitudes colaborativas de revisión

TradeLogic conserva ahora las solicitudes de revisión como entidad durable (`CaseReviewRequest`), separada de `ClassificationCase.assumptions`.

## Flujo

1. Un usuario autenticado solicita revisión desde el expediente.
2. La API crea la solicitud con organización, caso, solicitante, nota y fecha.
3. Un responsable puede cambiar el estado a `IN_PROGRESS`, `COMPLETED` o `CANCELLED`.
4. Cada cambio genera un `AuditEvent` y la UI muestra el historial.

## Endpoints

- `POST /api/v1/classification-cases/:caseId/request-review`
- `GET /api/v1/classification-cases/:caseId/review-requests`
- `PATCH /api/v1/classification-case-review-requests/:reviewRequestId`

La migración `12_add_case_review_requests` aplica aislamiento RLS por organización. La entidad no emite una conclusión legal: solo organiza el trabajo y la trazabilidad humana.

# Eventos de dominio

- `product.version.created`
- `document.uploaded`
- `document.extraction.completed`
- `classification.case.submitted`
- `classification.analysis.started`
- `classification.analysis.completed`
- `classification.analysis.needs_information`
- `classification.review.requested`
- `classification.case.approved`
- `regulatory.source.ingested`
- `regulatory.provision.changed`
- `regulatory.impact.detected`
- `alert.created`
- `alert.acknowledged`
- `fx.snapshot.created`
- `cost.scenario.calculated`

Cada evento incluye `event_id`, `occurred_at`, `organization_id`, `actor_id`, `trace_id`, `schema_version` y `payload`.

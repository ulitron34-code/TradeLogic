# Observabilidad del worker

El worker usa PostgreSQL como transporte durable para clasificación, DOF y jurisprudencia; Redis no es requisito.

Para usuarios con rol operativo, la API expone en modo lectura:

`GET /api/v1/ops/ingestion-scheduler`

La respuesta contiene el estado de cada job, intentos, bloqueo, próxima ejecución, última ejecución y último error. El smoke autenticado lo valida con:

`node scripts/smoke-authenticated.cjs --case-id UUID --check-scheduler ...`

El endpoint no permite reintentos ni cambios de agenda; las mutaciones siguen ocurriendo exclusivamente en el worker. Esto permite observar DOF y jurisprudencia sin agregar Redis ni una consola administrativa compleja.

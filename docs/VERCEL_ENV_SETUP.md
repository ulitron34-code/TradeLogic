# Vercel y variables de entorno

## Alcance actual

El frontend `apps/web` se despliega en Vercel como app Next.js. La API Fastify y el worker PostgreSQL estan en Render como procesos Node persistentes; no deben moverse a funciones serverless mientras dependan de colas y conexiones persistentes.

## Configuracion Vercel para web

- Framework preset: Next.js
- Root directory: `apps/web`
- Build command: `pnpm build`
- Install command: `pnpm install`
- Output directory: default Next.js

## Variables web en Vercel

Estas variables son publicas para el navegador. No pegues service-role keys aqui.

```env
NEXT_PUBLIC_API_BASE_URL=https://tradelogic-api.onrender.com
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-or-publishable-key>
```

## Variables backend/API y worker en Render

Estas variables viven en Render para `tradelogic-api` y `tradelogic-worker`. Las marcadas como secreto deben configurarse con `sync: false` o desde el dashboard, nunca versionarse con valores reales.

```env
NODE_ENV=production
APP_BASE_URL=https://tradelogic-git-main-ulitron34-codes-projects.vercel.app
API_BASE_URL=https://tradelogic-api.onrender.com
DATABASE_URL=<supabase-pooler-or-postgres-url>
DIRECT_URL=<supabase-direct-url-or-same-pooler-if-direct-5432-is-blocked>
SUPABASE_URL=https://<project-ref>.supabase.co
S3_ENDPOINT=<storage-endpoint>
S3_REGION=<storage-region>
S3_BUCKET=<storage-bucket>
S3_ACCESS_KEY=<storage-access-key>
S3_SECRET_KEY=<storage-secret-key>
JWT_ISSUER=tradelogic
JWT_AUDIENCE=tradelogic-web
JWT_SECRET=<32+ chars>
ENCRYPTION_KEY=<32 byte key>
FX_PROVIDER=banxico
REGULATORY_POLL_CRON=0 * * * 1-5
JURISPRUDENCE_POLL_CRON=0 3 * * 1
LOG_LEVEL=info
```

Opcionales segun el modulo habilitado:

```env
OPENAI_API_KEY=<solo si se habilitan embeddings externos>
ANTHROPIC_API_KEY=<solo si se habilita enriquecimiento IA real>
OTEL_EXPORTER_OTLP_ENDPOINT=<solo si se envia observabilidad externa>
SUPABASE_SERVICE_ROLE_KEY=<solo tareas administrativas server-side futuras>
```

## Auditoria local sin secretos

Antes de tocar dashboards, validar que ejemplos, Render y esta guia sigan alineados:

```bash
npm run audit:env-readiness -- --strict --output artifacts/env-readiness.json
```

## Si se quiere API en Vercel despues

Hay que agregar adapter serverless:

- Extraer `buildApp()` ya existe.
- Crear handler en `apps/api/api/index.ts` o equivalente.
- No usar `app.listen` dentro del handler.
- Revisar compatibilidad con conexiones Prisma en serverless.
- No desplegar worker BullMQ como funcion serverless; requiere proceso persistente.

## Verificacion post-deploy

- Web carga sin errores.
- `GET <API_BASE_URL>/health` responde `{ status: "ok" }`; `GET <API_BASE_URL>/ready` valida además que Postgres esté disponible y devuelve HTTP 503 si no lo está.
- API puede crear producto y caso.
- Worker procesa `classification.case.submitted`.
- Logs no muestran secretos.

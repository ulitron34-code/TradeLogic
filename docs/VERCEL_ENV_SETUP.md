# Vercel y variables de entorno

## Alcance actual

El frontend `apps/web` puede conectarse a Vercel como app Next.js. La API Fastify y el worker BullMQ todavia estan pensados como procesos Node persistentes, no como funciones serverless de Vercel.

## Configuracion Vercel para web

- Framework preset: Next.js
- Root directory: `apps/web`
- Build command: `pnpm build`
- Install command: `pnpm install`
- Output directory: default Next.js

## Variables web

Actualmente el frontend es placeholder, pero conviene reservar:

```env
NEXT_PUBLIC_API_BASE_URL=https://<api-host>
```

## Variables backend/API

Estas variables deben vivir en el host de API/worker, no necesariamente en Vercel si se despliegan aparte:

```env
NODE_ENV=production
APP_BASE_URL=https://<web-host>
API_BASE_URL=https://<api-host>
DATABASE_URL=<supabase-postgres-url>
REDIS_URL=<redis-url>
S3_ENDPOINT=<storage-endpoint>
S3_REGION=<storage-region>
S3_BUCKET=<storage-bucket>
S3_ACCESS_KEY=<storage-access-key>
S3_SECRET_KEY=<storage-secret-key>
JWT_ISSUER=aduana-platform
JWT_AUDIENCE=aduana-web
JWT_SECRET=<32+ chars>
ENCRYPTION_KEY=<32 byte key>
LOG_LEVEL=info
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
- `GET <API_BASE_URL>/health` responde `{ status: "ok" }`.
- API puede crear producto y caso.
- Worker procesa `classification.case.submitted`.
- Logs no muestran secretos.
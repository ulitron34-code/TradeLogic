# Preparacion de publicacion

Este proyecto todavia no tiene GitHub, Supabase ni Vercel conectados. Este documento deja el orden exacto para pasar del repo local a un MVP desplegable.

## Estado actual

- Repo local: `F:\ADUANA\MVP_Tecnico`
- Rama local: `master`
- Commits locales existentes, sin remoto.
- Base local prevista: PostgreSQL via `docker-compose.yml`.
- Produccion prevista: Supabase Postgres + Vercel para `apps/web`.
- API y worker requieren una superficie de backend separada si se despliegan fuera de Vercel serverless.

## Orden recomendado

1. Crear repositorio GitHub vacio.
2. En `F:\ADUANA\MVP_Tecnico`, agregar remoto:

```bash
git remote add origin <URL_DEL_REPO>
git push -u origin master
```

3. Crear proyecto Supabase.
4. Copiar `DATABASE_URL` transaccional a `.env` local y a variables de entorno de despliegue.
5. Ejecutar migraciones Prisma contra Supabase.
6. Crear proyecto Vercel conectado al repo GitHub.
7. Configurar variables de entorno en Vercel.
8. Ejecutar deploy preview.
9. Validar checklist de go-live.

## Superficies de despliegue

El archivo `render.yaml` contiene el blueprint reproducible para el API y el worker. El API usa `/ready` como health check y todas las credenciales quedan como variables `sync: false`; deben configurarse en Render antes del primer deploy.

### Web

- Fuente: `apps/web`
- Framework: Next.js
- Hosting sugerido: Vercel

### API

- Fuente: `apps/api`
- Framework: Fastify
- Hosting sugerido para MVP: Render, Railway, Fly.io o contenedor propio.
- Nota: Vercel puede alojar funciones HTTP, pero el API actual arranca con `app.listen`; para Vercel serverless hay que crear adapter.

### Worker

- Fuente: `apps/worker`
- Requiere proceso persistente y Redis.
- Hosting sugerido: Render worker, Railway worker, Fly.io o VM.

### Infraestructura

- DB: Supabase Postgres
- Cola: Redis administrado o Upstash Redis compatible con BullMQ
- Storage: Supabase Storage o S3 compatible, pendiente de adapter

## Checklist go-live tecnico

Nota 2026-08-10: `packages/storage` ya incluye el adapter S3 compatible y el worker puede guardar objetos crudos con `putRawObject()`. Falta validar las variables y ejecutar el despliegue contra los servicios remotos.

- `pnpm install` completo.
- `pnpm db:generate` exitoso.
- `pnpm db:migrate` contra ambiente correcto.
- `pnpm typecheck` exitoso.
- `pnpm test` exitoso.
- `pnpm build` exitoso.
- Variables de entorno revisadas.
- Disclaimer legal visible en expediente/resultados criticos.
- Backups Supabase habilitados.
- Logs de API y worker visibles.
- Health checks configurados: `/health` confirma proceso vivo y `/ready` confirma conectividad con Postgres; Render debe usar `/ready` como health check del API.
- No hay secretos en repo.

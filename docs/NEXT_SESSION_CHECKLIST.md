# Checklist de siguiente sesion

## Antes de crear servicios externos

- Confirmar nombre final del repo GitHub.
- Confirmar si API/worker iran en Render, Railway, Fly.io o servidor propio.
- Confirmar proveedor Redis.
- Confirmar si storage sera Supabase Storage o S3 compatible.

## GitHub

- Crear repo vacio.
- Agregar remoto en `F:\ADUANA\MVP_Tecnico`.
- Push de `master`.
- Activar branch protection despues del primer push.

## Supabase

- Crear proyecto.
- Guardar `DATABASE_URL` fuera del repo.
- Ejecutar Prisma migrate.
- Ejecutar seed.
- Verificar tablas criticas.

## Vercel

- Conectar repo.
- Root `apps/web`.
- Configurar `NEXT_PUBLIC_API_BASE_URL` cuando exista host de API.

## Validacion local cuando npm responda

```bash
pnpm install
pnpm db:generate
pnpm test
pnpm typecheck
pnpm build
```
# Supabase y Prisma

## Crear proyecto

1. Entrar a Supabase.
2. Crear proyecto nuevo para Aduana MVP.
3. Guardar estos datos fuera del repo:
   - Project ref
   - Database password
   - Connection string pooled
   - Connection string direct

## Variables esperadas

Para Prisma migrate usa una conexion directa si Supabase la ofrece:

```env
DATABASE_URL="postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres?schema=public"
```

Para runtime serverless, si aplica, usar pooler:

```env
DATABASE_URL="postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&schema=public"
```

## Migracion inicial

Desde la raiz del repo:

```bash
copy .env.example .env
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm --filter @platform/db prisma:seed
```

## Verificacion SQL

Despues de migrar, confirmar tablas criticas:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'Organization',
    'User',
    'Product',
    'ProductVersion',
    'ClassificationCase',
    'ClassificationCandidate',
    'TariffCode',
    'AuditEvent',
    'IdempotencyRecord'
  )
ORDER BY table_name;
```

## Seed esperado

El seed crea:

- Usuario dev `owner@example.local`.
- Organizacion piloto.
- Membresia OWNER.
- Catalogo arancelario MX minimo para prueba de flujo.

## Pendientes antes de produccion real

- Definir politica de RLS si se accede a Supabase directamente desde frontend.
- Mantener backend como autoridad para `organizationId`.
- Separar `DATABASE_URL` de migracion y runtime si se usan poolers.
- Configurar backups y PITR segun plan Supabase.
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

## Storage (documentos y evidencia)

Local usa MinIO (`docker-compose.yml`). Para produccion, Supabase expone un endpoint S3-compatible por proyecto (Project Settings → Storage → S3 Connection). Apuntar las mismas variables que ya valida `packages/config`:

```env
S3_ENDPOINT="https://<project-ref>.supabase.co/storage/v1/s3"
S3_REGION="<region del proyecto, p.ej. us-east-1>"
S3_BUCKET="<nombre del bucket creado en Supabase Storage>"
S3_ACCESS_KEY="<access key generada en Storage → S3 Connection>"
S3_SECRET_KEY="<secret key generada en Storage → S3 Connection>"
```

Crear el bucket en el dashboard de Supabase Storage antes del primer despliegue; `packages/storage` no lo crea automaticamente. `forcePathStyle` ya esta activado en `packages/storage/src/index.ts` porque tanto MinIO como el endpoint S3 de Supabase lo requieren.

**Limitacion conocida**: el `sha256` de cada documento se calcula en el navegador (Web Crypto) y se confia tal cual al registrar el `Document` — no hay re-hash del lado del servidor todavia. El tamano (`sizeBytes`) si se valida contra el objeto real en el bucket via `HeadObject` antes de crear el registro, y el `storageKey` debe empezar con `org/{organizationId}/` para evitar que una organizacion registre un archivo subido por otra.
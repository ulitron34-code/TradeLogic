import { PrismaClient } from '@prisma/client';
export type { Prisma } from '@prisma/client';
export { upsertTariffCatalog, type TariffCatalogPersistenceRecord } from './tariffCatalog.js';
export {
  upsertRegulatoryRequirements,
  type RegulatoryRequirementPersistenceRecord,
} from './regulatoryRequirement.js';
export { persistHistoricalAuditRun, type HistoricalAuditRunPersistence } from './historicalAudit.js';
export {
  enqueueClassificationJob,
  claimNextClassificationJob,
  completeClassificationJob,
  failClassificationJob,
  getClassificationDatabaseSnapshot,
  type ClassificationQueueEvent,
  type ClassificationQueueSnapshot,
} from './classificationQueue.js';

// Document.sizeBytes es BigInt en Postgres; JSON.stringify no sabe serializar
// BigInt de forma nativa y Fastify tira TypeError al responder cualquier ruta
// que incluya un Document. Los tamaños de archivo caben sin problema en un
// Number (tope aplicado en la ruta de creacion: 50 MB), asi que se convierte
// aqui una sola vez para toda la app en vez de en cada handler.
(BigInt.prototype as unknown as { toJSON(): number }).toJSON = function toJSON(this: bigint) {
  return Number(this);
};

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const db = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

/**
 * Segunda capa de aislamiento multiempresa, detras del filtro por
 * organizationId que ya aplica cada ruta. Fija app.current_org_id en la
 * sesion de Postgres para cada operacion, dentro de una transaccion, para
 * que las politicas RLS (ver supabase/rls.sql) bloqueen filas de otra
 * organizacion incluso si algun query app-level llegara a olvidar el filtro.
 *
 * No-op sobre clientes que no son un PrismaClient real (p.ej. los mocks de
 * apps/api/src/routes.test.ts), para no romper las pruebas unitarias.
 */
export function scopeToOrganization<T extends { $extends?: unknown }>(client: T, organizationId: string): T {
  if (typeof client.$extends !== 'function') return client;
  const base = client as unknown as PrismaClient;

  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          const [, result] = await base.$transaction([
            base.$executeRaw`SELECT set_config('app.current_org_id', ${organizationId}, TRUE)`,
            query(args),
          ]);
          return result;
        },
      },
    },
  }) as unknown as T;
}

import { createHash } from 'node:crypto';
import { db } from '@platform/db';

export function hashPayload(payload: unknown) {
  return createHash('sha256').update(JSON.stringify(payload ?? null)).digest('hex');
}

export async function replayOrStore(args: {
  organizationId: string;
  key: string;
  scope: string;
  requestHash: string;
  build: () => Promise<unknown>;
}) {
  const existing = await db.idempotencyRecord.findUnique({
    where: {
      organizationId_scope_key: {
        organizationId: args.organizationId,
        scope: args.scope,
        key: args.key,
      },
    },
  });

  if (existing) {
    if (existing.requestHash !== args.requestHash) {
      const error = new Error('Idempotency-Key was already used with a different payload');
      Object.assign(error, { statusCode: 409, code: 'IDEMPOTENCY_CONFLICT' });
      throw error;
    }
    return existing.response;
  }

  const response = await args.build();
  await db.idempotencyRecord.create({
    data: {
      organizationId: args.organizationId,
      key: args.key,
      scope: args.scope,
      requestHash: args.requestHash,
      response: response as object,
    },
  });
  return response;
}
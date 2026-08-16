import type { PrismaClient } from '@prisma/client';
import { db } from './index.js';

export type IngestionJobType = 'REGULATORY' | 'JURISPRUDENCE';
type IngestionQueueClient = Pick<PrismaClient, '$queryRaw' | 'ingestionJob'>;
const MAX_ATTEMPTS = 3;
const STALE_LOCK_MINUTES = 10;

export type IngestionJobClaim = { id: string; jobType: IngestionJobType; attempts: number };

export async function ensureIngestionJobs(client: IngestionQueueClient = db) {
  await Promise.all((['REGULATORY', 'JURISPRUDENCE'] as const).map((jobType) =>
    client.ingestionJob.upsert({
      where: { jobType },
      create: { jobType },
      update: {},
    }),
  ));
}

export async function claimNextIngestionJob(client: IngestionQueueClient = db): Promise<IngestionJobClaim | null> {
  await client.$queryRaw`
    UPDATE "IngestionJob"
    SET "status" = 'FAILED', "availableAt" = NOW(), "failedAt" = NOW(),
        "lockedAt" = NULL, "lastError" = COALESCE("lastError", 'Worker lock expired after maximum attempts')
    WHERE "status" = 'ACTIVE'
      AND "attempts" >= ${MAX_ATTEMPTS}
      AND "lockedAt" < NOW() - (${STALE_LOCK_MINUTES} * INTERVAL '1 minute')
  `;
  const rows = await client.$queryRaw<IngestionJobClaim[]>`
    WITH next_job AS (
      SELECT "id"
      FROM "IngestionJob"
      WHERE ("status" = 'WAITING' AND "availableAt" <= NOW())
         OR ("status" = 'ACTIVE' AND "attempts" < ${MAX_ATTEMPTS} AND "lockedAt" < NOW() - (${STALE_LOCK_MINUTES} * INTERVAL '1 minute'))
      ORDER BY "availableAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    UPDATE "IngestionJob" AS job
    SET "status" = 'ACTIVE', "attempts" = job."attempts" + 1, "lockedAt" = NOW()
    FROM next_job
    WHERE job."id" = next_job."id"
    RETURNING job."id", job."jobType", job."attempts"
  `;
  return rows[0] ?? null;
}

export async function completeIngestionJob(id: string, nextRunAt: Date, client: IngestionQueueClient = db) {
  return client.ingestionJob.update({
    where: { id },
    data: {
      status: 'WAITING',
      availableAt: nextRunAt,
      completedAt: new Date(),
      lastRunAt: new Date(),
      lockedAt: null,
      lastError: null,
    },
  });
}

export async function failIngestionJob(id: string, error: unknown, attempts: number, nextRunAt: Date, client: IngestionQueueClient = db) {
  const message = (error instanceof Error ? error.message : String(error)).slice(0, 1000);
  const retryAt = attempts < 3 ? new Date(Date.now() + attempts * 5000) : nextRunAt;
  return client.ingestionJob.update({
    where: { id },
    data: {
      status: 'WAITING',
      availableAt: retryAt,
      failedAt: attempts < 3 ? null : new Date(),
      lockedAt: null,
      lastError: message,
    },
  });
}

export async function getIngestionSchedulerSnapshot(client: IngestionQueueClient = db) {
  return client.ingestionJob.findMany({ orderBy: { jobType: 'asc' } });
}

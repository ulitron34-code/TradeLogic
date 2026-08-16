import type { PrismaClient } from '@prisma/client';
import { db } from './index.js';

export type ClassificationQueueEvent = {
  event_id: string;
  occurred_at: string;
  organization_id: string;
  actor_id: string;
  trace_id: string;
  schema_version: 1;
  payload: { case_id: string; product_id: string; product_version_id?: string };
};

type QueueClient = Pick<PrismaClient, '$queryRaw' | 'classificationJob'>;

export type ClassificationQueueSnapshot = {
  name: string;
  isPaused: boolean;
  counts: { waiting: number; active: number; completed: number; failed: number; delayed: number; paused: number };
  recentJobs: Array<{
    id: string;
    name: string;
    state: string;
    attemptsMade: number;
    failedReason: string | null;
    processedOn: number | null;
    finishedOn: number | null;
    timestamp: number;
    eventId: string;
    caseId: string;
    organizationId: string;
  }>;
};

export async function enqueueClassificationJob(
  event: ClassificationQueueEvent,
  client: QueueClient = db,
) {
  return client.classificationJob.upsert({
    where: { eventId: event.event_id },
    create: {
      eventId: event.event_id,
      organizationId: event.organization_id,
      caseId: event.payload.case_id,
      event,
    },
    update: {},
  });
}

export async function claimNextClassificationJob(client: QueueClient = db) {
  const rows = await client.$queryRaw<Array<{
    id: string;
    event: ClassificationQueueEvent;
    attempts: number;
  }>>`
    WITH next_job AS (
      SELECT "id"
      FROM "ClassificationJob"
      WHERE ("status" = 'WAITING' AND "availableAt" <= NOW())
         OR ("status" = 'ACTIVE' AND "lockedAt" < NOW() - INTERVAL '5 minutes')
      ORDER BY "createdAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    UPDATE "ClassificationJob" AS job
    SET "status" = 'ACTIVE', "attempts" = job."attempts" + 1, "lockedAt" = NOW()
    FROM next_job
    WHERE job."id" = next_job."id"
    RETURNING job."id", job."event", job."attempts"
  `;
  return rows[0] ?? null;
}

export async function completeClassificationJob(id: string, client: QueueClient = db) {
  return client.classificationJob.update({
    where: { id },
    data: { status: 'COMPLETED', completedAt: new Date(), lockedAt: null, lastError: null },
  });
}

export async function failClassificationJob(id: string, error: unknown, attempts: number, client: QueueClient = db) {
  const message = error instanceof Error ? error.message : String(error);
  const retry = attempts < 3;
  return client.classificationJob.update({
    where: { id },
    data: {
      status: retry ? 'WAITING' : 'FAILED',
      availableAt: retry ? new Date(Date.now() + attempts * 5000) : new Date(),
      failedAt: retry ? null : new Date(),
      lockedAt: null,
      lastError: message.slice(0, 1000),
    },
  });
}

export async function getClassificationDatabaseSnapshot(eventIds?: string[], organizationId?: string, client: QueueClient = db): Promise<ClassificationQueueSnapshot> {
  const eventWhere = eventIds?.length ? { eventId: { in: eventIds.slice(0, 10) } } : {};
  const [groups, jobs] = await Promise.all([
    organizationId
      ? client.classificationJob.groupBy({ by: ['status'], where: { organizationId }, _count: { _all: true } })
      : client.classificationJob.groupBy({ by: ['status'], _count: { _all: true } }),
    organizationId
      ? client.classificationJob.findMany({ where: { organizationId, ...eventWhere }, orderBy: { createdAt: 'desc' }, take: 10 })
      : client.classificationJob.findMany({ where: eventWhere, orderBy: { createdAt: 'desc' }, take: 10 }),
  ]);
  const counts = Object.fromEntries(groups.map((group) => [group.status.toLowerCase(), typeof group._count === 'object' && group._count ? group._count._all ?? 0 : 0]));
  return {
    name: 'classification-postgres',
    isPaused: false,
    counts: { waiting: counts.waiting ?? 0, active: counts.active ?? 0, completed: counts.completed ?? 0, failed: counts.failed ?? 0, delayed: 0, paused: 0 },
    recentJobs: jobs.map((job) => {
      const event = job.event as unknown as ClassificationQueueEvent;
      return { id: job.id, name: 'classification.case.submitted', state: job.status.toLowerCase(), attemptsMade: job.attempts, failedReason: job.lastError, processedOn: job.lockedAt?.getTime() ?? null, finishedOn: job.completedAt?.getTime() ?? null, timestamp: job.createdAt.getTime(), eventId: job.eventId, caseId: event.payload.case_id, organizationId: job.organizationId };
    }),
  };
}

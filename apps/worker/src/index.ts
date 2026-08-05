import { randomUUID } from 'node:crypto';
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '@platform/config';
import { db } from '@platform/db';

const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });

new Worker('regulatory-ingestion', async job => {
  console.log('processing regulatory source', job.data);
}, { connection });

new Worker('classification-analysis', async job => {
  if (job.name !== 'classification.case.submitted') return;

  const event = job.data as {
    event_id: string;
    organization_id: string;
    actor_id: string;
    trace_id: string;
    payload: { case_id: string; product_id: string; product_version_id?: string };
  };

  const classificationCase = await db.classificationCase.findFirst({
    where: {
      id: event.payload.case_id,
      organizationId: event.organization_id,
      status: 'INTAKE',
    },
  });

  if (!classificationCase) {
    console.warn('classification case not ready for analysis', event.payload.case_id);
    return;
  }

  const updatedCase = await db.classificationCase.update({
    where: { id: classificationCase.id },
    data: { status: 'IN_ANALYSIS' },
  });

  await db.auditEvent.create({
    data: {
      organizationId: event.organization_id,
      actorId: event.actor_id,
      action: 'classification.analysis.started',
      entityType: 'ClassificationCase',
      entityId: updatedCase.id,
      before: { status: classificationCase.status },
      after: {
        status: updatedCase.status,
        sourceEventId: event.event_id,
        analysisRunId: randomUUID(),
      },
      traceId: event.trace_id,
    },
  });
}, { connection });

console.log('worker started');
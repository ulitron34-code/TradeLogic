import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '@platform/config';

export const CLASSIFICATION_ANALYSIS_QUEUE = 'classification-analysis';

const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });

export const classificationAnalysisQueue = new Queue(CLASSIFICATION_ANALYSIS_QUEUE, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 1000,
    removeOnFail: 1000,
  },
});

export async function enqueueClassificationSubmitted(event: {
  event_id: string;
  occurred_at: string;
  organization_id: string;
  actor_id: string;
  trace_id: string;
  schema_version: 1;
  payload: {
    case_id: string;
    product_id: string;
    product_version_id?: string;
  };
}) {
  await classificationAnalysisQueue.add('classification.case.submitted', event, {
    jobId: event.event_id,
  });
}
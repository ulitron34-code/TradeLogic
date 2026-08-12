import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { env } from '@platform/config';

export const CLASSIFICATION_ANALYSIS_QUEUE = 'classification-analysis';

let queue: Queue | undefined;
let redisConnection: Redis | undefined;

function getRedisConnection() {
  redisConnection ??= new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
  return redisConnection;
}

function getClassificationAnalysisQueue() {
  queue ??= new Queue(CLASSIFICATION_ANALYSIS_QUEUE, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 1000,
      removeOnFail: 1000,
    },
  });
  return queue;
}

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
  await getClassificationAnalysisQueue().add('classification.case.submitted', event, {
    jobId: event.event_id,
  });
}

export async function checkQueueReadiness() {
  await getRedisConnection().ping();
}

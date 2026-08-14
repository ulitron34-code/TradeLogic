import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { env } from '@platform/config';

export const CLASSIFICATION_ANALYSIS_QUEUE = 'classification-analysis';

const REDIS_READINESS_TIMEOUT_MS = 5_000;
const CLASSIFICATION_DIAGNOSTIC_JOB_LIMIT = 10;

let queue: Queue | undefined;
let redisConnection: Redis | undefined;

type ClassificationQueueSnapshotOptions = {
  eventIds?: string[];
};

function createRedisConnection() {
  const connection = new Redis(env.REDIS_URL, {
    connectTimeout: REDIS_READINESS_TIMEOUT_MS,
    enableReadyCheck: false,
    maxRetriesPerRequest: null,
    retryStrategy: (attempt) => Math.min(attempt * 250, 2_000),
  });
  connection.on('error', (error) => {
    console.warn('redis connection error', { message: error.message });
  });
  return connection;
}

function getRedisConnection() {
  redisConnection ??= createRedisConnection();
  return redisConnection;
}

function withTimeout<T>(operation: Promise<T>, timeoutMs: number, message: string) {
  let timeout: NodeJS.Timeout | undefined;
  const timer = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  return Promise.race([operation, timer]).finally(() => {
    if (timeout) clearTimeout(timeout);
  });
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

async function serializeJob(job: Awaited<ReturnType<Queue['getJob']>>) {
  if (!job) return null;
  return {
    id: job.id ?? null,
    name: job.name,
    state: await job.getState(),
    attemptsMade: job.attemptsMade,
    failedReason: job.failedReason ?? null,
    processedOn: job.processedOn ?? null,
    finishedOn: job.finishedOn ?? null,
    timestamp: job.timestamp,
    eventId: typeof job.data?.event_id === 'string' ? job.data.event_id : null,
    caseId: typeof job.data?.payload?.case_id === 'string' ? job.data.payload.case_id : null,
    organizationId: typeof job.data?.organization_id === 'string' ? job.data.organization_id : null,
  };
}

export async function getClassificationQueueSnapshot(options: ClassificationQueueSnapshotOptions = {}) {
  const queue = getClassificationAnalysisQueue();
  const [counts, isPaused] = await Promise.all([
    queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed', 'paused'),
    queue.isPaused(),
  ]);
  const jobs = options.eventIds?.length
    ? (await Promise.all(options.eventIds.slice(0, CLASSIFICATION_DIAGNOSTIC_JOB_LIMIT).map((eventId) => queue.getJob(eventId)))).filter((job) => job !== undefined)
    : await queue.getJobs(['waiting', 'active', 'failed', 'delayed', 'completed'], 0, CLASSIFICATION_DIAGNOSTIC_JOB_LIMIT - 1, false);
  const recentJobs = await Promise.all(jobs.map((job) => serializeJob(job)));

  return {
    name: CLASSIFICATION_ANALYSIS_QUEUE,
    isPaused,
    counts,
    recentJobs: recentJobs.filter((job) => job !== null),
  };
}

export async function checkQueueReadiness() {
  await withTimeout(
    getRedisConnection().ping(),
    REDIS_READINESS_TIMEOUT_MS,
    `Redis readiness check exceeded ${REDIS_READINESS_TIMEOUT_MS}ms`,
  );
}

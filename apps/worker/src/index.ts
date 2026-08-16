import {
  claimNextClassificationJob,
  completeClassificationJob,
  failClassificationJob,
  type ClassificationQueueEvent,
} from '@platform/db';
import { runClassificationAnalysis } from './classificationAnalysis.js';

const POLL_INTERVAL_MS = 2_000;
const STALE_LOCK_MINUTES = 5;
let stopping = false;

async function processOneClassificationJob() {
  const job = await claimNextClassificationJob();
  if (!job) return false;

  const event = job.event as ClassificationQueueEvent;
  console.log('classification postgres job received', {
    jobId: job.id,
    eventId: event.event_id,
    caseId: event.payload.case_id,
    organizationId: event.organization_id,
    attempts: job.attempts,
  });

  try {
    const result = await runClassificationAnalysis(event);
    await completeClassificationJob(job.id);
    console.log('classification postgres job completed', {
      jobId: job.id,
      eventId: event.event_id,
      caseId: event.payload.case_id,
      result,
    });
  } catch (error) {
    await failClassificationJob(job.id, error, job.attempts);
    console.error('classification postgres job failed', {
      jobId: job.id,
      eventId: event.event_id,
      caseId: event.payload.case_id,
      message: error instanceof Error ? error.message : String(error),
    });
  }
  return true;
}

async function pollClassificationQueue() {
  while (!stopping) {
    try {
      const processed = await processOneClassificationJob();
      if (!processed) await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    } catch (error) {
      console.error('classification postgres queue error', { message: error instanceof Error ? error.message : String(error) });
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }
}

console.log('worker started', {
  transport: 'postgresql',
  queue: 'classification-postgres',
  pollIntervalMs: POLL_INTERVAL_MS,
  staleLockMinutes: STALE_LOCK_MINUTES,
  note: 'Redis is optional; regulatory and jurisprudence scheduled ingestion remains paused until a non-Redis scheduler is added.',
});

void pollClassificationQueue();

async function shutdown(signal: string) {
  stopping = true;
  console.log(`worker shutting down (${signal})`);
}

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, () => {
    void shutdown(signal).catch((error) => {
      console.error('worker shutdown failed', error);
      process.exitCode = 1;
    });
  });
}

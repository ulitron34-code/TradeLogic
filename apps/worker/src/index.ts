import {
  claimNextClassificationJob,
  completeClassificationJob,
  failClassificationJob,
  type ClassificationQueueEvent,
  claimNextIngestionJob,
  completeIngestionJob,
  ensureIngestionJobs,
  failIngestionJob,
} from '@platform/db';
import { runClassificationAnalysis } from './classificationAnalysis.js';
import { runRegulatoryIngestion } from './regulatoryIngestion.js';
import { runJurisprudenceIngestion } from './jurisprudenceIngestion.js';

const POLL_INTERVAL_MS = 2_000;
const STALE_LOCK_MINUTES = 5;
const REGULATORY_INTERVAL_MS = 60 * 60 * 1000;
const JURISPRUDENCE_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
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

function nextRegulatoryRun() { return new Date(Date.now() + REGULATORY_INTERVAL_MS); }
function nextJurisprudenceRun() { return new Date(Date.now() + JURISPRUDENCE_INTERVAL_MS); }

function todayInMexicoCity() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { year: Number(value.year), month: Number(value.month), day: Number(value.day) };
}

async function processOneIngestionJob() {
  const job = await claimNextIngestionJob();
  if (!job) return false;

  console.log('postgres ingestion job received', { jobId: job.id, jobType: job.jobType, attempts: job.attempts });
  try {
    let result: unknown;
    let nextRunAt: Date;
    if (job.jobType === 'REGULATORY') {
      result = await runRegulatoryIngestion(todayInMexicoCity());
      nextRunAt = nextRegulatoryRun();
    } else {
      result = await runJurisprudenceIngestion();
      nextRunAt = nextJurisprudenceRun();
    }
    await completeIngestionJob(job.id, nextRunAt);
    console.log('postgres ingestion job completed', { jobId: job.id, jobType: job.jobType, nextRunAt, result });
  } catch (error) {
    const nextRunAt = job.jobType === 'REGULATORY' ? nextRegulatoryRun() : nextJurisprudenceRun();
    await failIngestionJob(job.id, error, job.attempts, nextRunAt);
    console.error('postgres ingestion job failed', { jobId: job.id, jobType: job.jobType, message: error instanceof Error ? error.message : String(error) });
  }
  return true;
}

async function pollQueues() {
  await ensureIngestionJobs();
  while (!stopping) {
    try {
      const processed = (await processOneClassificationJob()) || (await processOneIngestionJob());
      if (!processed) await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    } catch (error) {
      console.error('postgres queue error', { message: error instanceof Error ? error.message : String(error) });
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }
}

console.log('worker started', {
  transport: 'postgresql',
  queues: ['classification-postgres', 'regulatory-postgres', 'jurisprudence-postgres'],
  pollIntervalMs: POLL_INTERVAL_MS,
  staleLockMinutes: STALE_LOCK_MINUTES,
  schedule: { regulatory: 'hourly', jurisprudence: 'weekly' },
  note: 'Classification, DOF and jurisprudence are scheduled through PostgreSQL; Redis is not required by the worker.',
});

void pollQueues();

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

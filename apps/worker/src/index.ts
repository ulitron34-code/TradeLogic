import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { env } from '@platform/config';
import { db } from '@platform/db';
import { runRegulatoryIngestion } from './regulatoryIngestion.js';
import { runJurisprudenceIngestion } from './jurisprudenceIngestion.js';
import { runClassificationAnalysis, type ClassificationAnalysisEvent } from './classificationAnalysis.js';

const connection = new Redis(env.REDIS_URL, {
  connectTimeout: 5_000,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
  retryStrategy: (attempt) => Math.min(attempt * 250, 2_000),
});
connection.on('error', (error) => {
  console.warn('redis connection error', { message: error.message });
});
connection.on('ready', () => {
  console.log('redis connection ready');
});

const REGULATORY_INGESTION_QUEUE = 'regulatory-ingestion';
const JURISPRUDENCE_INGESTION_QUEUE = 'jurisprudence-ingestion';

// Registro idempotente: BullMQ dedupe los jobs repetibles por cola + patron
// + jobId, asi que volver a llamar add() en cada arranque del worker no crea
// duplicados mientras el patron no cambie.
const regulatoryIngestionQueue = new Queue(REGULATORY_INGESTION_QUEUE, { connection });
await regulatoryIngestionQueue.add(
  'regulatory.ingestion.scheduled',
  {},
  { repeat: { pattern: env.REGULATORY_POLL_CRON }, jobId: 'regulatory-ingestion-scheduled' },
);

const jurisprudenceIngestionQueue = new Queue(JURISPRUDENCE_INGESTION_QUEUE, { connection });
await jurisprudenceIngestionQueue.add(
  'jurisprudence.ingestion.scheduled',
  {},
  { repeat: { pattern: env.JURISPRUDENCE_POLL_CRON }, jobId: 'jurisprudence-ingestion-scheduled' },
);

const regulatoryWorker = new Worker(
  REGULATORY_INGESTION_QUEUE,
  async () => {
    const today = new Date();
    const date = { year: today.getUTCFullYear(), month: today.getUTCMonth() + 1, day: today.getUTCDate() };
    try {
      const result = await runRegulatoryIngestion(date);
      console.log('regulatory ingestion run', { date, ...result });
    } catch (error) {
      // El DOF es un sitio legado sin SLA (ver docs/REGULATORY_INGESTION.md);
      // un fallo aqui no debe tumbar el proceso del worker ni afectar la
      // cola de clasificacion.
      console.error('regulatory ingestion run failed', error);
    }
  },
  { connection },
);

const jurisprudenceWorker = new Worker(JURISPRUDENCE_INGESTION_QUEUE, async () => {
  try {
    const result = await runJurisprudenceIngestion();
    console.log('jurisprudence ingestion run', result);
  } catch (error) {
    console.error('jurisprudence ingestion run failed', error);
  }
}, { connection });

const classificationWorker = new Worker('classification-analysis', async job => {
  if (job.name !== 'classification.case.submitted') {
    console.warn('classification job ignored: unknown job name', { jobId: job.id, jobName: job.name });
    return { status: 'IGNORED_UNKNOWN_JOB' as const };
  }

  const event = job.data as ClassificationAnalysisEvent;
  console.log('classification job received', {
    jobId: job.id,
    eventId: event.event_id,
    caseId: event.payload.case_id,
    organizationId: event.organization_id,
  });
  const result = await runClassificationAnalysis(event);
  console.log('classification job completed', {
    jobId: job.id,
    eventId: event.event_id,
    caseId: event.payload.case_id,
    result,
  });
  return result;
}, { connection });

const workers = [regulatoryWorker, jurisprudenceWorker, classificationWorker];
const workerQueues = [
  REGULATORY_INGESTION_QUEUE,
  JURISPRUDENCE_INGESTION_QUEUE,
  'classification-analysis',
] as const;

for (const [index, worker] of workers.entries()) {
  const queue = workerQueues[index];
  worker.on('ready', () => {
    console.log('worker queue ready', { queue });
  });
  worker.on('error', (error) => {
    console.error('worker queue error', { queue, message: error.message });
  });
  worker.on('failed', (job, error) => {
    console.error('worker job failed', {
      queue,
      jobId: job?.id ?? null,
      jobName: job?.name ?? null,
      message: error.message,
    });
  });
}

console.log('worker started', {
  queues: workerQueues,
  schedules: {
    regulatoryIngestion: env.REGULATORY_POLL_CRON,
    jurisprudenceIngestion: env.JURISPRUDENCE_POLL_CRON,
  },
});

async function shutdown(signal: string) {
  console.log(`worker shutting down (${signal})`);
  await Promise.all([
    ...workers.map((worker) => worker.close()),
    regulatoryIngestionQueue.close(),
    jurisprudenceIngestionQueue.close(),
  ]);
  await connection.quit();
}

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, () => {
    void shutdown(signal).catch((error) => {
      console.error('worker shutdown failed', error);
      process.exitCode = 1;
    });
  });
}

import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { env } from '@platform/config';
import { db } from '@platform/db';
import { runRegulatoryIngestion } from './regulatoryIngestion.js';
import { runJurisprudenceIngestion } from './jurisprudenceIngestion.js';
import { runClassificationAnalysis, type ClassificationAnalysisEvent } from './classificationAnalysis.js';

const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });

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
  if (job.name !== 'classification.case.submitted') return;
  await runClassificationAnalysis(job.data as ClassificationAnalysisEvent);
}, { connection });

console.log('worker started');

const workers = [regulatoryWorker, jurisprudenceWorker, classificationWorker];

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


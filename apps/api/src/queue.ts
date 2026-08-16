import {
  enqueueClassificationJob,
  getClassificationDatabaseSnapshot,
  db,
  type ClassificationQueueEvent,
  type ClassificationQueueSnapshot,
} from '@platform/db';

export const CLASSIFICATION_ANALYSIS_QUEUE = 'classification-postgres';

export async function enqueueClassificationSubmitted(event: ClassificationQueueEvent) {
  await enqueueClassificationJob(event);
}

export async function getClassificationQueueSnapshot(options: { eventIds?: string[]; organizationId?: string } = {}): Promise<ClassificationQueueSnapshot> {
  return getClassificationDatabaseSnapshot(options.eventIds, options.organizationId);
}

export async function checkQueueReadiness() {
  await db.$queryRaw`SELECT 1`;
}

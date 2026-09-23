import { Job } from 'bullmq';
import { logger, getRequestContext } from '@maildesk/observability';

export async function noopJob(job: Job<{ requestId?: string }>): Promise<void> {
  const ctx = getRequestContext();
  const requestId = job.data.requestId || ctx?.requestId || 'unknown';
  
  logger.info({
    message: 'Processing noop job',
    requestId,
    jobId: job.id,
  });
  
  // Simulate some work
  await new Promise((resolve) => setTimeout(resolve, 100));
  
  logger.info({
    message: 'Noop job completed',
    requestId,
    jobId: job.id,
  });
}

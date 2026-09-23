import { describe, it, expect } from 'vitest';
import { noopJob } from '../src/jobs/noop.js';
import type { Job } from 'bullmq';

describe('Worker Noop Job', () => {
  it('processes job and logs payload', async () => {
    const mockJob = {
      id: 'test-job-123',
      data: { requestId: 'test-request-456' },
    } as Job<{ requestId?: string }>;

    await expect(noopJob(mockJob)).resolves.not.toThrow();
  });
});

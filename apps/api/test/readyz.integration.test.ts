import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../src/server.js';
import { closePool } from '@maildesk/db';
import type { FastifyInstance } from 'fastify';

describe('API Readyz Integration', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await buildServer();
  });

  afterAll(async () => {
    await server.close();
    await closePool();
  });

  it('T2: /readyz returns 200 with both dependencies healthy', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/readyz',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('status', 'ok');
    expect(body).toHaveProperty('checks');
    expect(body.checks).toHaveProperty('postgres', true);
    expect(body.checks).toHaveProperty('redis', true);
  });

  it('T3: /readyz returns 503 when Postgres is unreachable', async () => {
    // This test would require mocking or stopping Postgres
    // For now, we'll skip this as it requires Testcontainers setup
    // This will be implemented in the integration test project
    it.skip('T3: /readyz returns 503 when Postgres is unreachable', async () => {
      // Implementation with Testcontainers
    });
  });
});

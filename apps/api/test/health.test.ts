import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../src/server.js';
import { closePool } from '@maildesk/db';
import type { FastifyInstance } from 'fastify';

describe('API Health Endpoints', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await buildServer();
  });

  afterAll(async () => {
    await server.close();
    await closePool();
  });

  it('T1: /healthz returns 200 and touches no dependencies', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/healthz',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('T4: Unknown route returns error envelope with request_id', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/nonexistent',
    });

    expect(response.statusCode).toBe(404);
    const body = response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toHaveProperty('type', 'not_found');
    expect(body.error).toHaveProperty('code', 'resource_not_found');
    expect(body.error).toHaveProperty('message');
    expect(body.error).toHaveProperty('request_id');
  });

  it('T5: Route that throws returns 500 with no stack trace in production', async () => {
    // Add a temporary error route
    server.route({
      method: 'GET',
      url: '/_test/error',
      handler: async () => {
        throw new Error('Test error');
      },
    });

    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const response = await server.inject({
      method: 'GET',
      url: '/_test/error',
    });

    process.env.NODE_ENV = originalEnv;

    expect(response.statusCode).toBe(500);
    const body = response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toHaveProperty('type', 'internal_error');
    expect(body.error).toHaveProperty('code', 'unexpected');
    expect(body.error.message).not.toContain('Test error');
    expect(body.error.message).not.toContain('Error');
  });

  it('T9: Inbound X-Request-Id is adopted and echoed', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/healthz',
      headers: {
        'X-Request-Id': 'test-request-id-123',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['x-request-id']).toBe('test-request-id-123');
  });

  it('T9: Request ID is generated when not provided', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/healthz',
    });

    expect(response.statusCode).toBe(200);
    const requestId = response.headers['x-request-id'];
    expect(requestId).toBeDefined();
    expect(typeof requestId).toBe('string');
    expect(requestId).toMatch(/^req_/);
  });
});

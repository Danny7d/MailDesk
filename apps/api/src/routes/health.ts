import { FastifyPluginAsync } from 'fastify';
import { db } from '@maildesk/db';

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  // /healthz - process health only, touches no dependencies
  fastify.get('/healthz', async () => {
    return { status: 'ok' };
  });

  // /readyz - checks dependencies with 1s timeout each
  fastify.get('/readyz', async (_request, reply) => {
    const checks = {
      postgres: false,
      redis: false,
    };

    const errors: string[] = [];

    // Check Postgres with timeout
    try {
      const pgPromise = Promise.race([
        (db as { execute: (sql: string) => Promise<unknown> }).execute('SELECT 1'),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Postgres timeout')), 1000)
        ),
      ]) as Promise<unknown>;
      
      await pgPromise;
      checks.postgres = true;
    } catch (error) {
      errors.push(`Postgres: ${(error as Error).message}`);
    }

    // Check Redis with timeout
    try {
      const redis = (fastify as { redis: { ping: () => Promise<string> } }).redis;
      const redisPromise = Promise.race([
        redis.ping(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Redis timeout')), 1000)
        ),
      ]) as Promise<string>;
      
      await redisPromise;
      checks.redis = true;
    } catch (error) {
      errors.push(`Redis: ${(error as Error).message}`);
    }

    const allHealthy = Object.values(checks).every(Boolean);

    if (allHealthy) {
      return { status: 'ok', checks };
    } else {
      reply.status(503);
      return { status: 'not_ready', checks, errors };
    }
  });
};

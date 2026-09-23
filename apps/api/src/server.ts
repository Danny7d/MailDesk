import fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';
import rateLimit from '@fastify/rate-limit';
import * as Redis from 'ioredis';
import { getConfig } from './config.js';
import { requestContextPlugin } from './plugins/request-context.js';
import { errorHandlerPlugin } from './plugins/error-handler.js';
import { metricsPlugin } from './plugins/metrics.js';
import { healthRoutes } from './routes/health.js';
import { logger } from '@maildesk/observability';

export async function buildServer() {
  const config = getConfig();

  const server = fastify({
    logger: false, // We use pino directly
    trustProxy: true,
  });

  // Register Redis
  const redis = new (Redis as unknown as { default: new (url: string) => unknown }).default(config.REDIS_URL) as { ping: () => Promise<string>; quit: () => Promise<void> };
  await redis.ping();
  server.decorate('redis', redis);

  // Register plugins
  await server.register(cors, {
    origin: new URL(config.CORS_ORIGIN).origin,
    credentials: true,
  });

  await server.register(helmet);

  await server.register(sensible);

  await server.register(rateLimit, {
    redis,
    max: 100,
    timeWindow: '1 minute',
  });

  await server.register(requestContextPlugin);
  await server.register(errorHandlerPlugin);
  await server.register(metricsPlugin);

  // Register routes
  await server.register(healthRoutes);

  // Dev-only noop endpoint for testing
  if (config.NODE_ENV !== 'production') {
    server.post('/_dev/noop', async (request) => {
      const { Queue } = await import('bullmq');
      const { MAINTENANCE_QUEUE } = await import('./queues.js');

      const queue = new Queue(MAINTENANCE_QUEUE, {
        connection: {
          host: new URL(config.REDIS_URL).hostname,
          port: parseInt(new URL(config.REDIS_URL).port),
        },
      });

      const ctx = (request as { context?: { requestId: string } }).context || { requestId: 'unknown' };

      await queue.add('noop', { requestId: ctx.requestId });

      return { status: 'enqueued', requestId: ctx.requestId };
    });
  }

  // Graceful shutdown
  server.addHook('onClose', async () => {
    logger.info('Shutting down server...');
    await redis.quit();
    logger.info('Shutdown complete');
  });

  return server;
}

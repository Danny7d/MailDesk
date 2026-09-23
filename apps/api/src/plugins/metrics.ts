import { FastifyPluginAsync } from 'fastify';
import { registry, recordHttpRequest, incrementActiveConnections, decrementActiveConnections } from '@maildesk/observability';

export const metricsPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', async () => {
    incrementActiveConnections();
  });

  fastify.addHook('onResponse', async (request, reply) => {
    decrementActiveConnections();
    
    const duration = (reply as { getResponseTime: () => number }).getResponseTime() / 1000; // Convert to seconds
    const route = request.routeOptions.url || request.url;
    
    recordHttpRequest(
      request.method,
      route,
      reply.statusCode,
      duration
    );
  });

  fastify.get('/metrics', async (request, reply) => {
    reply.type('text/plain');
    return await registry.metrics();
  });
};

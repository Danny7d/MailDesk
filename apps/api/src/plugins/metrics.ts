import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { registry, recordHttpRequest, incrementActiveConnections, decrementActiveConnections } from '@maildesk/observability';

const metricsPluginImpl: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', async () => {
    incrementActiveConnections();
  });

  fastify.addHook('onResponse', async (request, reply) => {
    decrementActiveConnections();
    
    const duration = (reply as unknown as { getResponseTime: () => number }).getResponseTime() / 1000; // Convert to seconds
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

export const metricsPlugin = fp(metricsPluginImpl, { name: 'metricsPlugin' });

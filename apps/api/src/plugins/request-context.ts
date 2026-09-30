import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { requestContext, generateRequestId } from '@maildesk/observability';

const requestContextPluginImpl: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', async (request, reply) => {
    const requestId = request.headers['x-request-id'] as string | undefined;
    const ctx = {
      requestId: requestId || generateRequestId(),
    };
    
    requestContext.run(ctx, () => {
      // Store context in request for later access
      (request as unknown as { context: { requestId: string } }).context = ctx;
    });
    
    // Echo request ID in response header
    reply.header('x-request-id', ctx.requestId);
  });
};

export const requestContextPlugin = fp(requestContextPluginImpl, { name: 'requestContextPlugin' });

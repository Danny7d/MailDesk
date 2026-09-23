import { FastifyPluginAsync } from 'fastify';
import { requestContext, generateRequestId } from '@maildesk/observability';

export const requestContextPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', async (request, reply) => {
    const requestId = request.headers['x-request-id'] as string | undefined;
    const ctx = {
      requestId: requestId || generateRequestId(),
    };
    
    requestContext.run(ctx, () => {
      // Store context in request for later access
      (request as { context: { requestId: string } }).context = ctx;
    });
    
    // Echo request ID in response header
    reply.header('x-request-id', ctx.requestId);
  });
};

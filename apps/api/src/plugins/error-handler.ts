import { FastifyPluginAsync } from 'fastify';
import { createApiError, errorTypes, errorCodes } from '@maildesk/contracts';
import { logger } from '@maildesk/observability';

export const errorHandlerPlugin: FastifyPluginAsync = async (fastify) => {
  const isProduction = process.env.NODE_ENV === 'production';

  fastify.setErrorHandler((error, request, reply) => {
    const ctx = (request as unknown as { context?: { requestId: string } }).context || { requestId: 'unknown' };
    
    logger.error({
      error: (error as Error).message,
      stack: (error as Error).stack,
      requestId: ctx.requestId,
      method: request.method,
      url: request.url,
    });

    const apiError = createApiError(
      errorTypes.internal_error,
      errorCodes.unexpected,
      isProduction ? 'An internal error occurred' : (error as Error).message,
      ctx.requestId
    );

    reply.status(500).send(apiError);
  });

  fastify.setNotFoundHandler((request, reply) => {
    const ctx = (request as unknown as { context?: { requestId: string } }).context || { requestId: 'unknown' };
    
    const apiError = createApiError(
      errorTypes.not_found,
      errorCodes.resource_not_found,
      'The requested resource was not found',
      ctx.requestId
    );

    reply.status(404).send(apiError);
  });
};

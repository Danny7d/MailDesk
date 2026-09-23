import { createApiError, errorTypes, errorCodes } from '@maildesk/contracts';
import { logger } from '@maildesk/observability';
export const errorHandlerPlugin = async (fastify) => {
    const isProduction = process.env.NODE_ENV === 'production';
    fastify.setErrorHandler((error, request, reply) => {
        const ctx = request.context || { requestId: 'unknown' };
        logger.error({
            error: error.message,
            stack: error.stack,
            requestId: ctx.requestId,
            method: request.method,
            url: request.url,
        });
        const apiError = createApiError(errorTypes.internal_error, errorCodes.unexpected, isProduction ? 'An internal error occurred' : error.message, ctx.requestId);
        reply.status(500).send(apiError);
    });
    fastify.setNotFoundHandler((request, reply) => {
        const ctx = request.context || { requestId: 'unknown' };
        const apiError = createApiError(errorTypes.not_found, errorCodes.resource_not_found, 'The requested resource was not found', ctx.requestId);
        reply.status(404).send(apiError);
    });
};

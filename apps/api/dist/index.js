import { buildServer } from './server.js';
import { getConfig } from './config.js';
import { closePool } from '@maildesk/db';
import { logger } from '@maildesk/observability';
async function main() {
    const server = await buildServer();
    const config = getConfig();
    const port = parseInt(config.PORT || '4000');
    await server.listen({ port, host: '0.0.0.0' });
    logger.info(`Server listening on port ${port}`);
    // Graceful shutdown
    const shutdown = async (signal) => {
        logger.info(`Received ${signal}, shutting down...`);
        await server.close();
        await closePool();
        process.exit(0);
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}
main().catch((error) => {
    logger.error('Failed to start server:', error);
    process.exit(1);
});

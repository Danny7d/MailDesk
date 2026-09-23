import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { getConfig } from './config.js';
import { MAINTENANCE_QUEUE } from './queues.js';
import { noopJob } from './jobs/noop.js';
import pino from 'pino';
const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    ...(process.env.NODE_ENV === 'production'
        ? {}
        : {
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'HH:MM:ss Z',
                    ignore: 'pid,hostname',
                },
            },
        }),
    redact: {
        paths: ['authorization', 'cookie', 'password', 'apiKey', 'token', 'set-cookie'],
        remove: true,
    },
});
async function main() {
    const config = getConfig();
    const redisUrl = new URL(config.REDIS_URL);
    const redis = new Redis({
        host: redisUrl.hostname,
        port: parseInt(redisUrl.port || '6379'),
    });
    await redis.ping();
    const worker = new Worker(MAINTENANCE_QUEUE, async (job) => {
        if (job.name === 'noop') {
            await noopJob(job);
        }
        else {
            logger.warn({ message: 'Unknown job type', jobName: job.name });
        }
    }, {
        connection: redis,
        concurrency: 1,
    });
    worker.on('completed', (job) => {
        logger.info({ message: 'Job completed', jobId: job.id });
    });
    worker.on('failed', (job, err) => {
        logger.error({
            message: 'Job failed',
            jobId: job?.id,
            error: err.message,
        });
    });
    // Graceful shutdown
    const shutdown = async (signal) => {
        logger.info(`Received ${signal}, shutting down worker...`);
        await worker.close();
        await redis.quit();
        logger.info('Worker shutdown complete');
        process.exit(0);
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    logger.info('Worker started');
}
main().catch((error) => {
    logger.error('Failed to start worker:', error);
    process.exit(1);
});

import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  ...(isProduction || isTest
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
    paths: [
      'authorization',
      'cookie',
      'password',
      'apiKey',
      'token',
      'set-cookie',
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers.set-cookie',
    ],
    remove: true,
  },
});

export type Logger = typeof logger;

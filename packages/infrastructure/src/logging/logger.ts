import pino from 'pino';

const isDevelopment = process.env.NODE_ENV !== 'production';

const baseLogger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  ...(isDevelopment
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        },
      }
    : {}),
});

export type LoggerContext = {
  orgId?: string;
  userId?: string;
  reportId?: string;
  requestId?: string;
  [key: string]: string | undefined;
};

export function createLogger(context: LoggerContext = {}) {
  if (Object.keys(context).length === 0) {
    return baseLogger;
  }
  return baseLogger.child(context);
}

export const logger = baseLogger;

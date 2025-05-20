// export const logger = {
//     info: (message: string, data?: any) => {
//       console.log(`[INFO] ${new Date().toISOString()} - ${message}`, data ? JSON.stringify(data, null, 2) : '');
//     },

//     error: (message: string, error?: any, data?: any) => {
//       console.error(`[ERROR] ${new Date().toISOString()} - ${message}`);
//       if (error) {
//         console.error('Error details:', {
//           message: error instanceof Error ? error.message : error,
//           stack: error instanceof Error ? error.stack : undefined,
//           ...data
//         });
//       }
//     },

//     warn: (message: string, data?: any) => {
//       console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, data ? JSON.stringify(data, null, 2) : '');
//     },

//     debug: (message: string, data?: any) => {
//       console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, data ? JSON.stringify(data, null, 2) : '');
//     }
//   };

// src/utils/logger.ts (Ví dụ)
import fs from 'fs';
import path from 'path';
import { createLogger, format, transports } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

// Create logs directory if it doesn't exist
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Define log format
const logFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.splat(),
  format.json()
);

// Create Winston logger
const winstonLogger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { service: 'hola-mess-api' },
  transports: [
    // Console transport for all environments
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ level, message, timestamp, ...metadata }) => {
          const metaStr = Object.keys(metadata).length
            ? JSON.stringify(metadata, null, 2)
            : '';
          return `[${timestamp}] ${level}: ${message} ${metaStr}`;
        })
      ),
    }),

    // File transport for production
    ...(process.env.NODE_ENV === 'production'
      ? [
        // Daily rotate file for all logs
        new DailyRotateFile({
          filename: path.join(logDir, 'application-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '14d'
        }),
        // Daily rotate file for error logs
        new DailyRotateFile({
          level: 'error',
          filename: path.join(logDir, 'errors-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '14d'
        })
      ]
      : [])
  ],
});

// Export simplified logger interface
export const logger = {
  info: (message: string, meta?: any) => {
    winstonLogger.info(message, meta || {});
  },
  error: (message: string, error?: any, meta?: any) => {
    const errorMeta = {
      ...(meta || {}),
      error: error instanceof Error
        ? { message: error.message, stack: error.stack }
        : error
    };
    winstonLogger.error(message, errorMeta);
  },
  warn: (message: string, meta?: any) => {
    winstonLogger.warn(message, meta || {});
  },
  debug: (message: string, meta?: any) => {
    winstonLogger.debug(message, meta || {});
  },
  http: (message: string, meta?: any) => {
    winstonLogger.http(message, meta || {});
  }
};

// Export raw winston logger for advanced use cases
export const rawLogger = winstonLogger;

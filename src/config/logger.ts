import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { config } from './env';

// Ensure logs directory exists
const logsDir = path.dirname(config.LOG_FILE);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    
    return msg;
  })
);

// Create transports
const transports: winston.transport[] = [
  // File transport for all logs
  new winston.transports.File({
    filename: config.LOG_FILE,
    level: config.LOG_LEVEL,
    format: logFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    tailable: true
  }),
  
  // Separate file for errors
  new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    format: logFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    tailable: true
  })
];

// Add console transport in development
if (config.NODE_ENV === 'development') {
  transports.push(
    new winston.transports.Console({
      level: 'debug',
      format: consoleFormat
    })
  );
} else if (config.NODE_ENV !== 'test') {
  // Add console transport in production (but not in test)
  transports.push(
    new winston.transports.Console({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  format: logFormat,
  transports,
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      format: logFormat
    })
  ],
  // Handle unhandled rejections
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      format: logFormat
    })
  ],
  // Exit on uncaught exception
  exitOnError: false
});

// Create a stream for Morgan HTTP logging
export const logStream = {
  write: (message: string) => {
    logger.info(message.trim());
  }
};

// Helper functions for structured logging
export const logInfo = (message: string, meta?: object) => {
  logger.info(message, meta);
};

export const logError = (message: string, error?: Error | object) => {
  logger.error(message, error);
};

export const logWarn = (message: string, meta?: object) => {
  logger.warn(message, meta);
};

export const logDebug = (message: string, meta?: object) => {
  logger.debug(message, meta);
};

// Request logging helper
export const logRequest = (req: any, message?: string) => {
  logger.info(message || 'HTTP Request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id
  });
};

// Database operation logging
export const logDatabase = (operation: string, table: string, meta?: object) => {
  logger.debug(`Database ${operation}`, {
    table,
    ...meta
  });
};

// Authentication logging
export const logAuth = (event: string, userId?: string, meta?: object) => {
  logger.info(`Auth: ${event}`, {
    userId,
    ...meta
  });
};

// Security logging
export const logSecurity = (event: string, meta?: object) => {
  logger.warn(`Security: ${event}`, meta);
};

// Performance logging
export const logPerformance = (operation: string, duration: number, meta?: object) => {
  logger.info(`Performance: ${operation}`, {
    duration: `${duration}ms`,
    ...meta
  });
};

// Service operation logging
export const logService = (service: string, operation: string, meta?: object) => {
  logger.info(`Service: ${service}.${operation}`, meta);
};

// Route logging
export const logRoute = (method: string, path: string, status: number, meta?: object) => {
  logger.info(`Route: ${method} ${path}`, {
    status,
    ...meta
  });
};

// Validation logging
export const logValidation = (field: string, error: string, meta?: object) => {
  logger.warn(`Validation: ${field}`, {
    error,
    ...meta
  });
};

// Business logic logging
export const logBusiness = (operation: string, result: string, meta?: object) => {
  logger.info(`Business: ${operation}`, {
    result,
    ...meta
  });
};

// External API logging
export const logExternal = (service: string, operation: string, meta?: object) => {
  logger.info(`External: ${service}.${operation}`, meta);
};

// System logging
export const logSystem = (component: string, event: string, meta?: object) => {
  logger.info(`System: ${component}`, {
    event,
    ...meta
  });
};

// Error with stack trace logging
export const logErrorWithStack = (message: string, error: Error, meta?: object) => {
  logger.error(message, {
    message: error.message,
    stack: error.stack,
    name: error.name,
    ...meta
  });
};

// Start operation logging
export const logOperationStart = (operation: string, meta?: object) => {
  logger.debug(`🚀 Starting: ${operation}`, meta);
};

// End operation logging
export const logOperationEnd = (operation: string, duration?: number, meta?: object) => {
  logger.debug(`✅ Completed: ${operation}`, {
    ...(duration && { duration: `${duration}ms` }),
    ...meta
  });
};

// Critical error logging
export const logCritical = (message: string, error?: Error | object) => {
  logger.error(`🚨 CRITICAL: ${message}`, error);
};

export default logger;

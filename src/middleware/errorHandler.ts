import { Request, Response, NextFunction } from 'express';
import { AppError } from '../types';
import { logError } from '../config/logger';
import { config } from '../config/env';

/**
 * Global error handling middleware
 */
export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal server error';
  let errors: string[] = [];

  // Handle custom AppError
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
  }
  // Handle validation errors
  else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation error';
    errors = [error.message];
  }
  // Handle JWT errors
  else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }
  else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }
  // Handle SQLite errors
  else if (error.message.includes('SQLITE_CONSTRAINT')) {
    statusCode = 409;
    if (error.message.includes('UNIQUE')) {
      message = 'Resource already exists';
    } else if (error.message.includes('FOREIGN KEY')) {
      message = 'Referenced resource not found';
    } else {
      message = 'Data constraint violation';
    }
  }
  else if (error.message.includes('SQLITE_')) {
    statusCode = 500;
    message = 'Database error';
  }
  // Handle file upload errors
  else if (error.message.includes('LIMIT_FILE_SIZE')) {
    statusCode = 413;
    message = 'File too large';
  }
  else if (error.message.includes('LIMIT_UNEXPECTED_FILE')) {
    statusCode = 400;
    message = 'Unexpected file field';
  }
  // Handle other common errors
  else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid data format';
  }
  else if (error.name === 'SyntaxError') {
    statusCode = 400;
    message = 'Invalid JSON format';
  }

  // Log error details
  logError(`${req.method} ${req.path} - ${message}`, {
    statusCode,
    userId: req.user?.id,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.body,
    params: req.params,
    query: req.query,
    stack: error.stack
  });

  // Prepare response
  const response: any = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  };

  // Add errors array if present
  if (errors.length > 0) {
    response.errors = errors;
  }

  // Add stack trace in development
  if (config.NODE_ENV === 'development') {
    response.stack = error.stack;
  }

  // Add request ID if available
  if (req.headers['x-request-id']) {
    response.requestId = req.headers['x-request-id'];
  }

  res.status(statusCode).json(response);
};

/**
 * Handle 404 Not Found errors
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new AppError(`Route ${req.method} ${req.path} not found`, 404);
  next(error);
};

/**
 * Handle async errors by wrapping async route handlers
 */
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Handle uncaught exceptions
 */
export const handleUncaughtException = (): void => {
  process.on('uncaughtException', (error: Error) => {
    logError('Uncaught Exception - Shutting down...', {
      error: error.message,
      stack: error.stack
    });
    
    process.exit(1);
  });
};

/**
 * Handle unhandled promise rejections
 */
export const handleUnhandledRejection = (): void => {
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logError('Unhandled Rejection - Shutting down...', {
      reason: reason?.message || reason,
      stack: reason?.stack
    });
    
    process.exit(1);
  });
};

/**
 * Graceful shutdown handler
 */
export const handleGracefulShutdown = (server: any): void => {
  const shutdown = (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
    
    // Force close after 10 seconds
    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

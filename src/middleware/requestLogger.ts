import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { 
  logRequest, 
  logRoute, 
  logPerformance, 
  logOperationStart, 
  logOperationEnd,
  logErrorWithStack,
  logSystem
} from '../config/logger';
import { UserRole } from '../types';

// Extend Request type to include timing and correlation ID
declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
      startTime?: number;
      user?: { id: string; email: string; role: UserRole; firstName: string; lastName: string; };
    }
  }
}

/**
 * Comprehensive request logging middleware
 * Logs every step of request processing with correlation IDs and timing
 */
export const requestLoggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Generate unique correlation ID for this request
  const correlationId = uuidv4();
  req.correlationId = correlationId;
  req.startTime = Date.now();

  // Add correlation ID to response headers
  res.setHeader('X-Correlation-ID', correlationId);

  // Log incoming request
  logOperationStart('HTTP Request', {
    correlationId,
    method: req.method,
    url: req.originalUrl,
    path: req.path,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length'),
    authorization: req.get('Authorization') ? 'Bearer [REDACTED]' : undefined,
    headers: {
      host: req.get('Host'),
      origin: req.get('Origin'),
      referer: req.get('Referer')
    }
  });

  // Log request body for POST/PUT/PATCH (but sanitize sensitive data)
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
    const sanitizedBody = sanitizeRequestBody(req.body);
    logSystem('Request Body', 'received', {
      correlationId,
      body: sanitizedBody,
      bodySize: JSON.stringify(req.body).length
    });
  }

  // Capture original response methods
  const originalSend = res.send;
  const originalJson = res.json;
  const originalEnd = res.end;

  // Override res.send
  res.send = function(body: any) {
    logResponse(req, res, body);
    return originalSend.call(this, body);
  };

  // Override res.json
  res.json = function(body: any) {
    logResponse(req, res, body);
    return originalJson.call(this, body);
  };

  // Override res.end
  res.end = function(chunk: any, encoding?: any) {
    if (chunk && typeof chunk !== 'function') {
      logResponse(req, res, chunk);
    } else {
      logResponseMetadata(req, res);
    }
    return originalEnd.call(this, chunk, encoding);
  };

  // Handle response finish event
  res.on('finish', () => {
    const duration = Date.now() - (req.startTime || Date.now());
    
    logOperationEnd('HTTP Request', duration, {
      correlationId: req.correlationId,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      userId: req.user?.id
    });

    // Log performance metrics
    logPerformance('HTTP Request', duration, {
      correlationId: req.correlationId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      slow: duration > 1000 ? true : undefined
    });

    // Log route completion
    logRoute(req.method, req.originalUrl, res.statusCode, {
      correlationId: req.correlationId,
      duration: `${duration}ms`,
      userId: req.user?.id
    });
  });

  // Handle errors
  res.on('error', (error: Error) => {
    logErrorWithStack('Response Error', error, {
      correlationId: req.correlationId,
      method: req.method,
      url: req.originalUrl,
      userId: req.user?.id
    });
  });

  next();
};

/**
 * Log response data with sanitization
 */
function logResponse(req: Request, res: Response, body: any) {
  if (res.headersSent) return; // Avoid double logging

  const sanitizedBody = sanitizeResponseBody(body, res.statusCode);
  
  logSystem('Response', 'sent', {
    correlationId: req.correlationId,
    status: res.statusCode,
    contentType: res.get('Content-Type'),
    body: sanitizedBody,
    responseSize: typeof body === 'string' ? body.length : JSON.stringify(body || {}).length
  });
}

/**
 * Log response metadata without body
 */
function logResponseMetadata(req: Request, res: Response) {
  if (res.headersSent) return;

  logSystem('Response', 'sent', {
    correlationId: req.correlationId,
    status: res.statusCode,
    contentType: res.get('Content-Type')
  });
}

/**
 * Sanitize request body to remove sensitive information
 */
function sanitizeRequestBody(body: any): any {
  if (!body || typeof body !== 'object') return body;

  const sanitized = { ...body };
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth', 'authorization'];

  function sanitizeObject(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    if (obj && typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        if (sensitiveFields.some(field => lowerKey.includes(field))) {
          result[key] = '[REDACTED]';
        } else {
          result[key] = sanitizeObject(value);
        }
      }
      return result;
    }
    
    return obj;
  }

  return sanitizeObject(sanitized);
}

/**
 * Sanitize response body to remove sensitive information
 */
function sanitizeResponseBody(body: any, statusCode: number): any {
  if (!body) return body;

  // Don't log large response bodies
  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
  if (bodyStr.length > 10000) {
    return { 
      message: '[LARGE_RESPONSE_TRUNCATED]', 
      size: bodyStr.length,
      preview: bodyStr.substring(0, 200) + '...'
    };
  }

  // For error responses, include more details
  if (statusCode >= 400) {
    return body;
  }

  // For successful responses, sanitize sensitive fields
  if (typeof body === 'object' && body !== null) {
    const sanitized = { ...body };
    
    // Remove tokens from response logging
    if (sanitized.data && sanitized.data.token) {
      sanitized.data.token = '[REDACTED]';
    }
    if (sanitized.data && sanitized.data.refreshToken) {
      sanitized.data.refreshToken = '[REDACTED]';
    }
    if (sanitized.token) {
      sanitized.token = '[REDACTED]';
    }
    if (sanitized.refreshToken) {
      sanitized.refreshToken = '[REDACTED]';
    }

    return sanitized;
  }

  return body;
}

/**
 * Middleware to log user authentication context
 */
export const userContextMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // This runs after authentication middleware
  if (req.user) {
    logSystem('User Context', 'authenticated', {
      correlationId: req.correlationId,
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      method: req.method,
      path: req.path
    });
  }
  next();
};

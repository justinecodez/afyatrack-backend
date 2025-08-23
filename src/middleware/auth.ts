import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { dbManager } from '../config/database';
import { AppError } from '../types';
import { JWTPayload, UserRole } from '../types';
import { logAuth, logSecurity } from '../config/logger';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
        firstName: string;
        lastName: string;
      };
    }
  }
}

/**
 * Middleware to verify JWT token and authenticate user
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Access token is required', 401);
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, config.JWT_SECRET) as JWTPayload;

    // Get user from database
    const user = await dbManager.get(
      `SELECT id, email, first_name, last_name, role, is_active 
       FROM users WHERE id = ? AND is_active = 1`,
      [decoded.userId]
    );

    if (!user) {
      logSecurity('Token verification failed - user not found', { userId: decoded.userId });
      throw new AppError('Invalid or expired token', 401);
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name
    };

    logAuth('User authenticated', user.id, { email: user.email });
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      logSecurity('Invalid JWT token', { error: error.message });
      next(new AppError('Invalid token', 401));
    } else if (error instanceof jwt.TokenExpiredError) {
      logSecurity('Expired JWT token');
      next(new AppError('Token expired', 401));
    } else {
      next(error);
    }
  }
};

/**
 * Middleware to authorize user based on roles
 */
export const authorize = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('Authentication required', 401));
      return;
    }

    if (!roles.includes(req.user.role)) {
      logSecurity('Unauthorized access attempt', { 
        userId: req.user.id, 
        userRole: req.user.role, 
        requiredRoles: roles 
      });
      next(new AppError('Insufficient permissions', 403));
      return;
    }

    next();
  };
};

/**
 * Middleware to check if user can access specific patient data
 */
export const authorizePatientAccess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const patientId = req.params.patientId || req.body.patientId;
    if (!patientId) {
      throw new AppError('Patient ID is required', 400);
    }

    // Admins can access all patient data
    if (req.user.role === UserRole.ADMIN) {
      next();
      return;
    }

    // Check if user has access to this patient (created by them or involved in their care)
    const hasAccess = await dbManager.get(
      `SELECT 1 FROM patients p
       WHERE p.id = ? AND (
         p.created_by = ? OR
         EXISTS (
           SELECT 1 FROM visits v 
           WHERE v.patient_id = p.id AND v.doctor_id = ?
         )
       )`,
      [patientId, req.user.id, req.user.id]
    );

    if (!hasAccess) {
      logSecurity('Unauthorized patient data access attempt', {
        userId: req.user.id,
        patientId
      });
      throw new AppError('Access denied to patient data', 403);
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to check if user can access specific visit data
 */
export const authorizeVisitAccess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const visitId = req.params.visitId || req.body.visitId;
    if (!visitId) {
      throw new AppError('Visit ID is required', 400);
    }

    // Admins can access all visit data
    if (req.user.role === UserRole.ADMIN) {
      next();
      return;
    }

    // Check if user has access to this visit
    const hasAccess = await dbManager.get(
      `SELECT 1 FROM visits v
       JOIN patients p ON v.patient_id = p.id
       WHERE v.id = ? AND (
         v.doctor_id = ? OR
         p.created_by = ?
       )`,
      [visitId, req.user.id, req.user.id]
    );

    if (!hasAccess) {
      logSecurity('Unauthorized visit data access attempt', {
        userId: req.user.id,
        visitId
      });
      throw new AppError('Access denied to visit data', 403);
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.JWT_SECRET) as JWTPayload;

    const user = await dbManager.get(
      `SELECT id, email, first_name, last_name, role, is_active 
       FROM users WHERE id = ? AND is_active = 1`,
      [decoded.userId]
    );

    if (user) {
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name
      };
    }

    next();
  } catch (error) {
    // Don't fail for optional auth - just continue without user
    next();
  }
};

/**
 * Rate limiting by user ID
 */
export const rateLimitByUser = (maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const userId = req.user?.id || req.ip || 'anonymous';
    const now = Date.now();

    const userRequests = requests.get(userId);
    
    if (!userRequests || now > userRequests.resetTime) {
      requests.set(userId, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }

    if (userRequests.count >= maxRequests) {
      logSecurity('Rate limit exceeded', { userId, count: userRequests.count });
      res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later',
        retryAfter: Math.ceil((userRequests.resetTime - now) / 1000)
      });
      return;
    }

    userRequests.count++;
    next();
  };
};

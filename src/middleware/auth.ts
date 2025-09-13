import { Request, Response, NextFunction } from 'express';
import { JwtService, JwtPayload } from '../utils/jwt';
import { AuthService } from '../services/AuthService';
import { UserRole } from '../entities/User';

// Extend the Request interface to include user information
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload & {
        id: string;
        name: string;
        isActive: boolean;
        canAccessPatient: boolean;
        canModifyPatient: boolean;
        isAdmin: boolean;
      };
    }
  }
}

/**
 * Middleware to authenticate JWT tokens
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = JwtService.extractTokenFromHeader(authHeader);

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access token is required',
      });
      return;
    }

    // Verify the token
    const payload = JwtService.verifyAccessToken(token);

    // Get user details from database
    const authService = new AuthService();
    const user = await authService.getUserById(payload.userId);

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        message: 'Invalid or inactive user account',
      });
      return;
    }

    // Attach user information to request
    req.user = {
      ...payload,
      id: user.id,
      name: user.name,
      isActive: user.isActive,
      canAccessPatient: user.canAccessPatient(),
      canModifyPatient: user.canModifyPatient(),
      isAdmin: user.isAdmin(),
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    let message = 'Authentication failed';
    if (error instanceof Error) {
      if (error.message.includes('expired')) {
        message = 'Access token has expired';
      } else if (error.message.includes('invalid')) {
        message = 'Invalid access token';
      }
    }

    res.status(401).json({
      success: false,
      message,
    });
  }
};

/**
 * Middleware to check if user has specific role(s)
 */
export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    if (!roles.includes(req.user.role as UserRole)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to check if user can access patient data
 */
export const requirePatientAccess = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
    return;
  }

  if (!req.user.canAccessPatient) {
    res.status(403).json({
      success: false,
      message: 'Access to patient data not permitted',
    });
    return;
  }

  next();
};

/**
 * Middleware to check if user can modify patient data
 */
export const requirePatientModify = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
    return;
  }

  if (!req.user.canModifyPatient) {
    res.status(403).json({
      success: false,
      message: 'Permission to modify patient data not granted',
    });
    return;
  }

  next();
};

/**
 * Middleware to check if user is admin
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
    return;
  }

  if (!req.user.isAdmin) {
    res.status(403).json({
      success: false,
      message: 'Administrator privileges required',
    });
    return;
  }

  next();
};

/**
 * Middleware to check if user belongs to specific facility or is admin
 */
export const requireFacilityAccess = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
    return;
  }

  const facilityId = req.params.facilityId || req.body.facilityId;
  
  // Admin can access all facilities
  if (req.user.isAdmin) {
    next();
    return;
  }

  // User must belong to the same facility
  if (req.user.facilityId !== facilityId) {
    res.status(403).json({
      success: false,
      message: 'Access to this facility not permitted',
    });
    return;
  }

  next();
};

/**
 * Optional authentication middleware
 * Sets user information if token is provided and valid, but doesn't require authentication
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = JwtService.extractTokenFromHeader(authHeader);

    if (token) {
      const payload = JwtService.verifyAccessToken(token);
      
      const authService = new AuthService();
      const user = await authService.getUserById(payload.userId);

      if (user && user.isActive) {
        req.user = {
          ...payload,
          id: user.id,
          name: user.name,
          isActive: user.isActive,
          canAccessPatient: user.canAccessPatient(),
          canModifyPatient: user.canModifyPatient(),
          isAdmin: user.isAdmin(),
        };
      }
    }

    next();
  } catch (error) {
    // Ignore authentication errors for optional auth
    next();
  }
};
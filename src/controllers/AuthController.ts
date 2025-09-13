import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthService, LoginRequest, RegisterRequest } from '../services/AuthService';
import { UserRole } from '../entities/User';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * Validation rules for login
   */
  static loginValidation = [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
  ];

  /**
   * Validation rules for registration
   */
  static registerValidation = [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    body('name')
      .notEmpty()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    body('role')
      .optional()
      .isIn(Object.values(UserRole))
      .withMessage('Invalid role specified'),
    body('facilityId')
      .optional()
      .isUUID()
      .withMessage('Facility ID must be a valid UUID'),
  ];

  /**
   * Validation rules for refresh token
   */
  static refreshTokenValidation = [
    body('refreshToken')
      .notEmpty()
      .withMessage('Refresh token is required'),
  ];

  /**
   * Login endpoint
   */
  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
        return;
      }

      const loginData: LoginRequest = req.body;
      const clientIp = req.ip;

      const authResponse = await this.authService.login(loginData, clientIp);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: authResponse,
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(401).json({
        success: false,
        message: error instanceof Error ? error.message : 'Login failed',
      });
    }
  };

  /**
   * Register endpoint
   */
  register = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
        return;
      }

      const registerData: RegisterRequest = req.body;
      const authResponse = await this.authService.register(registerData);

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: authResponse,
      });
    } catch (error) {
      console.error('Registration error:', error);
      const status = error instanceof Error && error.message.includes('already exists') ? 409 : 400;
      res.status(status).json({
        success: false,
        message: error instanceof Error ? error.message : 'Registration failed',
      });
    }
  };

  /**
   * Refresh token endpoint
   */
  refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
        return;
      }

      const { refreshToken } = req.body;
      const clientIp = req.ip;

      const authResponse = await this.authService.refreshToken(refreshToken, clientIp);

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: authResponse,
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(401).json({
        success: false,
        message: error instanceof Error ? error.message : 'Token refresh failed',
      });
    }
  };

  /**
   * Logout endpoint
   */
  logout = async (req: Request, res: Response): Promise<void> => {
    try {
      const { refreshToken } = req.body;
      const clientIp = req.ip;

      if (refreshToken) {
        await this.authService.logout(refreshToken, clientIp);
      }

      res.status(200).json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Logout failed',
      });
    }
  };

  /**
   * Logout from all devices endpoint
   */
  logoutFromAllDevices = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const clientIp = req.ip;
      await this.authService.logoutFromAllDevices(userId, clientIp);

      res.status(200).json({
        success: true,
        message: 'Logged out from all devices successfully',
      });
    } catch (error) {
      console.error('Logout from all devices error:', error);
      res.status(500).json({
        success: false,
        message: 'Logout from all devices failed',
      });
    }
  };

  /**
   * Get current user profile
   */
  getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const user = await this.authService.getUserById(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Profile retrieved successfully',
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          facilityId: user.facilityId,
          facility: user.facility ? {
            id: user.facility.id,
            name: user.facility.name,
            type: user.facility.type,
          } : undefined,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve profile',
      });
    }
  };
}
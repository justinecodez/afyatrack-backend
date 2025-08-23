import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { dbManager } from '../config/database';
import { config } from '../config/env';
import { AppError, User, UserRole, AuthRequest, AuthResponse, JWTPayload } from '../types';
import { 
  logAuth, 
  logSecurity, 
  logService, 
  logOperationStart, 
  logOperationEnd, 
  logErrorWithStack, 
  logBusiness,
  logDatabase,
  logPerformance
} from '../config/logger';

export class AuthService {
  /**
   * Register a new user
   */
  public async register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    licenseNumber?: string;
    hospitalId?: string;
  }): Promise<{ user: Omit<User, 'password'>; accessToken: string; refreshToken: string }> {
    const startTime = Date.now();
    logOperationStart('User Registration', { email: userData.email, role: userData.role });
    
    try {
      // Check if user already exists
      logDatabase('SELECT', 'users', { operation: 'check_existing_email', email: userData.email });
      const existingUser = await dbManager.get(
        'SELECT id FROM users WHERE email = ?',
        [userData.email]
      );
      logDatabase('SELECT', 'users', { operation: 'check_existing_email_result', found: !!existingUser });

      if (existingUser) {
        logBusiness('User Registration', 'failed_duplicate_email', { email: userData.email });
        throw new AppError('User with this email already exists', 409);
      }

      // Hash password
      logService('AuthService', 'hash_password', { rounds: config.BCRYPT_ROUNDS });
      const hashedPassword = await bcrypt.hash(userData.password, config.BCRYPT_ROUNDS);
      logService('AuthService', 'hash_password_complete', { passwordLength: userData.password.length });

      // Create user
      const userId = uuidv4();
      logDatabase('INSERT', 'users', { 
        operation: 'create_user', 
        userId, 
        email: userData.email, 
        role: userData.role 
      });
      await dbManager.run(
        `INSERT INTO users (id, email, password, first_name, last_name, role, license_number, hospital_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          userData.email,
          hashedPassword,
          userData.firstName,
          userData.lastName,
          userData.role,
          userData.licenseNumber,
          userData.hospitalId
        ]
      );
      logDatabase('INSERT', 'users', { operation: 'create_user_complete', userId });

      // Get created user
      const user = await dbManager.get(
        `SELECT id, email, first_name, last_name, role, license_number, hospital_id, is_active, created_at
         FROM users WHERE id = ?`,
        [userId]
      );

      if (!user) {
        throw new AppError('Failed to create user', 500);
      }

      // Generate tokens
      logService('AuthService', 'generate_tokens_start', { userId, email: userData.email });
      const { accessToken, refreshToken } = await this.generateTokens(userId, userData.email, userData.role);
      logService('AuthService', 'generate_tokens_complete', { userId });

      const duration = Date.now() - startTime;
      logPerformance('User Registration', duration, { userId, email: userData.email });
      logAuth('User registered', userId, { email: userData.email, role: userData.role });
      logOperationEnd('User Registration', duration, { userId, email: userData.email });

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          licenseNumber: user.license_number,
          hospitalId: user.hospital_id,
          isActive: user.is_active,
          lastLogin: user.last_login,
          createdAt: user.created_at,
          updatedAt: user.updated_at
        } as Omit<User, 'password'>,
        accessToken,
        refreshToken
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logOperationEnd('User Registration', duration, { failed: true, email: userData.email });
      logErrorWithStack('Registration failed', error as Error, { email: userData.email });
      throw error;
    }
  }

  /**
   * Authenticate user with email and password
   */
  public async login(credentials: AuthRequest): Promise<AuthResponse> {
    const startTime = Date.now();
    logOperationStart('User Login', { email: credentials.email });
    
    try {
      // Get user by email
      logDatabase('SELECT', 'users', { operation: 'find_user_by_email', email: credentials.email });
      const user = await dbManager.get(
        `SELECT id, email, password, first_name, last_name, role, license_number, hospital_id, is_active, last_login, created_at, updated_at
         FROM users WHERE email = ?`,
        [credentials.email]
      );
      logDatabase('SELECT', 'users', { operation: 'find_user_by_email_result', found: !!user, email: credentials.email });

      if (!user) {
        logSecurity('Login attempt with non-existent email', { email: credentials.email });
        throw new AppError('Invalid email or password', 401);
      }

      if (!user.is_active) {
        logSecurity('Login attempt with inactive account', { userId: user.id, email: credentials.email });
        logBusiness('User Login', 'failed_inactive_account', { userId: user.id, email: credentials.email });
        throw new AppError('Account is deactivated', 401);
      }

      // Verify password
      logService('AuthService', 'verify_password_start', { userId: user.id });
      const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
      logService('AuthService', 'verify_password_complete', { userId: user.id, valid: isPasswordValid });
      
      if (!isPasswordValid) {
        logSecurity('Login attempt with invalid password', { userId: user.id, email: credentials.email });
        logBusiness('User Login', 'failed_invalid_password', { userId: user.id, email: credentials.email });
        throw new AppError('Invalid email or password', 401);
      }

      // Update last login
      logDatabase('UPDATE', 'users', { operation: 'update_last_login', userId: user.id });
      await dbManager.run(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
        [user.id]
      );
      logDatabase('UPDATE', 'users', { operation: 'update_last_login_complete', userId: user.id });

      // Generate tokens
      logService('AuthService', 'generate_tokens_start', { userId: user.id, email: user.email });
      const { accessToken, refreshToken } = await this.generateTokens(user.id, user.email, user.role);
      logService('AuthService', 'generate_tokens_complete', { userId: user.id });

      const duration = Date.now() - startTime;
      logPerformance('User Login', duration, { userId: user.id, email: user.email });
      logAuth('User logged in', user.id, { email: user.email, role: user.role });
      logBusiness('User Login', 'success', { userId: user.id, email: user.email, role: user.role });
      logOperationEnd('User Login', duration, { userId: user.id, email: user.email });

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          licenseNumber: user.license_number,
          hospitalId: user.hospital_id,
          isActive: user.is_active,
          lastLogin: new Date(),
          createdAt: user.created_at,
          updatedAt: user.updated_at
        } as Omit<User, 'password'>,
        accessToken,
        refreshToken
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logOperationEnd('User Login', duration, { failed: true, email: credentials.email });
      
      if (!(error instanceof AppError)) {
        logErrorWithStack('Login error', error as Error, { email: credentials.email });
      }
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  public async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, config.JWT_SECRET) as JWTPayload;

      // Check if refresh token exists in database
      const tokenRecord = await dbManager.get(
        'SELECT user_id FROM refresh_tokens WHERE token = ? AND expires_at > CURRENT_TIMESTAMP',
        [refreshToken]
      );

      if (!tokenRecord) {
        throw new AppError('Invalid or expired refresh token', 401);
      }

      // Get user
      const user = await dbManager.get(
        'SELECT id, email, role, is_active FROM users WHERE id = ? AND is_active = 1',
        [tokenRecord.user_id]
      );

      if (!user) {
        throw new AppError('User not found or inactive', 401);
      }

      // Remove old refresh token
      await dbManager.run('DELETE FROM refresh_tokens WHERE token = ?', [refreshToken]);

      // Generate new tokens
      const tokens = await this.generateTokens(user.id, user.email, user.role);

      logAuth('Token refreshed', user.id, { email: user.email });

      return tokens;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AppError('Invalid refresh token', 401);
      }
      throw error;
    }
  }

  /**
   * Logout user (invalidate refresh token)
   */
  public async logout(refreshToken: string): Promise<void> {
    try {
      const result = await dbManager.run(
        'DELETE FROM refresh_tokens WHERE token = ?',
        [refreshToken]
      );

      if (result.changes === 0) {
        throw new AppError('Invalid refresh token', 401);
      }

      logAuth('User logged out');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user profile by ID
   */
  public async getProfile(userId: string): Promise<Omit<User, 'password'>> {
    try {
      const user = await dbManager.get(
        `SELECT id, email, first_name, last_name, role, license_number, hospital_id, is_active, last_login, created_at, updated_at
         FROM users WHERE id = ? AND is_active = 1`,
        [userId]
      );

      if (!user) {
        throw new AppError('User not found', 404);
      }

      return {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        licenseNumber: user.license_number,
        hospitalId: user.hospital_id,
        isActive: user.is_active,
        lastLogin: user.last_login,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      } as Omit<User, 'password'>;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update user profile
   */
  public async updateProfile(userId: string, updates: {
    firstName?: string;
    lastName?: string;
    licenseNumber?: string;
    hospitalId?: string;
  }): Promise<Omit<User, 'password'>> {
    try {
      const fields: string[] = [];
      const values: any[] = [];

      if (updates.firstName !== undefined) {
        fields.push('first_name = ?');
        values.push(updates.firstName);
      }
      if (updates.lastName !== undefined) {
        fields.push('last_name = ?');
        values.push(updates.lastName);
      }
      if (updates.licenseNumber !== undefined) {
        fields.push('license_number = ?');
        values.push(updates.licenseNumber);
      }
      if (updates.hospitalId !== undefined) {
        fields.push('hospital_id = ?');
        values.push(updates.hospitalId);
      }

      if (fields.length === 0) {
        throw new AppError('No valid fields to update', 400);
      }

      values.push(userId);

      await dbManager.run(
        `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
        values
      );

      logAuth('Profile updated', userId);

      return this.getProfile(userId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Change user password
   */
  public async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      // Get current password hash
      const user = await dbManager.get(
        'SELECT password FROM users WHERE id = ? AND is_active = 1',
        [userId]
      );

      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        logSecurity('Invalid current password during password change', { userId });
        throw new AppError('Current password is incorrect', 401);
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, config.BCRYPT_ROUNDS);

      // Update password
      await dbManager.run(
        'UPDATE users SET password = ? WHERE id = ?',
        [hashedNewPassword, userId]
      );

      // Invalidate all refresh tokens for this user
      await dbManager.run('DELETE FROM refresh_tokens WHERE user_id = ?', [userId]);

      logAuth('Password changed', userId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(userId: string, email: string, role: UserRole): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const payload: JWTPayload = {
      userId,
      email,
      role
    };

    // Generate access token
    const accessToken = jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN
    } as SignOptions);

    // Generate refresh token
    const refreshToken = jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: config.JWT_REFRESH_EXPIRES_IN
    } as SignOptions);

    // Store refresh token in database
    const refreshTokenId = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    await dbManager.run(
      'INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
      [refreshTokenId, userId, refreshToken, expiresAt.toISOString()]
    );

    return { accessToken, refreshToken };
  }

  /**
   * Clean expired refresh tokens
   */
  public async cleanExpiredTokens(): Promise<void> {
    try {
      const result = await dbManager.run(
        'DELETE FROM refresh_tokens WHERE expires_at <= CURRENT_TIMESTAMP'
      );

      if (result.changes && result.changes > 0) {
        logAuth('Cleaned expired tokens', undefined, { count: result.changes });
      }
    } catch (error) {
      logAuth('Error cleaning expired tokens', undefined, { error: (error as Error).message });
    }
  }
}

import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { User, UserRole } from '../entities/User';
import { RefreshToken } from '../entities/RefreshToken';
import { Facility } from '../entities/Facility';
import { JwtService, JwtPayload, TokenPair } from '../utils/jwt';
import { PasswordService } from '../utils/password';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
  facilityId?: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    facilityId?: string;
    facility?: {
      id: string;
      name: string;
      type: string;
    };
  };
  token: string;
  refreshToken: string;
  expiresAt: string;
}

export class AuthService {
  private userRepository: Repository<User>;
  private refreshTokenRepository: Repository<RefreshToken>;
  private facilityRepository: Repository<Facility>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
    this.refreshTokenRepository = AppDataSource.getRepository(RefreshToken);
    this.facilityRepository = AppDataSource.getRepository(Facility);
  }

  /**
   * Login user with email and password
   */
  async login(loginData: LoginRequest, clientIp?: string): Promise<AuthResponse> {
    const { email, password } = loginData;

    // Find user by email
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase(), isActive: true },
      relations: ['facility'],
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await PasswordService.verifyPassword(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    user.lastLogin = new Date();
    await this.userRepository.save(user);

    // Generate tokens
    const jwtPayload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      facilityId: user.facilityId,
    };

    const tokens = JwtService.generateTokenPair(jwtPayload);

    // Save refresh token to database
    await this.saveRefreshToken(tokens.refreshToken, user.id, clientIp);

    // Clean up expired refresh tokens for this user
    await this.cleanupExpiredTokens(user.id);

    return {
      user: {
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
      },
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: JwtService.getTokenExpirationDate().toISOString(),
    };
  }

  /**
   * Register a new user
   */
  async register(registerData: RegisterRequest): Promise<AuthResponse> {
    const { email, password, name, role = UserRole.DOCTOR, facilityId } = registerData;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Validate password strength
    const passwordValidation = PasswordService.validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    // Validate facility if provided
    let facility: Facility | null = null;
    if (facilityId) {
      facility = await this.facilityRepository.findOne({ where: { id: facilityId, isActive: true } });
      if (!facility) {
        throw new Error('Invalid facility ID');
      }
    }

    // Hash password
    const hashedPassword = await PasswordService.hashPassword(password);

    // Create new user
    const newUser = this.userRepository.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      role,
      facilityId,
      isActive: true,
    });

    const savedUser = await this.userRepository.save(newUser);

    // Load user with facility relation for response
    const userWithFacility = await this.userRepository.findOne({
      where: { id: savedUser.id },
      relations: ['facility'],
    });

    // Generate tokens
    const jwtPayload: JwtPayload = {
      userId: savedUser.id,
      email: savedUser.email,
      role: savedUser.role,
      facilityId: savedUser.facilityId,
    };

    const tokens = JwtService.generateTokenPair(jwtPayload);

    // Save refresh token to database
    await this.saveRefreshToken(tokens.refreshToken, savedUser.id);

    return {
      user: {
        id: savedUser.id,
        email: savedUser.email,
        name: savedUser.name,
        role: savedUser.role,
        facilityId: savedUser.facilityId,
        facility: userWithFacility?.facility ? {
          id: userWithFacility.facility.id,
          name: userWithFacility.facility.name,
          type: userWithFacility.facility.type,
        } : undefined,
      },
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: JwtService.getTokenExpirationDate().toISOString(),
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshTokenValue: string, clientIp?: string): Promise<AuthResponse> {
    // Find active refresh token
    const refreshToken = await this.refreshTokenRepository.findOne({
      where: { token: refreshTokenValue, isRevoked: false },
      relations: ['user', 'user.facility'],
    });

    if (!refreshToken || !refreshToken.isActive) {
      throw new Error('Invalid or expired refresh token');
    }

    const user = refreshToken.user;

    if (!user.isActive) {
      throw new Error('User account is deactivated');
    }

    // Generate new token pair
    const jwtPayload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      facilityId: user.facilityId,
    };

    const tokens = JwtService.generateTokenPair(jwtPayload);

    // Revoke old refresh token
    refreshToken.revoke(clientIp);
    await this.refreshTokenRepository.save(refreshToken);

    // Save new refresh token
    await this.saveRefreshToken(tokens.refreshToken, user.id, clientIp);

    return {
      user: {
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
      },
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: JwtService.getTokenExpirationDate().toISOString(),
    };
  }

  /**
   * Logout user by revoking refresh token
   */
  async logout(refreshTokenValue: string, clientIp?: string): Promise<void> {
    const refreshToken = await this.refreshTokenRepository.findOne({
      where: { token: refreshTokenValue },
    });

    if (refreshToken && !refreshToken.isRevoked) {
      refreshToken.revoke(clientIp);
      await this.refreshTokenRepository.save(refreshToken);
    }
  }

  /**
   * Logout user from all devices by revoking all refresh tokens
   */
  async logoutFromAllDevices(userId: string, clientIp?: string): Promise<void> {
    const refreshTokens = await this.refreshTokenRepository.find({
      where: { userId, isRevoked: false },
    });

    for (const token of refreshTokens) {
      token.revoke(clientIp);
    }

    if (refreshTokens.length > 0) {
      await this.refreshTokenRepository.save(refreshTokens);
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { id: userId, isActive: true },
      relations: ['facility'],
    });
  }

  /**
   * Save refresh token to database
   */
  private async saveRefreshToken(token: string, userId: string, clientIp?: string): Promise<void> {
    const refreshToken = this.refreshTokenRepository.create({
      token,
      userId,
      expiresAt: JwtService.getRefreshTokenExpirationDate(),
      createdByIp: clientIp,
    });

    await this.refreshTokenRepository.save(refreshToken);
  }

  /**
   * Clean up expired refresh tokens for a user
   */
  private async cleanupExpiredTokens(userId: string): Promise<void> {
    await this.refreshTokenRepository
      .createQueryBuilder()
      .delete()
      .where('userId = :userId AND (expiresAt < :now OR isRevoked = true)', {
        userId,
        now: new Date(),
      })
      .execute();
  }
}
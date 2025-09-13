import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  facilityId?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export class JwtService {
  private static readonly ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  private static readonly REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
  private static readonly ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
  private static readonly REFRESH_TOKEN_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

  /**
   * Generate access token
   */
  static generateAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, this.ACCESS_TOKEN_SECRET, {
      expiresIn: this.ACCESS_TOKEN_EXPIRES_IN,
      issuer: 'afyatrack-api',
      audience: 'afyatrack-frontend',
    } as jwt.SignOptions);
  }

  /**
   * Generate refresh token
   */
  static generateRefreshToken(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * Generate both access and refresh tokens
   */
  static generateTokenPair(payload: JwtPayload): TokenPair {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(),
    };
  }

  /**
   * Verify access token
   */
  static verifyAccessToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, this.ACCESS_TOKEN_SECRET, {
        issuer: 'afyatrack-api',
        audience: 'afyatrack-frontend',
      } as jwt.VerifyOptions) as JwtPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Access token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid access token');
      } else {
        throw new Error('Token verification failed');
      }
    }
  }

  /**
   * Get token expiration date
   */
  static getTokenExpirationDate(expiresIn: string = this.ACCESS_TOKEN_EXPIRES_IN): Date {
    const now = new Date();
    
    // Parse expiration string (e.g., '24h', '7d', '30m')
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error('Invalid expiration format');
    }

    const [, amount, unit] = match;
    const amountNum = parseInt(amount, 10);

    switch (unit) {
      case 's':
        now.setSeconds(now.getSeconds() + amountNum);
        break;
      case 'm':
        now.setMinutes(now.getMinutes() + amountNum);
        break;
      case 'h':
        now.setHours(now.getHours() + amountNum);
        break;
      case 'd':
        now.setDate(now.getDate() + amountNum);
        break;
      default:
        throw new Error('Invalid time unit');
    }

    return now;
  }

  /**
   * Get refresh token expiration date
   */
  static getRefreshTokenExpirationDate(): Date {
    return this.getTokenExpirationDate(this.REFRESH_TOKEN_EXPIRES_IN);
  }

  /**
   * Extract token from authorization header
   */
  static extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  /**
   * Check if token is expired (for JWT tokens only)
   */
  static isTokenExpired(token: string): boolean {
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.exp) {
        return true;
      }
      return Date.now() >= decoded.exp * 1000;
    } catch {
      return true;
    }
  }
}
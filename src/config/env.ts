import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config();

interface Config {
  // Server Configuration
  NODE_ENV: string;
  PORT: number;
  
  // Database Configuration
  DATABASE_URL: string;
  
  // JWT Configuration
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  
  // Security Configuration
  BCRYPT_ROUNDS: number;
  
  // CORS Configuration
  FRONTEND_URL: string;
  
  // File Upload Configuration
  MAX_FILE_SIZE: number;
  UPLOAD_PATH: string;
  
  // Logging Configuration
  LOG_LEVEL: string;
  LOG_FILE: string;
  
  // Rate Limiting Configuration
  RATE_LIMIT_WINDOW: number;
  RATE_LIMIT_MAX: number;
  
  // API Configuration
  API_VERSION: string;
}

// Validate required environment variables
function validateEnv(): Config {
  const config: Config = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '5001', 10),
    
    DATABASE_URL: process.env.DATABASE_URL || path.join(process.cwd(), 'data', 'afyatrack.db'),
    
    JWT_SECRET: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    
    BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
    
    MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
    UPLOAD_PATH: process.env.UPLOAD_PATH || './uploads',
    
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    LOG_FILE: process.env.LOG_FILE || './logs/app.log',
    
    RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW || '15', 10), // 15 minutes
    RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100', 10), // 100 requests per window
    
    API_VERSION: process.env.API_VERSION || 'v1'
  };
  
  // Validate critical configuration
  if (config.NODE_ENV === 'production') {
    if (config.JWT_SECRET === 'fallback-secret-change-in-production') {
      throw new Error('JWT_SECRET must be set in production environment');
    }
    
    if (config.PORT < 1 || config.PORT > 65535) {
      throw new Error('PORT must be a valid port number');
    }
  }
  
  // Validate numeric values
  if (config.BCRYPT_ROUNDS < 10 || config.BCRYPT_ROUNDS > 15) {
    console.warn('BCRYPT_ROUNDS should be between 10-15 for security and performance');
  }
  
  if (config.MAX_FILE_SIZE < 1024 * 1024) { // 1MB minimum
    console.warn('MAX_FILE_SIZE is very small, consider increasing it');
  }
  
  return config;
}

// Export validated configuration
export const config = validateEnv();

// Helper function to check if running in development
export const isDevelopment = (): boolean => config.NODE_ENV === 'development';

// Helper function to check if running in production
export const isProduction = (): boolean => config.NODE_ENV === 'production';

// Helper function to check if running in test
export const isTest = (): boolean => config.NODE_ENV === 'test';

// Export individual config values for convenience
export const {
  NODE_ENV,
  PORT,
  DATABASE_URL,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN,
  BCRYPT_ROUNDS,
  FRONTEND_URL,
  MAX_FILE_SIZE,
  UPLOAD_PATH,
  LOG_LEVEL,
  LOG_FILE,
  RATE_LIMIT_WINDOW,
  RATE_LIMIT_MAX,
  API_VERSION
} = config;

// Log configuration in development
if (isDevelopment()) {
  console.log('🔧 Configuration loaded:');
  console.log(`  - Environment: ${NODE_ENV}`);
  console.log(`  - Port: ${PORT}`);
  console.log(`  - Database: ${DATABASE_URL}`);
  console.log(`  - Frontend URL: ${FRONTEND_URL}`);
  console.log(`  - API Version: ${API_VERSION}`);
  console.log(`  - Max File Size: ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(2)}MB`);
}

import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from 'dotenv';

// Load environment variables
config();

import { initializeDatabase } from './config/database';
import authRoutes from './routes/auth';
import patientRoutes from './routes/patients';
import { errorHandler } from './middleware/error';
import { notFoundHandler } from './middleware/notFound';

class AfyaTrackServer {
  private app: express.Application;
  private port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '5001', 10);
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // Trust proxy for rate limiting and IP detection
    this.app.set('trust proxy', 1);

    // Security middleware
    this.app.use(helmet());

    // CORS configuration
    const corsOptions: cors.CorsOptions = {
      origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    };
    this.app.use(cors(corsOptions));

    // Compression
    this.app.use(compression());

    // Request logging
    const logFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
    this.app.use(morgan(logFormat));

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Rate limiting
    const rateLimiter = rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10), // limit each IP to 100 requests per windowMs
      message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api', rateLimiter);

    // Stricter rate limiting for auth endpoints
    const authRateLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // limit each IP to 5 requests per windowMs for auth
      message: {
        success: false,
        message: 'Too many authentication attempts, please try again later.',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api/v1/auth/login', authRateLimiter);
    this.app.use('/api/v1/auth/register', authRateLimiter);
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        success: true,
        message: 'AfyaTrack API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
      });
    });

    // API routes
    this.app.use('/api/v1/auth', authRoutes);
    this.app.use('/api/v1/patients', patientRoutes);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.status(200).json({
        success: true,
        message: 'Welcome to AfyaTrack API',
        version: '1.0.0',
        documentation: '/api/docs', // Future API documentation endpoint
      });
    });
  }

  /**
   * Setup error handling middleware
   */
  private setupErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);
  }

  /**
   * Start the server
   */
  public async start(): Promise<void> {
    try {
      // Initialize database connection
      await initializeDatabase();

      // Start HTTP server
      this.app.listen(this.port, () => {
        console.log(`
🏥 AfyaTrack API Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 Server running on port ${this.port}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
🔗 Local: http://localhost:${this.port}
📊 Health: http://localhost:${this.port}/health
🔐 Auth: http://localhost:${this.port}/api/v1/auth
👥 Patients: http://localhost:${this.port}/api/v1/patients
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        `);
      });

      // Graceful shutdown
      process.on('SIGTERM', this.gracefulShutdown);
      process.on('SIGINT', this.gracefulShutdown);

    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * Graceful shutdown handler
   */
  private gracefulShutdown = async (signal: string): Promise<void> => {
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
    
    try {
      // Close database connections
      const { closeDatabase } = await import('./config/database');
      await closeDatabase();
      
      console.log('✅ Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during graceful shutdown:', error);
      process.exit(1);
    }
  };
}

// Start the server
const server = new AfyaTrackServer();
server.start().catch((error) => {
  console.error('Failed to start AfyaTrack server:', error);
  process.exit(1);
});
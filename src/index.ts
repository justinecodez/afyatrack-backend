import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

// Import configuration
import { config, isDevelopment, isProduction } from './config/env';
import { dbManager } from './config/database';
import logger, { logStream, logInfo, logError } from './config/logger';

// Import middleware
import { corsMiddleware, securityHeaders } from './middleware/cors';
import { errorHandler, notFoundHandler, handleUncaughtException, handleUnhandledRejection, handleGracefulShutdown } from './middleware/errorHandler';
import { requestLoggerMiddleware, userContextMiddleware } from './middleware/requestLogger';

// Import routes
import authRoutes from './routes/auth.routes';
import patientRoutes from './routes/patient.routes';
import visitRoutes from './routes/visit.routes';

// Import services for cleanup
import { AuthService } from './services/auth.service';

class AfyaTrackServer {
  private app: express.Application;
  private server: any;
  private authService: AuthService;

  constructor() {
    this.app = express();
    this.authService = new AuthService();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
    // Trust proxy for accurate IP addresses
    this.app.set('trust proxy', 1);

    // Request logging middleware (first to capture all requests)
    this.app.use(requestLoggerMiddleware);

    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: isDevelopment() ? false : {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'"]
        }
      },
      crossOriginEmbedderPolicy: false
    }));
    this.app.use(securityHeaders);

    // CORS
    this.app.use(corsMiddleware);

    // Request logging
    this.app.use(morgan(
      isDevelopment() 
        ? 'dev' 
        : ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"',
      { stream: logStream }
    ));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Compression
    this.app.use(compression());

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.RATE_LIMIT_WINDOW * 60 * 1000, // Convert minutes to milliseconds
      max: config.RATE_LIMIT_MAX,
      message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.',
        retryAfter: config.RATE_LIMIT_WINDOW * 60
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

    if (isProduction()) {
      this.app.use('/api/', limiter);
    }

    // Request ID middleware
    this.app.use((req, res, next) => {
      req.headers['x-request-id'] = req.headers['x-request-id'] || 
        Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      res.set('x-request-id', req.headers['x-request-id'] as string);
      next();
    });

    // API version middleware
    this.app.use('/api', (req, res, next) => {
      res.set('API-Version', config.API_VERSION);
      next();
    });
  }

  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      try {
        const dbHealthy = await dbManager.healthCheck();
        
        res.json({
          success: true,
          message: 'AfyaTrack API is running',
          data: {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: config.API_VERSION,
            environment: config.NODE_ENV,
            services: {
              database: dbHealthy ? 'healthy' : 'unhealthy'
            }
          }
        });
      } catch (error) {
        res.status(503).json({
          success: false,
          message: 'Service unavailable',
          data: {
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            services: {
              database: 'unhealthy'
            }
          }
        });
      }
    });

    // API documentation endpoint
    this.app.get('/api', (req, res) => {
      res.json({
        success: true,
        message: 'AfyaTrack API',
        data: {
          name: 'AfyaTrack Backend API',
          version: config.API_VERSION,
          description: 'Clinical documentation platform for Tanzanian healthcare providers',
          documentation: '/api/docs',
          endpoints: {
            authentication: '/api/v1/auth',
            patients: '/api/v1/patients',
            visits: '/api/v1/visits'
          },
          features: [
            'User authentication and authorization',
            'Patient management',
            'Visit documentation',
            'SOAP notes generation',
            'Clinical recommendations',
            'NHIF integration support'
          ]
        }
      });
    });

    // User context middleware (after auth middleware)
    this.app.use(userContextMiddleware);

    // Mount API routes
    this.app.use(`/api/${config.API_VERSION}/auth`, authRoutes);
    this.app.use(`/api/${config.API_VERSION}/patients`, patientRoutes);
    this.app.use(`/api/${config.API_VERSION}/visits`, visitRoutes);

    // 404 handler for API routes
    this.app.use('/api/*', notFoundHandler);

    // Serve static files in production (if needed)
    if (isProduction()) {
      this.app.use(express.static('public'));
      
      // Catch-all handler for SPA routing
      this.app.get('*', (req, res) => {
        res.sendFile('index.html', { root: 'public' });
      });
    } else {
      // Development landing page
      this.app.get('*', (req, res) => {
        res.json({
          success: true,
          message: 'AfyaTrack API Development Server',
          data: {
            apiEndpoint: `/api/${config.API_VERSION}`,
            healthCheck: '/health',
            documentation: '/api',
            frontend: config.FRONTEND_URL
          }
        });
      });
    }
  }

  private initializeErrorHandling(): void {
    // Global error handler
    this.app.use(errorHandler);

    // Handle uncaught exceptions and unhandled rejections
    handleUncaughtException();
    handleUnhandledRejection();
  }

  public async start(): Promise<void> {
    try {
      // Connect to database
      logInfo('Connecting to database...');
      await dbManager.connect();
      logInfo('Database connected successfully');

      // Start cleanup interval for expired tokens
      this.startCleanupInterval();

      // Start server
      this.server = this.app.listen(config.PORT, () => {
        logInfo(`🚀 AfyaTrack API server started`, {
          port: config.PORT,
          environment: config.NODE_ENV,
          apiVersion: config.API_VERSION,
          databaseUrl: config.DATABASE_URL
        });

        if (isDevelopment()) {
          console.log('\n=== AfyaTrack Backend Ready ===');
          console.log(`🌐 Server: http://localhost:${config.PORT}`);
          console.log(`🔍 Health: http://localhost:${config.PORT}/health`);
          console.log(`📚 API: http://localhost:${config.PORT}/api`);
          console.log(`🎯 Base URL: http://localhost:${config.PORT}/api/${config.API_VERSION}`);
          console.log(`🎨 Frontend: ${config.FRONTEND_URL}`);
          console.log('===============================\n');
        }
      });

      // Handle graceful shutdown
      handleGracefulShutdown(this.server);

    } catch (error) {
      logError('Failed to start server', error instanceof Error ? error : new Error(String(error)));
      process.exit(1);
    }
  }

  private startCleanupInterval(): void {
    // Clean expired tokens every hour
    setInterval(async () => {
      try {
        await this.authService.cleanExpiredTokens();
      } catch (error) {
        logError('Error cleaning expired tokens', error instanceof Error ? error : new Error(String(error)));
      }
    }, 60 * 60 * 1000); // 1 hour
  }

  public async stop(): Promise<void> {
    try {
      if (this.server) {
        await new Promise<void>((resolve) => {
          this.server.close(() => {
            logInfo('HTTP server closed');
            resolve();
          });
        });
      }

      await dbManager.close();
      logInfo('Database connection closed');
    } catch (error) {
      logError('Error stopping server', error instanceof Error ? error : new Error(String(error)));
    }
  }
}

// Create and start server
const server = new AfyaTrackServer();

// Start server if this file is executed directly
if (require.main === module) {
  server.start().catch((error) => {
    logError('Failed to start AfyaTrack server', error instanceof Error ? error : new Error(String(error)));
    process.exit(1);
  });
}

export default server;

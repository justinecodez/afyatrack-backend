import cors from 'cors';
import { config } from '../config/env';

/**
 * CORS configuration for AfyaTrack Backend
 */
const corsOptions: cors.CorsOptions = {
  // Allow requests from frontend URLs
  origin: (origin, callback) => {
    // In development, allow requests from any origin
    if (config.NODE_ENV === 'development') {
      callback(null, true);
      return;
    }

    // List of allowed origins in production
    const allowedOrigins = [
      config.FRONTEND_URL,
      'http://localhost:3000',
      'http://localhost:5173', // Vite default
      'https://afyatrack.com',
      'https://www.afyatrack.com'
    ];

    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS policy'), false);
    }
  },

  // Allow specific HTTP methods
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],

  // Allow specific headers
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'X-Request-ID'
  ],

  // Expose specific headers to the client
  exposedHeaders: [
    'X-Request-ID',
    'X-Total-Count',
    'X-Page-Count'
  ],

  // Allow credentials (cookies, authorization headers)
  credentials: true,

  // Cache preflight response for 24 hours
  maxAge: 86400,

  // Handle preflight requests
  preflightContinue: false,
  optionsSuccessStatus: 204 // For legacy browser support
};

export const corsMiddleware = cors(corsOptions);

/**
 * Manual CORS handler for complex scenarios
 */
export const handleCors = (req: any, res: any, next: any) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    config.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:5173',
    'https://afyatrack.com',
    'https://www.afyatrack.com'
  ];

  // Set CORS headers
  if (config.NODE_ENV === 'development' || allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, X-Request-ID');
  res.header('Access-Control-Expose-Headers', 'X-Request-ID, X-Total-Count, X-Page-Count');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(204).send();
    return;
  }

  next();
};

/**
 * Security headers middleware
 */
export const securityHeaders = (req: any, res: any, next: any) => {
  // Prevent XSS attacks
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');

  // HSTS (HTTP Strict Transport Security)
  if (config.NODE_ENV === 'production') {
    res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Content Security Policy
  res.header('Content-Security-Policy', "default-src 'self'");

  // Referrer Policy
  res.header('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Remove powered by header
  res.removeHeader('X-Powered-By');

  next();
};

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const xss = require('xss-clean');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const config = require('./config/config');
const { logger, requestLogger, errorLogger } = require('./utils/logger');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const capsuleRoutes = require('./routes/capsules');
const ratingRoutes = require('./routes/ratings');
const statRoutes = require('./routes/stats');
const notificationRoutes = require('./routes/notifications');
const subscriptionRoutes = require('./routes/subscriptions');
const healthRoutes = require('./routes/health');
const adminRoutes = require('./routes/admin');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const { connectDB } = require('./config/db');

const app = express();

// Connect to MongoDB
connectDB();

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Configure CORS with allowed origins from config
const allowedOrigins = config.frontend.allowedOrigins;

// Helper function to check if origin matches pattern with wildcards
const originMatchesPattern = (origin, pattern) => {
  if (!origin || !pattern) return false;
  
  // Convert wildcard pattern to regex
  // For example: https://*.memorix.fun -> ^https:\/\/.*\.memorix\.fun$
  if (pattern.includes('*')) {
    const regexPattern = pattern
      .replace(/\./g, '\\.')  // Escape dots
      .replace(/\*/g, '.*');  // Convert * to .*
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(origin);
  }
  
  // Direct comparison for non-wildcard patterns
  return origin === pattern;
};

// More permissive CORS for health endpoints
app.use('/api/health', cors({ 
  origin: '*', 
  methods: ['GET', 'HEAD', 'OPTIONS'],
  maxAge: 86400 // 24 hours
}));

// Regular CORS configuration for other routes
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) return callback(null, true);
    
    // Check if the origin matches any of the allowed patterns
    const isAllowed = allowedOrigins.some(pattern => 
      originMatchesPattern(origin, pattern)
    );
    
    if (!isAllowed) {
      logger.warn(`CORS blocked request from: ${origin}`, { 
        allowedPatterns: allowedOrigins 
      });
      const msg = `The CORS policy for this site does not allow access from the specified origin: ${origin}`;
      return callback(new Error(msg), false);
    }
    
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));

// Parse JSON with increased limit for larger payloads
const maxRequestSize = config.upload.maxSize || 10 * 1024 * 1024; // Default to 10MB
app.use(express.json({ limit: maxRequestSize }));
app.use(express.urlencoded({ extended: true, limit: maxRequestSize }));

// Enhanced security with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://memorix.fun", "https://*.godaddysites.com", "*"], 
      connectSrc: [
        "'self'", 
        "https://api.memorix.fun", 
        "wss://api.memorix.fun",
        "https://memorix-backend-wn9o.onrender.com",
        "https://*.memorix.fun",
        "https://*.godaddysites.com",
        "*"  // Allow all connections for health checks - can be restricted later
      ],
      frameSrc: ["'self'", "https://*.godaddysites.com"],
      objectSrc: ["'none'"],
      // Only enable upgradeInsecureRequests in production
      ...(process.env.NODE_ENV === 'production' ? { upgradeInsecureRequests: [] } : {})
    }
  },
  // Disable some policies that can cause issues with multi-domain setups
  crossOriginEmbedderPolicy: false, // Allow embedding 
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow cross-origin resources
  crossOriginOpenerPolicy: false, // Allow cross-origin window.opener
  
  // HTTP Strict Transport Security: enforce HTTPS
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true
  }
}));

// Add request logging
app.use(requestLogger);

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use(limiter);

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Prevent parameter pollution
app.use(hpp());

// Data sanitization against XSS
app.use(xss());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/capsules', capsuleRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/stats', statRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/admin', adminRoutes); // Admin routes

// Custom 404 handler (not found)
app.use(notFound);

// Error handling
app.use(errorLogger);
app.use(errorHandler);

// Handle unhandled promise rejections and exceptions
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection', { reason, promise });
});

process.on('uncaughtException', (error) => {
  logger.fatal('Uncaught Exception', { error });
  // Give logger time to write logs before exiting
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

logger.info('Server initialized', { 
  environment: process.env.NODE_ENV, 
  port: config.server.port
});

module.exports = app;

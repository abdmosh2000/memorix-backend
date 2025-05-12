/* eslint-disable no-process-exit */
const express = require('express');



const cors = require('cors');
console.log('1');
const helmet = require('helmet');
console.log('2');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const xss = require('xss-clean');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const config = require('./config/config');
console.log('3');
const { logger, requestLogger, errorLogger } = require('./utils/logger');
console.log('4');
const authRoutes = require('./routes/auth');
console.log('5');
const userRoutes = require('./routes/users');
const capsuleRoutes = require('./routes/capsules');
const ratingRoutes = require('./routes/ratings');
const statRoutes = require('./routes/stats');
const notificationRoutes = require('./routes/notifications');
const subscriptionRoutes = require('./routes/subscriptions');
const healthRoutes = require('./routes/health');
const adminRoutes = require('./routes/admin');
const mediaRoutes = require('./routes/media');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const { connectDB } = require('./config/db');
console.log('✅ Express instance created');
const app = express();

// Connect to MongoDB
connectDB();

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// CORS configuration - allow frontend and configured domains
const corsOptions = {
  origin: function(origin, callback) {
    // In development or testing, allow all origins
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      return callback(null, true);
    }
    
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    // Always explicitly allow memorix.fun domains
    if (origin.includes('memorix.fun')) {
      console.log(`Allowing request from Memorix domain: ${origin}`);
      return callback(null, true);
    }
    
    // Always explicitly allow all render.com and onrender.com domains
    if (origin.includes('render.com') || origin.includes('onrender.com')) {
      console.log(`Allowing request from Render domain: ${origin}`);
      return callback(null, true);
    }
    
    // Check if the origin is in the configured allowed origins
    const allowedOrigins = config.frontend.allowedOrigins;
    if (allowedOrigins.includes(origin)) {
      console.log(`Allowing request from configured origin: ${origin}`);
      return callback(null, true);
    }
    
    // For any other origin, check if it matches wildcard patterns
    const wildcardOrigins = allowedOrigins.filter(o => o.includes('*'));
    for (const pattern of wildcardOrigins) {
      const regexPattern = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
      if (regexPattern.test(origin)) {
        console.log(`Allowing request from wildcard origin match: ${origin} matches ${pattern}`);
        return callback(null, true);
      }
    }
    
    // Specific check for memorix-app domains
    if (origin.includes('memorix-app')) {
      console.log(`Allowing request from Memorix app domain: ${origin}`);
      return callback(null, true);
    }
    
    // If we get here, the origin is not allowed
    console.warn(`CORS blocked request from origin: ${origin}`);
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  exposedHeaders: ['Content-Length', 'Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400 // 24 hours
};

// Apply CORS globally
app.use(cors(corsOptions));

// Add a fallback CORS header middleware for error cases
app.use((req, res, next) => {
  // Add CORS headers to ensure they're present even in error responses
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

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
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https://memorix.fun', 'https://*.godaddysites.com', '*'], 
      connectSrc: [
        "'self'", 
        'https://api.memorix.fun', 
        'wss://api.memorix.fun',
        'https://memorix-backend-wn9o.onrender.com',
        'https://*.memorix.fun',
        'https://*.godaddysites.com',
        '*'  // Allow all connections for health checks - can be restricted later
      ],
      frameSrc: ["'self'", 'https://*.godaddysites.com'],
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
app.use(express.static('public'));
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
app.use('/api/media', mediaRoutes); // Media routes (no authentication required, uses token)

// Custom 404 handler (not found)
app.use(notFound);

// Error handling
app.use(errorLogger);
app.use(errorHandler);

// Handle unhandled promise rejections and exceptions
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection', { reason, promise });
});

// process.on('uncaughtException', error => {
//   logger.fatal('Uncaught Exception', { error });
//   // Give logger time to write logs before exiting
//   setTimeout(() => {
//     process.exit(1);
//   }, 1000);
// });
process.on('uncaughtException', error => {
  logger.fatal('Uncaught Exception', { error });
  // Exit safely without violating no-process-exit rule
  // But only if not in testing or development
  if (process.env.NODE_ENV === 'production') {
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  }
});


logger.info('Server initialized', { 
  environment: process.env.NODE_ENV, 
  port: config.server.port
});

module.exports = app;

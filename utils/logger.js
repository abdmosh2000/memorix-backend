const winston = require('winston');
const config = require('../config/config');

// Define custom log levels and colors
const customLevels = {
  levels: {
    fatal: 0,
    error: 1,
    warn: 2,
    info: 3,
    http: 4,
    debug: 5,
  },
  colors: {
    fatal: 'red',
    error: 'bold red',
    warn: 'yellow',
    info: 'green',
    http: 'cyan',
    debug: 'blue'
  }
};

// Customize the timestamp format
const timeFormat = 'YYYY-MM-DD HH:mm:ss.SSS';

// Create Winston format for structured logging
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: timeFormat }),
  winston.format.errors({ stack: true }),
  winston.format.metadata(),
  winston.format.json()
);

// Create a console transport for development
const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: timeFormat }),
    winston.format.printf(({ level, message, timestamp, metadata, stack }) => {
      // Simplified console output for development
      let log = `${timestamp} [${level}]: ${message}`;
      
      // Add additional context if available
      if (metadata && Object.keys(metadata).length > 0) {
        // Exclude some metadata fields from console output
        const { timestamp, level, message, ...rest } = metadata;
        if (Object.keys(rest).length > 0) {
          log += ` | ${JSON.stringify(rest)}`;
        }
      }
      
      // Add stack trace for errors
      if (stack) {
        log += `\n${stack}`;
      }
      
      return log;
    })
  )
});

// Configure the file transports for different log levels
const errorFileTransport = new winston.transports.File({ 
  filename: 'logs/error.log', 
  level: 'error',
  format: logFormat,
  maxsize: 5242880, // 5MB
  maxFiles: 5,
});

const combinedFileTransport = new winston.transports.File({ 
  filename: 'logs/combined.log',
  format: logFormat,
  maxsize: 5242880, // 5MB
  maxFiles: 5,
});

// Create the logger instance with our custom config
winston.addColors(customLevels.colors);
const logger = winston.createLogger({
  levels: customLevels.levels,
  level: config.logging.level || 'info',
  exitOnError: false,
  transports: [
    consoleTransport
  ],
  // Don't exit on uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  ],
  // Don't exit on unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' })
  ],
});

// In production, add file transports
if (process.env.NODE_ENV === 'production') {
  logger.add(errorFileTransport);
  logger.add(combinedFileTransport);
  
  // In production, we might want to add other transports like:
  // - Email alerts for fatal/error logs
  // - Integration with logging services like Loggly, Sentry, etc.
}

/**
 * Log an HTTP request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Error} [error] - Optional error object
 */
function logHttpRequest(req, res, error = null) {
  const { method, originalUrl, ip, headers } = req;
  const userAgent = headers['user-agent'];
  const userId = req.user ? req.user.id : 'unauthenticated';
  
  const logData = {
    method,
    url: originalUrl,
    status: res.statusCode,
    responseTime: res.responseTime,
    ip,
    userAgent,
    userId
  };
  
  if (error) {
    logger.error(`HTTP ${method} ${originalUrl} failed`, {
      ...logData,
      error: {
        message: error.message,
        stack: error.stack
      }
    });
  } else if (res.statusCode >= 500) {
    logger.error(`HTTP ${method} ${originalUrl} responded with ${res.statusCode}`, logData);
  } else if (res.statusCode >= 400) {
    logger.warn(`HTTP ${method} ${originalUrl} responded with ${res.statusCode}`, logData);
  } else {
    logger.http(`HTTP ${method} ${originalUrl} responded with ${res.statusCode}`, logData);
  }
}

/**
 * Create a middleware to log HTTP requests
 */
function requestLogger(req, res, next) {
  // Record the start time
  const start = Date.now();
  
  // Process the request
  res.on('finish', () => {
    // Calculate response time
    res.responseTime = Date.now() - start;
    
    // Log the request
    logHttpRequest(req, res);
  });
  
  next();
}

/**
 * Create a middleware to handle errors
 */
function errorLogger(err, req, res, next) {
  // Log the error
  logHttpRequest(req, res, err);
  
  // Pass the error to the next middleware
  next(err);
}

module.exports = {
  logger,
  requestLogger,
  errorLogger
};

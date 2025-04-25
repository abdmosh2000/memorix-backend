const { logger } = require('../utils/logger');

/**
 * Custom error class for API errors
 */
class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true; // Indicates this is an expected error
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Handle requests to routes that don't exist (404 errors)
 */
const notFound = (req, res, next) => {
  const error = new ApiError(404, `Resource not found - ${req.originalUrl}`);
  next(error);
};

/**
 * Handle all other errors
 */
const errorHandler = (err, req, res, next) => {
  // Default to 500 if statusCode is 200 or not set
  const statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
  
  // Extract error details
  const errorResponse = {
    message: err.message || 'An unexpected error occurred',
    success: false,
    statusCode: statusCode
  };
  
  // Add stack trace in development
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.stack = err.stack;
    
    // Add detailed error information for debugging in development
    if (err.details) {
      errorResponse.details = err.details;
    }
  }
  
  // Add request ID if available
  if (req.id) {
    errorResponse.requestId = req.id;
  }
  
  // Log error appropriately
  if (statusCode >= 500) {
    // Server errors are logged as errors
    logger.error(`Server Error [${statusCode}] ${err.message}`, { 
      path: req.originalUrl, 
      method: req.method,
      ip: req.ip,
      userId: req.user ? req.user.id : 'unauthenticated',
      errorDetails: err.details || {},
      stack: err.stack
    });
  } else if (!err.isOperational) {
    // Programmer errors or unexpected errors
    logger.error(`Unexpected Error [${statusCode}] ${err.message}`, { 
      path: req.originalUrl, 
      method: req.method,
      errorDetails: err.details || {},
      stack: err.stack
    });
  } else {
    // Client errors (400-499) with isOperational flag are expected errors
    logger.warn(`Client Error [${statusCode}] ${err.message}`, { 
      path: req.originalUrl, 
      method: req.method,
      userId: req.user ? req.user.id : 'unauthenticated',
    });
  }
  
  res.status(statusCode).json(errorResponse);
};

module.exports = { notFound, errorHandler, ApiError };

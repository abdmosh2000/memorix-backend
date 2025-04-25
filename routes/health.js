const express = require('express');
const router = express.Router();
const { logger } = require('../utils/logger');

/**
 * @route   GET /api/health
 * @desc    Get system health status
 * @access  Public
 */
router.get('/', (req, res) => {
  // Return basic health info
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
  });
});

/**
 * @route   GET /api/health/ping
 * @desc    Minimal health check for connectivity testing
 * @access  Public
 */
router.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

/**
 * @route   GET /api/health/detailed
 * @desc    Get detailed system health information
 * @access  Private/Admin
 */
router.get('/detailed', (req, res) => {
  try {
    const memoryUsage = process.memoryUsage();
    
    // Collect health metrics
    const healthInfo = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      nodejs: {
        version: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid,
        uptime: process.uptime(), // seconds
      },
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`, // Resident Set Size
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`,
      },
    };
    
    // Log health check
    logger.info('Health check performed', { 
      ip: req.ip,
      userAgent: req.headers['user-agent'] 
    });
    
    res.json(healthInfo);
  } catch (error) {
    // Log error
    logger.error('Health check error', { 
      error: error.message, 
      stack: error.stack 
    });
    
    res.status(500).json({
      status: 'error',
      message: 'Error retrieving health information',
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;

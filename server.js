/* eslint-disable */
console.log('👉 Starting Memorix server...');
const app = require('./app');
const config = require('./config/config');

// Get port from environment variable or config
const port = process.env.PORT || config.server.port;

console.log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`PORT from env: ${process.env.PORT || 'not set, using default'}`);
console.log(`PORT from config: ${config.server.port}`);
console.log(`Using PORT: ${port}`);

// Simple root endpoint to verify API is working
app.get('/', (req, res) => {
  res.send('✅ Memorix API is online!');
});

// Create server instance with proper cleanup
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${port}`);
  console.log(`✅ Server is listening on 0.0.0.0:${port}`);
  console.log(`✅ Visit http://localhost:${port} if running locally`);
});

// Handle graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`📢 ${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log('💤 HTTP server closed.');
    // Additional cleanup can happen here
    console.log('👋 Process terminating...');
    // Instead of process.exit(), we just let the event loop empty naturally
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Disable ESLint for this file since we need to use process handlers
/* eslint-disable */

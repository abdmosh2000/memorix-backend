const app = require('./app');
const { checkPort, logEnvironmentInfo } = require('./checkPort');

// Get port from environment or use default
const PORT = parseInt(process.env.PORT || 5000, 10);

// Root endpoint to verify API is working
app.get("/", (req, res) => {
  res.send("✅ Memorix API is online!");
});
//logs
// Log environment information for troubleshooting
logEnvironmentInfo();

// Verify port availability before starting server
checkPort(PORT, '0.0.0.0')
  .then(isAvailable => {
    if (isAvailable) {
      // Start the server with explicit host binding to 0.0.0.0 (all network interfaces)
      const server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`🌐 Server is listening on all available network interfaces`);
        console.log(`💻 API URL: http://0.0.0.0:${PORT}`);
        console.log(`🔗 Local access URL: http://localhost:${PORT}`);
        
        // Log active routes for debugging
        console.log('\n--- Active API Routes ---');
        app._router.stack
          .filter(r => r.route)
          .map(r => {
            const methods = Object.keys(r.route.methods).join(', ').toUpperCase();
            console.log(`${methods}: ${r.route.path}`);
          });
        console.log('-------------------------\n');
      });
      
      // Set timeout to handle slow connections gracefully
      server.timeout = 60000; // 60 seconds
      
      // Graceful shutdown handling
      const shutdown = () => {
        console.log('\nShutting down server gracefully...');
        server.close(() => {
          console.log('Server closed successfully.');
          process.exit(0);
        });
        
        // Force close if graceful shutdown takes too long
        setTimeout(() => {
          console.error('Could not close connections in time, forcefully shutting down');
          process.exit(1);
        }, 10000);
      };
      
      // Listen for termination signals
      process.on('SIGTERM', shutdown);
      process.on('SIGINT', shutdown);
    } else {
      console.error(`❌ Could not start server on port ${PORT}`);
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('❌ Error checking port availability:', err);
    process.exit(1);
  });

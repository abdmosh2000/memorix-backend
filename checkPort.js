// Helper module to check if server is properly binding to a port
const net = require('net');

/**
 * Verifies if a port is available and can be bound to
 * @param {number} port - The port number to check
 * @param {string} host - The host to bind to
 * @returns {Promise<boolean>} - True if port can be bound, false otherwise
 */
function checkPort(port, host = '0.0.0.0') {
  return new Promise((resolve) => {
    // Create a server instance
    const server = net.createServer();
    
    // Handle errors
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${port} on ${host} is already in use.`);
      } else {
        console.error(`Error checking port ${port} on ${host}:`, err);
      }
      resolve(false);
    });
    
    // Handle successful binding
    server.once('listening', () => {
      // Close the server that we opened for testing
      server.close(() => {
        console.log(`✅ Port ${port} on ${host} is available and can be bound.`);
        resolve(true);
      });
    });
    
    // Try to bind to the port
    console.log(`Attempting to bind to ${host}:${port}...`);
    server.listen(port, host);
  });
}

/**
 * Logs information about the current environment
 */
function logEnvironmentInfo() {
  console.log('\n--- Environment Information ---');
  console.log(`Node.js Version: ${process.version}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Port: ${process.env.PORT || 'Not set (will use default)'}`);
  console.log(`Platform: ${process.platform}`);
  console.log(`Memory Usage: ${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Working Directory: ${process.cwd()}`);
  console.log('--- Network Interfaces ---');
  
  const networkInterfaces = require('os').networkInterfaces();
  
  // Print out all network interfaces
  Object.keys(networkInterfaces).forEach((interfaceName) => {
    networkInterfaces[interfaceName].forEach((interfaceInfo) => {
      if (interfaceInfo.family === 'IPv4' || interfaceInfo.family === 4) {
        console.log(`${interfaceName}: ${interfaceInfo.address}`);
      }
    });
  });
  console.log('-----------------------------\n');
}

module.exports = {
  checkPort,
  logEnvironmentInfo
};

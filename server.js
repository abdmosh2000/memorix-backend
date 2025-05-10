const app = require('./app');

// Get port from environment variable or use 10000 as fallback
const port = process.env.PORT || 10000;

// Simple root endpoint to verify API is working
app.get('/', (req, res) => {
  res.send('✅ Memorix API is online!');
});
console.log("PORT from env:", process.env.PORT);

// Start the server listening on all interfaces (0.0.0.0) to ensure Render detects the port binding
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});

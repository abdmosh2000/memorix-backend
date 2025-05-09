const app = require('./app');

// Get port from environment or use 10000 as fallback
const PORT = process.env.PORT || 10000;

// Root test
app.get("/", (req, res) => {
  res.send("✅ Memorix API is online!");
});

// Start the server on 0.0.0.0 to allow Render to detect the port binding
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Server is listening on all interfaces (0.0.0.0)`);
});

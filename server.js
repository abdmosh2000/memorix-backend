const app = require('./app');

// Get port from environment or use 10000 as fallback
const PORT = process.env.PORT || 10000;

// Root test
app.get("/", (req, res) => {
  res.send("✅ Memorix API is online!");
});

// Start the server directly
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

/**
 * Global test setup for Memorix backend testing
 */

// Set up test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.MONGO_URI = 'mongodb://localhost:27017/memorix_test';

// Import any necessary modules for testing
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { logger } = require('../utils/logger');

// Create an in-memory MongoDB server for isolated testing
let mongoServer;

// Silence the logger during tests
logger.silent = true;

// Connect to the in-memory database before tests start
beforeAll(async () => {
  // Use MongoDB Memory Server for testing isolation
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

// Clean up database between tests
afterEach(async () => {
  // Clear all collections to ensure test isolation
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Disconnect and close the server after all tests are done
afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

// Add global test utilities
global.createTestUser = async (userData = {}) => {
  const User = require('../models/User');
  const defaultUser = {
    name: 'Test User',
    email: `test-${Date.now()}@example.com`,
    password: 'password123',
    verified: true
  };
  
  const user = new User({
    ...defaultUser,
    ...userData
  });
  
  await user.save();
  return user;
};

// Helper function to create a test capsule
global.createTestCapsule = async (capsuleData = {}, userId = null) => {
  const Capsule = require('../models/Capsule');
  
  // Create a user if not provided
  if (!userId) {
    const user = await global.createTestUser();
    userId = user._id;
  }
  
  const defaultCapsule = {
    title: 'Test Capsule',
    content: 'This is a test capsule content',
    releaseDate: new Date(),
    isPublic: false,
    user: userId
  };
  
  const capsule = new Capsule({
    ...defaultCapsule,
    ...capsuleData
  });
  
  await capsule.save();
  return capsule;
};

// Generate a valid JWT token for testing
global.generateTestToken = (userId) => {
  const jwt = require('jsonwebtoken');
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

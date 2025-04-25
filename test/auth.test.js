/**
 * Tests for authentication routes
 */
const request = require('supertest');
const app = require('../app');
const User = require('../models/User');

describe('Auth Routes', () => {
  describe('POST /api/auth/register', () => {
    const validUser = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123'
    };

    it('should register a new user with valid data', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(validUser);

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('_id');
      expect(res.body).toHaveProperty('name', validUser.name);
      expect(res.body).toHaveProperty('email', validUser.email);
      expect(res.body).toHaveProperty('verified', false);
      expect(res.body).toHaveProperty('token');

      // Verify user was saved to database
      const user = await User.findOne({ email: validUser.email });
      expect(user).toBeTruthy();
      expect(user.name).toBe(validUser.name);
    });

    it('should not register a user with an existing email', async () => {
      // First register a user
      await request(app).post('/api/auth/register').send(validUser);

      // Try to register again with same email
      const res = await request(app)
        .post('/api/auth/register')
        .send(validUser);

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('User already exists');
    });

    it('should not register a user with invalid data', async () => {
      // Missing name
      const res1 = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid@example.com',
          password: 'password123'
        });

      expect(res1.statusCode).toBe(400);

      // Invalid email format
      const res2 = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Invalid User',
          email: 'not-an-email',
          password: 'password123'
        });

      expect(res2.statusCode).toBe(400);

      // Short password
      const res3 = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Invalid User',
          email: 'invalid2@example.com',
          password: '12345' // Too short
        });

      expect(res3.statusCode).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a verified test user before each test
      const user = new User({
        name: 'Login Test User',
        email: 'login@example.com',
        password: 'password123',
        verified: true
      });
      await user.save();
    });

    it('should login a user with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'password123'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('_id');
      expect(res.body).toHaveProperty('email', 'login@example.com');
    });

    it('should not login a user with incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'wrongpassword'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('Invalid credentials');
    });

    it('should not login a non-existent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('Invalid credentials');
    });

    it('should not login an unverified user', async () => {
      // Create an unverified user
      const unverifiedUser = new User({
        name: 'Unverified User',
        email: 'unverified@example.com',
        password: 'password123',
        verified: false
      });
      await unverifiedUser.save();

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'unverified@example.com',
          password: 'password123'
        });

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('verify your email');
      expect(res.body).toHaveProperty('verified', false);
    });
  });

  describe('GET /api/auth/user', () => {
    let token;

    beforeEach(async () => {
      // Create a test user and get token
      const user = await global.createTestUser({
        name: 'Auth User',
        email: 'authuser@example.com'
      });
      token = global.generateTestToken(user._id);
    });

    it('should get the user profile when authenticated', async () => {
      const res = await request(app)
        .get('/api/auth/user')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('_id');
      expect(res.body).toHaveProperty('name', 'Auth User');
      expect(res.body).toHaveProperty('email', 'authuser@example.com');
      expect(res.body).not.toHaveProperty('password'); // Password should not be returned
    });

    it('should not allow access without a token', async () => {
      const res = await request(app)
        .get('/api/auth/user');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('Not authorized');
    });

    it('should not allow access with an invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/user')
        .set('Authorization', 'Bearer invalidtoken123');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('message');
    });
  });
});

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const xss = require('xss-clean');
require('dotenv').config();
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const capsuleRoutes = require('./routes/capsules');
const ratingRoutes = require('./routes/ratings');
const statRoutes = require('./routes/stats');
const notificationRoutes = require('./routes/notifications');
const subscriptionRoutes = require('./routes/subscriptions');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const { connectDB } = require('./config/db');

const app = express();

// Connect to MongoDB
connectDB();

// Configure CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000']; // Default to localhost in development

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `The CORS policy for this site does not allow access from the specified origin: ${origin}`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));
// Parse JSON with increased limit for larger payloads
const maxRequestSize = process.env.MAX_FILE_SIZE || 10 * 1024 * 1024; // Default to 10MB
app.use(express.json({ limit: maxRequestSize }));
app.use(express.urlencoded({ extended: true, limit: maxRequestSize }));
app.use(morgan('dev'));
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use(limiter);

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Prevent parameter pollution
app.use(hpp());

// Data sanitization against XSS
app.use(xss());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/capsules', capsuleRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/stats', statRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;

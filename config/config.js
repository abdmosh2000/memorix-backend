// Configuration settings for different environments

// Determine the current environment
const env = process.env.NODE_ENV || 'development';

// Base configuration
const baseConfig = {
  // Server settings
  server: {
    port: process.env.PORT || 5000,
    env: env
  },
  
  // Frontend URLs
  frontend: {
    url: process.env.FRONTEND_URL || 'https://memorix.fun',
    allowedOrigins: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : [
          'http://localhost:3000',          // Local development
          'https://memorix.fun',            // Main domain
          'https://*.memorix.fun',          // All subdomains
          'https://memorix-app.godaddysites.com', // Default GoDaddy domain pattern
          'https://*.godaddysites.com',     // Any GoDaddy subdomain
          process.env.GODADDY_DOMAIN || '' // User's custom GoDaddy domain
        ].filter(Boolean) // Remove empty strings
  },
  
  // Email settings
  email: {
    from: process.env.EMAIL_FROM || 'Memorix <no-reply@memorix.fun>',
    resendApiKey: process.env.RESEND_API_KEY || 're_gzsvPCdQ_MD8UtQpXBvvoXqZeQcrgajTG',
    // Different templates for different email types could be configured here
  },
  
  // JWT settings
  jwt: {
    secret: process.env.JWT_SECRET || 'your-strong-production-jwt-secret',
    expiresIn: '7d' // Token validity period
  },
  
  // Database settings
  database: {
    uri: process.env.MONGO_URI || 'mongodb+srv://abdmosh2000:abd0594559353@cluster0.mongodb.net/memorix?retryWrites=true&w=majority'
  },
  
  // Encryption keys and settings
  encryption: {
    saltRounds: 10,
    capsuleEncryptKey: process.env.CAPSULE_ENCRYPT_KEY || 'memorix-capsule-encryption-key-2025',
    // For more secure production, use a strong key stored in environment variables
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.NODE_ENV === 'production' ? 'combined' : 'dev'
  },
  
  // File upload limits
  upload: {
    maxSize: parseInt(process.env.MAX_FILE_SIZE || 10485760), // 10MB default
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'audio/mpeg', 'application/pdf'],
    storageDir: process.env.UPLOAD_DIR || 'uploads/'
  },
  
  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100 // Maximum requests per IP in the window period
  },
  
  // Admin settings
  admin: {
    // List of admin emails that have admin privileges by default
    // These users will automatically be granted admin status on registration
    emails: process.env.ADMIN_EMAILS 
      ? process.env.ADMIN_EMAILS.split(',') 
      : ['admin@memorix.fun', 'abdmosh2000@gmail.com']
  },
  
  // Domain settings
  domain: {
    name: 'memorix.fun',
    ssl: true,
    supportEmail: 'support@memorix.fun'
  }
};

// Environment-specific overrides
const envConfig = {
  development: {
    frontend: {
      url: 'http://localhost:3000'
    },
    logging: {
      level: 'debug',
      format: 'dev'
    }
  },
  test: {
    // Test-specific settings
    database: {
      uri: process.env.TEST_MONGO_URI || 'mongodb://localhost:27017/memorix_test'
    },
    logging: {
      level: 'error'
    }
  },
  production: {
    // Production overrides are typically handled by environment variables
    // which are already incorporated into baseConfig
  }
};

// Merge base configuration with environment-specific settings
const config = {
  ...baseConfig,
  ...(envConfig[env] || {})
};

// Deep merge nested objects
Object.keys(envConfig[env] || {}).forEach(key => {
  if (typeof envConfig[env][key] === 'object' && !Array.isArray(envConfig[env][key])) {
    config[key] = {
      ...baseConfig[key],
      ...envConfig[env][key]
    };
  }
});

module.exports = config;

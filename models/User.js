console.log('19');/* eslint-disable no-useless-escape */
const mongoose = require('mongoose');
console.log('122');
const bcrypt = require('bcryptjs');
console.log('2222');
const crypto = require('crypto');
console.log('324');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 50
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  profilePicture: {
    type: String,
    default: 'default-profile.png' // Replace with default image path
  },
  subscription: {
    plan_name: {
      type: String,
      enum: ['Free', 'Premium', 'Lifetime'],
      default: 'Free'
    },
    subscribed_at: {
      type: Date,
      default: Date.now
    },
    payment_method: {
      type: String,
      enum: ['PayPal', 'Stripe', 'Manual', 'None'],
      default: 'None'
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'lifetime'],
      default: 'active'
    },
    expiry_date: Date
  },
  paymentDetails: {
    orderID: String,
    subscriptionID: String,
    lastPaymentDate: Date,
    nextPaymentDate: Date,
    transactions: [{
      plan: {
        type: String,
        enum: ['Premium', 'Lifetime'],
        required: true
      },
      orderID: String,
      subscriptionID: String,
      amount: Number,
      currency: {
        type: String,
        default: 'USD'
      },
      date: {
        type: Date,
        default: Date.now
      },
      status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'completed'
      }
    }]
  },
  capsuleCount: {
    type: Number,
    default: 0
  },
  role: {
    type: String,
    enum: ['user', 'moderator', 'content_curator', 'admin'],
    default: 'user'
  },
  permissions: {
    type: [String],
    default: []
  },
  verified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  verificationTokenExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});
console.log('ضضضض');
// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});
console.log('1ؤءر');
// Function to convert string subscriptions to objects
function convertSubscriptionToObject(subscription) {
  // Log the incoming subscription value for debugging
  console.log('Converting subscription:', subscription, 'Type:', typeof subscription);
  
  // Handle string values
  if (typeof subscription === 'string') {
    const subscriptionType = subscription.toLowerCase();
    console.log('Normalized subscription type:', subscriptionType);
        
    // Map common subscription names to standardized values
    let planName;
    if (subscriptionType === 'free') {
      planName = 'Free';
    } else if (subscriptionType === 'premium' || subscriptionType === 'paid') {
      planName = 'Premium';
    } else if (subscriptionType === 'lifetime' || subscriptionType === 'vip') {
      planName = 'Lifetime';
    } else {
      // Default to Free for any unrecognized string
      console.log('Unrecognized subscription type. Defaulting to Free.');
      planName = 'Free';
    }
        
    // Determine status and expiry based on plan type
    const status = (planName === 'Lifetime') ? 'lifetime' : 'active';
    const expiryDate = (planName === 'Free' || planName === 'Lifetime') 
      ? null 
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days for Premium
        
    // Return the subscription object
    const result = {
      plan_name: planName,
      subscribed_at: new Date(),
      payment_method: 'None',
      status: status,
      expiry_date: expiryDate
    };
        
    console.log('Converted to subscription object:', result);
    return result;
  }
    
  // Return the subscription if it's already an object
  if (subscription && typeof subscription === 'object') {
    return subscription;
  }
    
  // Return default subscription if null or undefined
  return {
    plan_name: 'Free',
    subscribed_at: new Date(),
    payment_method: 'None',
    status: 'active',
    expiry_date: null
  };
}
console.log('first console log');
// Since we can't directly use a setter on a nested path, we'll rely solely on the pre hooks
// to ensure the subscription field is always in the correct format
console.log('Pre hooks are more reliable for this complex schema');
console.log('second console test');
// Handle subscription field to ensure it's always an object
userSchema.pre('save', function(next) {
  console.log('Pre-save hook running for user:', this.email);
  console.log('Initial subscription value:', this.subscription);
  
  // Special handling for string values directly assigned to subscription
  if (typeof this.subscription === 'string') {
    console.log('Found string subscription in pre-save hook, converting:', this.subscription);
    // Use a try-catch since this is critical functionality
    try {
      this.subscription = convertSubscriptionToObject(this.subscription);
      console.log('Successfully converted to:', this.subscription);
    } catch (error) {
      console.error('Error converting subscription in pre-save hook:', error);
      // Fallback to a default value
      this.subscription = {
        plan_name: 'Free',
        subscribed_at: new Date(),
        payment_method: 'None',
        status: 'active',
        expiry_date: null
      };
      console.log('Using fallback subscription value:', this.subscription);
    }
  } else if (!this.subscription) {
    console.log('No subscription found, setting default');
    this.subscription = {
      plan_name: 'Free',
      subscribed_at: new Date(),
      payment_method: 'None',
      status: 'active',
      expiry_date: null
    };
  }
  
  next();
});

// Also handle subscription for findOneAndUpdate and findByIdAndUpdate
userSchema.pre('findOneAndUpdate', function(next) {
  console.log('findOneAndUpdate hook running');
  const update = this.getUpdate();
  
  try {
    // Handle $set operator
    if (update && update.$set) {
      if (typeof update.$set.subscription === 'string') {
        console.log('Found string subscription in $set:', update.$set.subscription);
        update.$set.subscription = convertSubscriptionToObject(update.$set.subscription);
        console.log('Converted $set.subscription to object:', update.$set.subscription);
      } else if (update.$set.subscription && typeof update.$set.subscription === 'object') {
        console.log('Found object subscription in $set, no conversion needed');
      }
    }
    
    // Handle direct update
    if (update) {
      if (typeof update.subscription === 'string') {
        console.log('Found direct string subscription update:', update.subscription);
        update.subscription = convertSubscriptionToObject(update.subscription);
        console.log('Converted direct subscription to object:', update.subscription);
      } else if (update.subscription && typeof update.subscription === 'object') {
        console.log('Found direct object subscription, no conversion needed');
      }
    }
  } catch (error) {
    console.error('Error in findOneAndUpdate subscription conversion:', error);
    // Provide a default safe value if conversion fails
    if (update && update.$set) {
      update.$set.subscription = {
        plan_name: 'Free',
        subscribed_at: new Date(),
        payment_method: 'None',
        status: 'active',
        expiry_date: null
      };
    }
    
    if (update && update.subscription !== undefined) {
      update.subscription = {
        plan_name: 'Free',
        subscribed_at: new Date(),
        payment_method: 'None',
        status: 'active',
        expiry_date: null
      };
    }
  }
  
  next();
});

// Method to compare passwords
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate email verification token
userSchema.methods.createVerificationToken = function() {
  const verificationToken = crypto.randomBytes(32).toString('hex');
    
  this.verificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
        
  // Token expires in 24 hours
  this.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;
    
  return verificationToken;
};

// Generate password reset token
userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
    
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
        
  // Token expires in 10 minutes
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
    
  return resetToken;
};

const User = mongoose.model('User', userSchema);



module.exports = User;

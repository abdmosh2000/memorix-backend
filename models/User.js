const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

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

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Function to convert string subscriptions to objects
function convertSubscriptionToObject(subscription) {
    if (typeof subscription === 'string') {
        const subscriptionType = subscription.toLowerCase();
        
        // Convert the plan name to proper case
        const planName = subscriptionType.charAt(0).toUpperCase() + subscriptionType.slice(1);
        
        // Determine status and expiry based on plan type
        const status = subscriptionType === 'vip' || subscriptionType === 'lifetime' ? 'lifetime' : 'active';
        const expiryDate = (subscriptionType === 'free' || subscriptionType === 'vip' || subscriptionType === 'lifetime') 
            ? null 
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days for paid non-lifetime
        
        // Return the subscription object
        return {
            plan_name: planName,
            subscribed_at: new Date(),
            payment_method: 'None',
            status: status,
            expiry_date: expiryDate
        };
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

// Define schema setter for subscription
userSchema.path('subscription').set(function(value) {
    return convertSubscriptionToObject(value);
});

// Handle subscription field to ensure it's always an object
userSchema.pre('save', function(next) {
    // Convert string subscription to object if needed
    this.subscription = convertSubscriptionToObject(this.subscription);
    next();
});

// Also handle subscription for findOneAndUpdate and findByIdAndUpdate
userSchema.pre('findOneAndUpdate', function(next) {
    const update = this.getUpdate();
    if (update && update.$set && update.$set.subscription) {
        update.$set.subscription = convertSubscriptionToObject(update.$set.subscription);
    }
    
    if (update && update.subscription) {
        update.subscription = convertSubscriptionToObject(update.subscription);
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

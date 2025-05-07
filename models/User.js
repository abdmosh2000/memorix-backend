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
        // Ensure this is always an object
        type: {
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
        default: {
            plan_name: 'Free',
            subscribed_at: new Date(),
            payment_method: 'None',
            status: 'active', 
            expiry_date: null
        }
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

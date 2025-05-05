const User = require('../models/User');
const crypto = require('crypto');
const generateToken = require('../utils/generateToken');
const emailService = require('../utils/emailService');
const config = require('../config/config');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    const { name, email, password, profilePicture } = req.body;

    try {
        // Check if user already exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Check if user should be admin based on email
        const isAdminEmail = config.admin.emails.includes(email.toLowerCase());
        // Check if it's the head admin email (abdmosh2000@gmail.com)
        const isHeadAdmin = email.toLowerCase() === 'abdmosh2000@gmail.com';

        // Create a new user with appropriate role
        user = new User({
            name,
            email,
            password,
            role: isAdminEmail ? 'admin' : 'user',
            // Add specific permissions for head admin
            permissions: isHeadAdmin ? ['full_access', 'system_admin', 'super_admin'] : [],
            verified: false
        });

        // Generate verification token
        const verificationToken = user.createVerificationToken();

        // Add profile picture if provided
        if (profilePicture) {
            user.profilePicture = profilePicture;
        }

        // Hash the password and save the user
        await user.save();

        // Send verification email
        try {
            await emailService.sendVerificationEmail(user.email, user.name, verificationToken);
            console.log(`Verification email sent to ${user.email}`);
        } catch (emailError) {
            console.error('Error sending verification email:', emailError);
            // Continue registration process even if email fails
            // Consider implementing a retry mechanism or queuing system for production
        }

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            profilePicture: user.profilePicture,
            verified: user.verified,
            token: generateToken(user._id)
        });
    } catch (err) {
        console.error('Registration error:', err.message);
        res.status(500).json({ message: 'Server error during registration' });
    }
};

// @desc    Verify email with token
// @route   GET /api/auth/verify-email/:token
// @access  Public
const verifyEmail = async (req, res) => {
    try {
        // Get token from parameters or query
        const token = req.params.token || req.query.token;
        
        if (!token) {
            return res.status(400).json({ message: 'Verification token is required' });
        }

        // Hash token
        const hashedToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        // Find user with matching token and valid expiry
        const user = await User.findOne({
            verificationToken: hashedToken,
            verificationTokenExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired verification token' });
        }

        // Update user as verified and clear token
        user.verified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpires = undefined;
        await user.save();

        // Send welcome email
        try {
            await emailService.sendWelcomeEmail(user.email, user.name);
        } catch (emailError) {
            console.error('Error sending welcome email:', emailError);
            // Continue the verification process even if welcome email fails
        }

        res.json({ 
            message: 'Email verified successfully',
            verified: true
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error during verification' });
    }
}

// @desc    Resend verification email
// @route   POST /api/auth/resend-verification
// @access  Public
const resendVerification = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if already verified
        if (user.verified) {
            return res.status(400).json({ message: 'Email is already verified' });
        }

        // Generate new verification token
        const verificationToken = user.createVerificationToken();
        await user.save();

        // Send verification email
        await emailService.sendVerificationEmail(user.email, user.name, verificationToken);

        res.json({ message: 'Verification email has been resent' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error' });
    }
}

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check if password matches
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check if email is verified
        if (!user.verified) {
            return res.status(401).json({
                message: 'Please verify your email before logging in',
                verified: false,
                email: user.email
            });
        }
        
        // Migration: Convert old string subscription format to new object format
        if (typeof user.subscription === 'string') {
            try {
                // Get the old subscription value before updating
                const oldSubscriptionType = user.subscription;
                
                // Set the new format with plan_name based on old value
                user.subscription = {
                    plan_name: oldSubscriptionType.charAt(0).toUpperCase() + oldSubscriptionType.slice(1),
                    subscribed_at: new Date(),
                    payment_method: 'None',
                    status: oldSubscriptionType === 'vip' ? 'lifetime' : 'active',
                    expiry_date: oldSubscriptionType === 'free' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days for non-free
                };
                
                // Save the user with the migrated subscription data
                await user.save();
                console.log(`Migrated user ${user.email} from old subscription format to new format`);
            } catch (migrationError) {
                console.error('Error migrating subscription format:', migrationError);
                // Don't stop the login process if migration fails
            }
        }

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            profilePicture: user.profilePicture,
            role: user.role,
            subscription: user.subscription,
            verified: user.verified,
            token: generateToken(user._id)
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error during login' });
    }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logoutUser = async (req, res) => {
    // In a real-world application, you might want to invalidate the JWT token on the server-side.
    // However, since JWTs are stateless, the most common approach is to simply remove the token from the client-side.
    res.json({ message: 'Logged out successfully' });
};

// @desc    Get user profile
// @route   GET /api/auth/user
// @access  Private
const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        
        // Migration: Convert old string subscription format to new object format
        if (typeof user.subscription === 'string') {
            try {
                // Get the old subscription value before updating
                const oldSubscriptionType = user.subscription;
                
                // Set the new format with plan_name based on old value
                user.subscription = {
                    plan_name: oldSubscriptionType.charAt(0).toUpperCase() + oldSubscriptionType.slice(1),
                    subscribed_at: new Date(),
                    payment_method: 'None',
                    status: oldSubscriptionType === 'vip' ? 'lifetime' : 'active',
                    expiry_date: oldSubscriptionType === 'free' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days for non-free
                };
                
                // Save the user with the migrated subscription data
                await user.save();
                console.log(`Migrated user ${user.email} from old subscription format to new format during profile fetch`);
            } catch (migrationError) {
                console.error('Error migrating subscription format in profile fetch:', migrationError);
                // Don't stop the profile fetch if migration fails
            }
        }
        
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// @desc    Request password reset
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            // For security reasons, don't let the client know if the email exists or not
            return res.json({ message: 'If an account with that email exists, we have sent a password reset link' });
        }

        // Generate reset token
        const resetToken = user.createPasswordResetToken();
        await user.save({ validateBeforeSave: false });

        // Send password reset email
        try {
            await emailService.sendPasswordResetEmail(user.email, user.name, resetToken);
        } catch (emailError) {
            // If email fails to send, clear the token and expiry
            user.passwordResetToken = undefined;
            user.passwordResetExpires = undefined;
            await user.save({ validateBeforeSave: false });
            
            console.error('Error sending password reset email:', emailError);
            return res.status(500).json({ 
                message: 'Error sending password reset email. Please try again later.' 
            });
        }

        // For security, don't confirm whether the email exists
        res.json({ message: 'If an account with that email exists, we have sent a password reset link' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Reset password with token
// @route   POST /api/auth/reset-password/:token
// @access  Public
const resetPassword = async (req, res) => {
    try {
        const { password } = req.body;
        const token = req.params.token || req.query.token;
        
        if (!password) {
            return res.status(400).json({ message: 'New password is required' });
        }
        
        if (!token) {
            return res.status(400).json({ message: 'Reset token is required' });
        }

        // Hash token
        const hashedToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        // Find user with matching token and valid expiry
        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired reset token' });
        }

        // Update password and clear token
        user.password = password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        
        // If the user wasn't verified before, mark them as verified now
        if (!user.verified) {
            user.verified = true;
        }
        
        await user.save();

        res.json({ message: 'Password reset successful. You can now log in with your new password.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error during password reset' });
    }
};

module.exports = { 
    registerUser, 
    loginUser, 
    logoutUser, 
    getUserProfile, 
    verifyEmail, 
    resendVerification,
    forgotPassword,
    resetPassword 
};

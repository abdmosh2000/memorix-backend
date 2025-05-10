/* eslint-disable prefer-const */
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
        
    // Set subscription properties individually to match the nested structure in the User model
    user.subscription = {}; // Initialize as empty object
        
    if (isAdminEmail) {
      user.subscription.plan_name = 'Lifetime';
      user.subscription.subscribed_at = new Date();
      user.subscription.payment_method = 'Manual';
      user.subscription.status = 'lifetime';
      user.subscription.expiry_date = null;
    } else {
      user.subscription.plan_name = 'Free';
      user.subscription.subscribed_at = new Date();
      user.subscription.payment_method = 'None';
      user.subscription.status = 'active';
      user.subscription.expiry_date = null;
    }

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

    // Handle string subscription if present
    if (typeof user.subscription === 'string') {
      try {
        const oldSubscriptionType = user.subscription;
        const isAdmin = user.role === 'admin';
                
        // Create subscription object
        const subscriptionData = {
          plan_name: isAdmin ? 'Lifetime' : oldSubscriptionType.charAt(0).toUpperCase() + oldSubscriptionType.slice(1),
          subscribed_at: new Date(),
          payment_method: isAdmin ? 'Manual' : 'None',
          status: isAdmin ? 'lifetime' : (oldSubscriptionType === 'vip' ? 'lifetime' : 'active'),
          expiry_date: (isAdmin || oldSubscriptionType === 'free' || oldSubscriptionType === 'vip') 
            ? null 
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        };
                
        // Update subscription data
        user.subscription = subscriptionData;
        console.log(`Converted string subscription '${oldSubscriptionType}' to object during email verification`);
      } catch (error) {
        console.error('Error handling subscription during verification:', error);
        // Set a default if there's an error
        user.subscription = {
          plan_name: 'Free',
          subscribed_at: new Date(),
          payment_method: 'None',
          status: 'active',
          expiry_date: null
        };
      }
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
};

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
        
    // Handle string subscription if present
    if (typeof user.subscription === 'string') {
      try {
        const oldSubscriptionType = user.subscription;
        const isAdmin = user.role === 'admin';
                
        // Create subscription object
        const subscriptionData = {
          plan_name: isAdmin ? 'Lifetime' : oldSubscriptionType.charAt(0).toUpperCase() + oldSubscriptionType.slice(1),
          subscribed_at: new Date(),
          payment_method: isAdmin ? 'Manual' : 'None',
          status: isAdmin ? 'lifetime' : (oldSubscriptionType === 'vip' ? 'lifetime' : 'active'),
          expiry_date: (isAdmin || oldSubscriptionType === 'free' || oldSubscriptionType === 'vip') 
            ? null 
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        };
                
        // Update subscription data
        user.subscription = subscriptionData;
        console.log(`Converted string subscription '${oldSubscriptionType}' to object during resend verification`);
      } catch (error) {
        console.error('Error handling subscription during resend verification:', error);
        // Set a default if there's an error
        user.subscription = {
          plan_name: 'Free',
          subscribed_at: new Date(),
          payment_method: 'None',
          status: 'active',
          expiry_date: null
        };
      }
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
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if user exists - use lean() to get a plain object instead of a Mongoose document
    // This helps avoid issues with trying to set properties on string subscription values
    let user = await User.findOne({ email }).lean();
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create a proper User model instance for password comparison
    const userInstance = new User(user);
        
    // Check if password matches
    const isMatch = await userInstance.matchPassword(password);
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
        
    // Handle string subscription separately - don't try to modify it directly
    if (typeof user.subscription === 'string') {
      console.log('String subscription detected during login, converting...');
            
      try {
        // Create subscription data object from string value
        const oldSubscriptionType = user.subscription;
        const isAdmin = user.role === 'admin';
                
        // Prepare the subscription data
        const subscriptionData = {
          plan_name: isAdmin ? 'Lifetime' : oldSubscriptionType.charAt(0).toUpperCase() + oldSubscriptionType.slice(1),
          subscribed_at: new Date(),
          payment_method: isAdmin ? 'Manual' : 'None',
          status: isAdmin ? 'lifetime' : (oldSubscriptionType === 'vip' ? 'lifetime' : 'active'),
          expiry_date: (isAdmin || oldSubscriptionType === 'free' || oldSubscriptionType === 'vip') 
            ? null 
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days for non-free, non-lifetime
        };
                
        // Update user document with atomic operation
        await User.findByIdAndUpdate(
          user._id, 
          { $set: { subscription: subscriptionData } },
          { runValidators: false }
        );
                
        console.log(`Updated subscription for user ${user.email} from string to object during login`);
                
        // Update our local copy for the response
        user.subscription = subscriptionData;
      } catch (error) {
        console.error('Failed to update subscription during login:', error);
        // If update fails, use a safe default for the response
        user.subscription = {
          plan_name: 'Free',
          subscribed_at: new Date(),
          payment_method: 'None',
          status: 'active',
          expiry_date: null
        };
      }
    }

    // Return response with updated subscription
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
    console.error('Login error:', err.message, err.stack);
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
    // Use lean to get a plain object instead of a Mongoose document
    let user = await User.findById(req.user.id).select('-password').lean();
        
    // Handle string subscription - use atomic update instead of direct property modification
    if (typeof user.subscription === 'string') {
      console.log('String subscription detected during profile fetch, converting...');
            
      try {
        // Create subscription data object from string value
        const oldSubscriptionType = user.subscription;
        const isAdmin = user.role === 'admin';
                
        // Process the subscription data
        const subscriptionData = {
          plan_name: isAdmin ? 'Lifetime' : oldSubscriptionType.charAt(0).toUpperCase() + oldSubscriptionType.slice(1),
          subscribed_at: new Date(),
          payment_method: isAdmin ? 'Manual' : 'None',
          status: isAdmin ? 'lifetime' : (oldSubscriptionType === 'vip' ? 'lifetime' : 'active'),
          expiry_date: (isAdmin || oldSubscriptionType === 'free' || oldSubscriptionType === 'vip') 
            ? null 
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days for non-free, non-lifetime
        };
                
        // Update user document with atomic operation
        await User.findByIdAndUpdate(
          user._id, 
          { $set: { subscription: subscriptionData } },
          { runValidators: false }
        );
                
        console.log(`Updated subscription for user ${user.email} from string to object during profile fetch`);
                
        // Update our local copy for the response
        user.subscription = subscriptionData;
      } catch (error) {
        console.error('Failed to update subscription during profile fetch:', error);
        // If update fails, use a safe default for the response
        user.subscription = {
          plan_name: 'Free',
          subscribed_at: new Date(),
          payment_method: 'None',
          status: 'active',
          expiry_date: null
        };
      }
    }
        
    res.json(user);
  } catch (err) {
    console.error('Error in getUserProfile:', err.message, err.stack);
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
        
    // Handle string subscription if present
    if (typeof user.subscription === 'string') {
      try {
        const oldSubscriptionType = user.subscription;
        const isAdmin = user.role === 'admin';
                
        // Create subscription object
        const subscriptionData = {
          plan_name: isAdmin ? 'Lifetime' : oldSubscriptionType.charAt(0).toUpperCase() + oldSubscriptionType.slice(1),
          subscribed_at: new Date(),
          payment_method: isAdmin ? 'Manual' : 'None',
          status: isAdmin ? 'lifetime' : (oldSubscriptionType === 'vip' ? 'lifetime' : 'active'),
          expiry_date: (isAdmin || oldSubscriptionType === 'free' || oldSubscriptionType === 'vip') 
            ? null 
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        };
                
        // Update subscription data
        user.subscription = subscriptionData;
        console.log(`Converted string subscription '${oldSubscriptionType}' to object during password reset request`);
      } catch (error) {
        console.error('Error handling subscription during password reset request:', error);
        // Set a default if there's an error
        user.subscription = {
          plan_name: 'Free',
          subscribed_at: new Date(),
          payment_method: 'None',
          status: 'active',
          expiry_date: null
        };
      }
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
        
    // Handle string subscription if present
    if (typeof user.subscription === 'string') {
      try {
        const oldSubscriptionType = user.subscription;
        const isAdmin = user.role === 'admin';
                
        // Create subscription object
        const subscriptionData = {
          plan_name: isAdmin ? 'Lifetime' : oldSubscriptionType.charAt(0).toUpperCase() + oldSubscriptionType.slice(1),
          subscribed_at: new Date(),
          payment_method: isAdmin ? 'Manual' : 'None',
          status: isAdmin ? 'lifetime' : (oldSubscriptionType === 'vip' ? 'lifetime' : 'active'),
          expiry_date: (isAdmin || oldSubscriptionType === 'free' || oldSubscriptionType === 'vip') 
            ? null 
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        };
                
        // Update subscription data
        user.subscription = subscriptionData;
        console.log(`Converted string subscription '${oldSubscriptionType}' to object during password reset`);
      } catch (error) {
        console.error('Error handling subscription during password reset:', error);
        // Set a default if there's an error
        user.subscription = {
          plan_name: 'Free',
          subscribed_at: new Date(),
          payment_method: 'None',
          status: 'active',
          expiry_date: null
        };
      }
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

const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log('Decoded token:', decoded);

            // Get user from the token
            let user = await User.findById(decoded.id).select('-password');
            
            if (!user) {
                console.error('User not found for token:', token);
                return res.status(401).json({ message: 'User not found' });
            }
            
            // Handle case where subscription is a string (migration from old format)
            if (typeof user.subscription === 'string') {
                console.log(`Auth middleware detected string subscription '${user.subscription}' for user ${user._id}`);
                try {
                    // Get the old subscription value
                    const oldSubscriptionType = user.subscription;
                    
                    // Convert to object format
                    const subscription = {
                        plan_name: oldSubscriptionType.charAt(0).toUpperCase() + oldSubscriptionType.slice(1),
                        subscribed_at: new Date(),
                        payment_method: 'None',
                        status: oldSubscriptionType === 'vip' ? 'lifetime' : 'active',
                        expiry_date: (oldSubscriptionType === 'free' || oldSubscriptionType === 'vip') ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                    };
                    
                    // Update user in database
                    await User.findByIdAndUpdate(
                        user._id,
                        { $set: { subscription } },
                        { new: false, runValidators: false }
                    );
                    
                    console.log(`Updated user's subscription in auth middleware`);
                    
                    // Set the subscription directly on the user object in memory
                    user.subscription = subscription;
                } catch (error) {
                    console.error('Error handling string subscription in auth middleware:', error);
                    // If we can't update, just use a default object for this request
                    user.subscription = {
                        plan_name: 'Free',
                        subscribed_at: new Date(),
                        payment_method: 'None',
                        status: 'active',
                        expiry_date: null
                    };
                }
            }
            
            // Set user in request
            req.user = user;
            console.log('Auth middleware set user:', req.user._id);
            
            return next();
        } catch (error) {
            console.error('Token verification error:', error);
            return res.status(401).json({ message: 'Not authorized, token failed', error: error.message });
        }
    }

    if (!token) {
        console.error('No token provided in request');
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

/**
 * Role-based access control middleware
 * 
 * @param {Array} roles - Array of roles that can access the route
 * @returns {Function} Express middleware
 */
const checkRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        if (roles.includes(req.user.role)) {
            return next();
        }

        return res.status(403).json({ 
            message: 'Access denied: Insufficient permissions',
            required: roles,
            current: req.user.role
        });
    };
};

// Admin middleware - Only users with admin role can access
const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as admin' });
    }
};

// Head Admin middleware - Only the super admin can access (abdmosh2000@gmail.com)
const headAdmin = (req, res, next) => {
    if (req.user && 
        req.user.role === 'admin' && 
        req.user.permissions.includes('super_admin')) {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as head admin' });
    }
};

// Middleware for moderator role or higher
const moderator = (req, res, next) => {
    const allowedRoles = ['moderator', 'content_curator', 'admin'];
    if (req.user && allowedRoles.includes(req.user.role)) {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as moderator' });
    }
};

// Middleware for content curator role or higher
const contentCurator = (req, res, next) => {
    const allowedRoles = ['content_curator', 'admin'];
    if (req.user && allowedRoles.includes(req.user.role)) {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as content curator' });
    }
};

// Middleware to check if a user is an admin or the owner of a resource
const adminOrOwner = (req, res, next) => {
    if (req.user && 
        (req.user.role === 'admin' || req.user.id === req.params.userId)) {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized' });
    }
};

module.exports = { 
    protect, 
    admin, 
    headAdmin,
    moderator,
    contentCurator,
    adminOrOwner,
    checkRole
};

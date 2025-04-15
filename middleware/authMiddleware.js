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
            const user = await User.findById(decoded.id).select('-password');
            
            if (!user) {
                console.error('User not found for token:', token);
                return res.status(401).json({ message: 'User not found' });
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

// Admin middleware
const admin = (req, res, next) => {
    if (req.user && req.user.isAdmin) {
        next();
    } else {
        res.status(401).json({ message: 'Not authorized as admin' });
    }
};

// Middleware to check if a user is an admin or the owner of a resource
const adminOrOwner = (req, res, next) => {
    if (req.user && (req.user.isAdmin || req.user.id === req.params.userId)) {
        next();
    } else {
        res.status(401).json({ message: 'Not authorized' });
    }
};

module.exports = { protect, admin, adminOrOwner };

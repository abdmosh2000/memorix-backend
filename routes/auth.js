const express = require('express');
const router = express.Router();
const { 
    registerUser, 
    loginUser, 
    logoutUser, 
    getUserProfile, 
    verifyEmail, 
    resendVerification,
    forgotPassword,
    resetPassword
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Registration and authentication
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.get('/user', protect, getUserProfile); // Protected route

// Email verification
router.get('/verify-email/:token', verifyEmail);
router.get('/verify-email', verifyEmail); // Alternative for query param
router.post('/resend-verification', resendVerification);

// Password reset
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.post('/reset-password', resetPassword); // Alternative for query param

module.exports = router;

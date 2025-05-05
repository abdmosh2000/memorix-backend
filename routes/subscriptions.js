const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
    subscribe,
    cancelSubscription,
    adminSetSubscription,
    getSubscription
} = require('../controllers/subscriptionController');

// @route   GET /api/subscriptions
// @desc    Get user's current subscription
// @access  Private
router.get('/', protect, getSubscription);

// @route   POST /api/subscriptions
// @desc    Subscribe to a plan
// @access  Private
router.post('/', protect, subscribe);

// @route   POST /api/subscriptions/cancel
// @desc    Cancel a subscription
// @access  Private
router.post('/cancel', protect, cancelSubscription);

// @route   POST /api/admin/subscriptions
// @desc    Admin endpoint to manually set a user's subscription
// @access  Private/Admin
router.post('/admin', protect, admin, adminSetSubscription);

module.exports = router;

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');

// @desc    Update user subscription
// @route   POST /api/subscriptions/update
// @access  Private
router.post('/update', protect, async (req, res) => {
    try {
        const { plan, orderID, subscriptionID } = req.body;
        
        if (!plan || !['premium', 'vip'].includes(plan)) {
            return res.status(400).json({ message: 'Invalid subscription plan' });
        }
        
        // Get the user
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Update the user's subscription
        user.subscription = plan;
        
        // Store payment details
        user.paymentDetails = user.paymentDetails || {};
        
        // Update payment details if provided
        if (orderID) {
            user.paymentDetails.orderID = orderID;
        }
        
        if (subscriptionID) {
            user.paymentDetails.subscriptionID = subscriptionID;
        }
        
        // Update payment dates
        user.paymentDetails.lastPaymentDate = new Date();
        
        // Set next payment date (1 month from now)
        const nextPaymentDate = new Date();
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
        user.paymentDetails.nextPaymentDate = nextPaymentDate;
        
        // Store transaction info
        const transaction = {
            plan,
            orderID: orderID || 'direct-upgrade',
            subscriptionID: subscriptionID || 'one-time',
            amount: plan === 'premium' ? 9.99 : plan === 'vip' ? 24.99 : 0,
            currency: 'USD',
            date: new Date()
        };
        
        user.paymentDetails.transactions = user.paymentDetails.transactions || [];
        user.paymentDetails.transactions.push(transaction);
        
        await user.save();
        
        return res.status(200).json({
            message: 'Subscription updated successfully',
            subscription: user.subscription
        });
    } catch (error) {
        console.error('Error updating subscription:', error);
        return res.status(500).json({ message: 'Server error updating subscription' });
    }
});

module.exports = router;

const User = require('../models/User');
const emailService = require('../utils/emailService');

// @desc    Subscribe a user to a plan
// @route   POST /api/subscriptions
// @access  Private
const subscribe = async (req, res) => {
    const { plan_type, payment_method, payment_token, duration_months = 1 } = req.body;
    
    try {
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Validate plan type
        if (!['Premium', 'Lifetime'].includes(plan_type)) {
            return res.status(400).json({ message: 'Invalid plan type. Must be Premium or Lifetime.' });
        }
        
        // Set subscription details
        const now = new Date();
        
        // Create transaction record
        const transaction = {
            plan: plan_type,
            orderID: payment_token,
            amount: plan_type === 'Premium' ? 9.99 : 99.99, // Sample amounts
            date: now,
            status: 'completed'
        };
        
        // Initialize paymentDetails if not exists
        if (!user.paymentDetails) {
            user.paymentDetails = {
                transactions: []
            };
        }
        
        // Add transaction to user's payment history
        user.paymentDetails.transactions.push(transaction);
        user.paymentDetails.orderID = payment_token;
        user.paymentDetails.lastPaymentDate = now;
        
        // Set subscription details based on plan type
        user.subscription.plan_name = plan_type;
        user.subscription.subscribed_at = now;
        user.subscription.payment_method = payment_method;
        
        if (plan_type === 'Lifetime') {
            user.subscription.status = 'lifetime';
            // Lifetime subscriptions don't expire
            user.subscription.expiry_date = null;
        } else {
            user.subscription.status = 'active';
            // Set expiry date (e.g., 30 days from now for monthly plan)
            const expiryDate = new Date();
            expiryDate.setMonth(expiryDate.getMonth() + duration_months);
            user.subscription.expiry_date = expiryDate;
            user.paymentDetails.nextPaymentDate = expiryDate;
        }
        
        await user.save();
        
        // Return the updated user without sensitive information
        const userResponse = {
            id: user._id,
            name: user.name,
            email: user.email,
            subscription: user.subscription,
            capsuleCount: user.capsuleCount
        };
        
        res.status(200).json({
            success: true,
            message: `Successfully subscribed to ${plan_type} plan`,
            user: userResponse
        });
    } catch (err) {
        console.error('Subscription error:', err);
        res.status(500).json({
            success: false,
            message: 'Server error during subscription process'
        });
    }
};

// @desc    Cancel a subscription
// @route   POST /api/subscriptions/cancel
// @access  Private
const cancelSubscription = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Cannot cancel a lifetime subscription
        if (user.subscription.status === 'lifetime') {
            return res.status(400).json({
                success: false,
                message: 'Lifetime subscriptions cannot be cancelled'
            });
        }
        
        // Set subscription to cancelled
        user.subscription.status = 'expired';
        
        // Reset to free plan at the end of the current billing cycle
        user.subscription.plan_name = 'Free';
        
        await user.save();
        
        res.status(200).json({
            success: true,
            message: 'Subscription cancelled successfully',
            subscription: user.subscription
        });
    } catch (err) {
        console.error('Cancellation error:', err);
        res.status(500).json({
            success: false,
            message: 'Server error during cancellation process'
        });
    }
};

// @desc    Admin endpoint to manually set user's subscription
// @route   POST /api/admin/subscriptions
// @access  Private/Admin
const adminSetSubscription = async (req, res) => {
    const { user_email, plan_type, reason } = req.body;
    
    try {
        // Verify admin role
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied: Admin privileges required'
            });
        }
        
        // Find user by email
        const user = await User.findOne({ email: user_email.toLowerCase() });
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Validate plan type
        if (!['Free', 'Premium', 'Lifetime'].includes(plan_type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid plan type. Must be Free, Premium, or Lifetime.'
            });
        }
        
        const now = new Date();
        
        // Set subscription details
        user.subscription.plan_name = plan_type;
        user.subscription.subscribed_at = now;
        user.subscription.payment_method = 'Manual';
        
        // Add administrative note to transactions
        if (!user.paymentDetails) {
            user.paymentDetails = {
                transactions: []
            };
        }
        
        if (plan_type !== 'Free') {
            const transaction = {
                plan: plan_type,
                orderID: `ADMIN-${Date.now()}`,
                amount: 0, // No charge for admin-assigned plans
                date: now,
                status: 'completed'
            };
            
            user.paymentDetails.transactions.push(transaction);
            user.paymentDetails.lastPaymentDate = now;
            
            // Set expiration based on plan type
            if (plan_type === 'Premium') {
                const expiryDate = new Date();
                expiryDate.setFullYear(expiryDate.getFullYear() + 1); // Admin gives 1 year by default
                user.subscription.expiry_date = expiryDate;
                user.subscription.status = 'active';
            } else { // Lifetime
                user.subscription.status = 'lifetime';
                user.subscription.expiry_date = null;
            }
        } else { // Free plan
            user.subscription.status = 'active';
            user.subscription.expiry_date = null;
        }
        
        await user.save();
        
        res.status(200).json({
            success: true,
            message: `User subscription manually set to ${plan_type} by admin`,
            subscription: user.subscription
        });
    } catch (err) {
        console.error('Admin subscription error:', err);
        res.status(500).json({
            success: false,
            message: 'Server error during admin subscription process'
        });
    }
};

// @desc    Get current user's subscription details
// @route   GET /api/subscriptions
// @access  Private
const getSubscription = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.status(200).json({
            success: true,
            subscription: user.subscription,
            paymentDetails: {
                lastPayment: user.paymentDetails?.lastPaymentDate,
                nextPayment: user.paymentDetails?.nextPaymentDate
            }
        });
    } catch (err) {
        console.error('Get subscription error:', err);
        res.status(500).json({
            success: false,
            message: 'Server error fetching subscription details'
        });
    }
};

module.exports = {
    subscribe,
    cancelSubscription,
    adminSetSubscription,
    getSubscription
};

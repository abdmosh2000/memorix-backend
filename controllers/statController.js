const User = require('../models/User');
const Stat = require('../models/Stat');
const logger = require('../utils/logger');

// @desc    Get all stats
// @route   GET /api/stats
// @access  Public
exports.getStats = async (req, res) => {
    try {
        let stats = await Stat.findOne();

        // If no stats document exists, create one
        if (!stats) {
            stats = new Stat();
            await stats.save();
        }

        res.json(stats);
    } catch (err) {
        logger.error('Error retrieving stats:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update payment stats
// @route   GET /api/stats/refresh-payment
// @access  Private/Admin
exports.refreshPaymentStats = async (req, res) => {
    try {
        // Get the stats document or create if it doesn't exist
        let stats = await Stat.findOne();
        if (!stats) {
            stats = new Stat();
        }

        // Count users by subscription type
        const subscriptionCounts = await User.aggregate([
            { $group: { _id: '$subscription', count: { $sum: 1 } } }
        ]);

        // Initialize subscription counts
        stats.paymentStats.subscriptionCounts = {
            free: 0,
            premium: 0,
            vip: 0
        };

        // Update subscription counts
        subscriptionCounts.forEach(sub => {
            if (sub._id && stats.paymentStats.subscriptionCounts[sub._id] !== undefined) {
                stats.paymentStats.subscriptionCounts[sub._id] = sub.count;
            }
        });

        // Calculate total revenue and transaction counts
        const transactions = await User.aggregate([
            { $unwind: { path: '$paymentDetails.transactions', preserveNullAndEmptyArrays: false } },
            { $match: { 'paymentDetails.transactions.status': 'completed' } }
        ]);

        let totalRevenue = 0;
        let transactionCount = transactions.length;

        // Monthly revenue tracking
        const monthlyRevenue = {};

        transactions.forEach(t => {
            const transaction = t.paymentDetails.transactions;
            if (transaction.amount) {
                totalRevenue += transaction.amount;
                
                // Track monthly revenue
                const date = transaction.date ? new Date(transaction.date) : new Date();
                const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                
                if (!monthlyRevenue[monthYear]) {
                    monthlyRevenue[monthYear] = 0;
                }
                monthlyRevenue[monthYear] += transaction.amount;
            }
        });

        // Update stats document
        stats.paymentStats.totalRevenue = totalRevenue;
        stats.paymentStats.transactions = transactionCount;
        stats.paymentStats.averageOrderValue = transactionCount > 0 ? totalRevenue / transactionCount : 0;
        stats.paymentStats.monthlyRevenue = monthlyRevenue;

        // Calculate conversion rate (percentage of paid users)
        const totalUsers = await User.countDocuments();
        const paidUsers = stats.paymentStats.subscriptionCounts.premium + stats.paymentStats.subscriptionCounts.vip;
        stats.paymentStats.conversionRate = totalUsers > 0 ? (paidUsers / totalUsers) * 100 : 0;

        // Save updated stats
        stats.updatedAt = Date.now();
        await stats.save();

        res.json({
            success: true,
            message: 'Payment stats refreshed successfully',
            data: stats.paymentStats
        });
    } catch (err) {
        logger.error('Error updating payment stats:', err);
        res.status(500).json({ 
            success: false,
            message: 'Server error',
            error: err.message
        });
    }
};

module.exports = exports;

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, admin, headAdmin, moderator, contentCurator } = require('../middleware/authMiddleware');

/**
 * Admin Dashboard Stats
 * GET /api/admin/stats - Get admin dashboard statistics
 * GET /api/admin/dashboard-summary - Get quick overview stats for dashboard
 * Access: Private/Admin
 */
router.get('/stats', protect, admin, adminController.getStats);
router.get('/dashboard-summary', protect, admin, adminController.getDashboardSummary);

/**
 * User Management
 * GET /api/admin/users - Get all users with filtering
 * PUT /api/admin/users/:id/role - Update user role
 * DELETE /api/admin/users/:id - Delete a user
 * PUT /api/admin/users/:id/verify - Manually verify user email
 * POST /api/admin/users/:id/gift-subscription - Grant gift subscription to user
 * Access: Private/Admin
 */
router.get('/users', protect, admin, adminController.getUsers);
router.put('/users/:id/role', protect, admin, adminController.updateUserRole);
router.delete('/users/:id', protect, headAdmin, adminController.deleteUser);
router.put('/users/:id/verify', protect, admin, adminController.verifyUserEmail);
router.post('/users/:id/gift-subscription', protect, admin, adminController.giftSubscription);

/**
 * Subscription Management
 * GET /api/admin/subscriptions - Get subscription plans
 * PUT /api/admin/subscriptions/:id - Update subscription plan
 * Access: Private/Admin
 */
router.get('/subscriptions', protect, admin, adminController.getSubscriptionPlans);
router.put('/subscriptions/:id', protect, headAdmin, adminController.updateSubscriptionPlan);

/**
 * System Logs
 * GET /api/admin/logs - Get system logs
 * Access: Private/Admin
 */
router.get('/logs', protect, admin, adminController.getSystemLogs);

module.exports = router;

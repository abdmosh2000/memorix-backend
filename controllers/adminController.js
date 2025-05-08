const User = require('../models/User');
const Capsule = require('../models/Capsule');
const { logger } = require('../utils/logger');
const emailService = require('../utils/emailService');
const config = require('../config/config');

/**
 * @desc    Get dashboard statistics for admin
 * @route   GET /api/admin/stats
 * @access  Private/Admin
 */
exports.getStats = async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    
    // Get user statistics
    const totalUsers = await User.countDocuments();
    const newUsers = await User.countDocuments({
      createdAt: { $gte: oneMonthAgo }
    });
    
    // Users by role distribution
    const usersByRole = await User.aggregate([
      { $group: { _id: "$role", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Users by subscription type
    const usersBySubscription = await User.aggregate([
      { $group: { _id: "$subscription.plan_name", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Capsule statistics
    const totalCapsules = await Capsule.countDocuments();
    const publicCapsules = await Capsule.countDocuments({ isPublic: true });
    const newCapsules = await Capsule.countDocuments({
      createdAt: { $gte: oneMonthAgo }
    });
    
    // Capsules created per day (last 30 days)
    const capsulesByDay = await Capsule.aggregate([
      { 
        $match: { 
          createdAt: { $gte: oneMonthAgo } 
        } 
      },
      {
        $group: {
          _id: { 
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }, 
            day: { $dayOfMonth: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
    ]);
    
    // Format the daily data for charting
    const dailyCapsuleData = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const day = date.getDate();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      
      const dataPoint = capsulesByDay.find(item => 
        item._id.day === day && 
        item._id.month === month && 
        item._id.year === year
      );
      
      dailyCapsuleData.unshift({
        date: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
        count: dataPoint ? dataPoint.count : 0
      });
    }
    
    // User registrations per month (last 6 months)
    const usersByMonth = await User.aggregate([
      { 
        $match: { 
          createdAt: { $gte: sixMonthsAgo } 
        } 
      },
      {
        $group: {
          _id: { 
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);
    
    // Format the monthly data for charting
    const monthlyUserData = [];
    for (let i = 0; i < 6; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      
      const dataPoint = usersByMonth.find(item => 
        item._id.month === month && 
        item._id.year === year
      );
      
      monthlyUserData.unshift({
        month: `${year}-${month.toString().padStart(2, '0')}`,
        count: dataPoint ? dataPoint.count : 0
      });
    }
    
    // Most active users (by capsule count)
    const mostActiveUsers = await User.find()
      .sort({ capsuleCount: -1 })
      .limit(10)
      .select('name email profilePicture capsuleCount subscription role');
    
    // Active user sessions (mock data - would be implemented with a real session tracking system)
    // This would typically come from a Redis store or similar for real-time tracking
    const activeSessionCount = Math.floor(Math.random() * 50) + 10; // Placeholder
    
    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          new: newUsers,
          byRole: usersByRole,
          bySubscription: usersBySubscription,
          monthlyTrend: monthlyUserData,
          mostActive: mostActiveUsers
        },
        capsules: {
          total: totalCapsules,
          public: publicCapsules,
          new: newCapsules,
          dailyTrend: dailyCapsuleData
        },
        activeSessions: {
          current: activeSessionCount,
          peak: Math.floor(activeSessionCount * 1.5)
        },
        systemStatus: {
          healthy: true,
          errorRate: 0.2, // Percentage error rate (mock)
          avgResponseTime: 120 // ms (mock)
        }
      }
    });
  } catch (error) {
    logger.error('Error retrieving admin stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve admin statistics',
      error: error.message
    });
  }
};

/**
 * @desc    Get all users with filtering, pagination and search
 * @route   GET /api/admin/users
 * @access  Private/Admin
 */
exports.getUsers = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      role, 
      subscription,
      verified,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    // Build filter object
    const filter = {};
    
    // Add search filter (search by name or email)
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Add role filter
    if (role) {
      filter.role = role;
    }
    
    // Add subscription filter
    if (subscription) {
      filter['subscription.plan_name'] = subscription;
    }
    
    // Add verified filter
    if (verified !== undefined) {
      filter.verified = verified === 'true';
    }
    
    // Determine sort direction
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    // Calculate pagination values
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get paginated users
    const users = await User.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-password -verificationToken -passwordResetToken -passwordResetExpires');
    
    // Get total count for pagination
    const total = await User.countDocuments(filter);
    
    res.json({
      success: true,
      data: users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Error retrieving users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users',
      error: error.message
    });
  }
};

/**
 * @desc    Update user role
 * @route   PUT /api/admin/users/:id/role
 * @access  Private/HeadAdmin for admin role changes, Private/Admin for others
 */
exports.updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    // Verify valid role
    const validRoles = ['user', 'moderator', 'content_curator', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }
    
    // Find user
    let user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Special protection for head admin (abdmosh2000@gmail.com)
    if (user.email === 'abdmosh2000@gmail.com') {
      return res.status(403).json({
        success: false,
        message: 'Cannot modify head admin role'
      });
    }
    
    // Special check: Only head admin can promote to admin role
    if (role === 'admin' && 
        !req.user.permissions.includes('super_admin')) {
      return res.status(403).json({
        success: false,
        message: 'Only head admin can promote users to admin role'
      });
    }
    
    // Update user role
    user.role = role;
    
    // For admin role, add basic admin permissions
    if (role === 'admin') {
      user.permissions = ['manage_users', 'manage_content', 'view_stats'];
    } 
    // For moderator, set moderation permissions
    else if (role === 'moderator') {
      user.permissions = ['manage_content', 'approve_capsules'];
    }
    // For content curator
    else if (role === 'content_curator') {
      user.permissions = ['curate_content', 'feature_capsules'];
    }
    // For regular users, clear permissions
    else {
      user.permissions = [];
    }
    
    await user.save();
    
    // Send email notification about role change
    try {
      await emailService.sendRoleChangeEmail(user.email, user.name, role);
    } catch (emailError) {
      logger.error('Failed to send role change email:', emailError);
      // Continue even if email fails
    }
    
    res.json({
      success: true,
      message: `User role updated to ${role}`,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions
      }
    });
  } catch (error) {
    logger.error('Error updating user role:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user role',
      error: error.message
    });
  }
};

/**
 * @desc    Delete a user
 * @route   DELETE /api/admin/users/:id
 * @access  Private/Admin
 */
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Protect special users
    if (user.email === 'abdmosh2000@gmail.com') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete head admin account'
      });
    }
    
    // Delete user's capsules or handle them - for example:
    // await Capsule.deleteMany({ user: id });
    // Or update them to be owned by an admin/system account
    
    // Delete the user
    await user.remove();
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
};

/**
 * @desc    Manually verify user email
 * @route   PUT /api/admin/users/:id/verify
 * @access  Private/Admin
 */
exports.verifyUserEmail = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find user
    let user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Update verification status
    user.verified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    
    await user.save();
    
    // Send notification email
    try {
      await emailService.sendAdminVerificationEmail(user.email, user.name);
    } catch (emailError) {
      logger.error('Failed to send admin verification email:', emailError);
      // Continue even if email fails
    }
    
    res.json({
      success: true,
      message: 'User email verified successfully',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        verified: user.verified
      }
    });
  } catch (error) {
    logger.error('Error verifying user email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify user email',
      error: error.message
    });
  }
};

/**
 * @desc    Manage subscription plans
 * @route   GET /api/admin/subscriptions
 * @access  Private/Admin
 */
exports.getSubscriptionPlans = async (req, res) => {
  try {
    // This would typically come from a database
    // For now using static data
    const plans = [
      {
        id: 'free',
        name: 'Free',
        price: 0,
        features: ['Basic access', '3 capsules per month', 'Standard support'],
        active: true,
        limits: {
          capsules: 3,
          storage: 50, // MB
          recipients: 5
        }
      },
      {
        id: 'premium',
        name: 'Premium',
        price: 9.99,
        features: [
          'Unlimited capsules',
          'Priority support',
          'Advanced analytics',
          'Custom themes'
        ],
        active: true,
        limits: {
          capsules: -1, // unlimited
          storage: 500, // MB
          recipients: 20
        }
      },
      {
        id: 'vip',
        name: 'VIP',
        price: 19.99,
        features: [
          'All Premium features',
          'Dedicated support',
          'API access',
          'White-label options',
          'Team collaboration'
        ],
        active: true,
        limits: {
          capsules: -1, // unlimited
          storage: 2000, // MB
          recipients: -1 // unlimited
        }
      }
    ];
    
    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    logger.error('Error retrieving subscription plans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve subscription plans',
      error: error.message
    });
  }
};

/**
 * @desc    Update subscription plan
 * @route   PUT /api/admin/subscriptions/:id
 * @access  Private/Admin
 */
exports.updateSubscriptionPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, features, active, limits } = req.body;
    
    // In a real application, this would update the plan in the database
    // For this example, we'll return a mock success response
    
    res.json({
      success: true,
      message: 'Subscription plan updated successfully',
      data: {
        id,
        name,
        price,
        features,
        active,
        limits,
        updatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error updating subscription plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update subscription plan',
      error: error.message
    });
  }
};

/**
 * @desc    Grant gift subscription to user
 * @route   POST /api/admin/users/:id/gift-subscription
 * @access  Private/Admin
 */
exports.giftSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { subscriptionType, durationMonths, message } = req.body;
    
    // Validate input
    if (!['premium', 'vip', 'lifetime'].includes(subscriptionType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription type'
      });
    }
    
    if (!durationMonths || durationMonths < 1 || durationMonths > 12) {
      return res.status(400).json({
        success: false,
        message: 'Duration must be between 1 and 12 months'
      });
    }
    
    // Find user initially
    let user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + durationMonths);
    
    // Prepare the new subscription data
    const now = new Date();
    const isLifetime = subscriptionType === 'vip' || subscriptionType === 'lifetime';
    
    // Create the subscription object
    const subscriptionData = {
        plan_name: isLifetime ? 'Lifetime' : subscriptionType.charAt(0).toUpperCase() + subscriptionType.slice(1),
        subscribed_at: now,
        payment_method: 'Manual',
        status: isLifetime ? 'lifetime' : 'active',
        expiry_date: isLifetime ? null : expiresAt
    };
    
    // Update subscription using findByIdAndUpdate to avoid object property issues
    await User.findByIdAndUpdate(
        user._id,
        { $set: { subscription: subscriptionData } },
        { runValidators: false }
    );
    
    // Re-fetch the user to get the updated data
    user = await User.findById(id);
    
    // Add transaction record
    if (!user.paymentDetails) {
      user.paymentDetails = { transactions: [] };
    }
    
    user.paymentDetails.transactions.push({
      plan: isLifetime ? 'Lifetime' : subscriptionType.charAt(0).toUpperCase() + subscriptionType.slice(1),
      orderID: `GIFT-${Date.now()}`,
      amount: 0,
      currency: 'USD',
      date: new Date(),
      status: 'completed',
      notes: `Gift subscription from admin: ${req.user.name}`
    });
    
    await user.save();
    
    // Send notification email
    try {
      await emailService.sendGiftSubscriptionEmail(
        user.email, 
        user.name, 
        subscriptionType, 
        durationMonths,
        message || 'Enjoy your gift subscription!'
      );
    } catch (emailError) {
      logger.error('Failed to send gift subscription email:', emailError);
      // Continue even if email fails
    }
    
    res.json({
      success: true,
      message: `Gift ${subscriptionType} subscription granted for ${durationMonths} months`,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          subscription: user.subscription
        },
        gift: {
          type: subscriptionType,
          durationMonths,
          expiresAt: isLifetime ? null : expiresAt
        }
      }
    });
  } catch (error) {
    logger.error('Error granting gift subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to grant gift subscription',
      error: error.message
    });
  }
};

/**
 * @desc    Get system logs
 * @route   GET /api/admin/logs
 * @access  Private/Admin
 */
exports.getSystemLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20, level, startDate, endDate } = req.query;
    
    // In a real application, this would query logs from a database or log file
    // For this example, we'll return mock log data
    
    // Mock logs
    const mockLogs = Array.from({ length: 50 }, (_, i) => ({
      id: `log-${i + 1}`,
      timestamp: new Date(Date.now() - i * 3600000).toISOString(),
      level: ['info', 'warn', 'error'][Math.floor(Math.random() * 3)],
      message: `Log message example ${i + 1}`,
      source: ['server', 'api', 'database', 'auth'][Math.floor(Math.random() * 4)],
      details: { userAgent: 'Mozilla/5.0...', ip: '192.168.1.1' }
    }));
    
    // Filter by level if specified
    let filteredLogs = mockLogs;
    if (level) {
      filteredLogs = mockLogs.filter(log => log.level === level);
    }
    
    // Filter by date range if specified
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      filteredLogs = filteredLogs.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate >= start && logDate <= end;
      });
    }
    
    // Paginate results
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedLogs = filteredLogs.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      data: paginatedLogs,
      pagination: {
        total: filteredLogs.length,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(filteredLogs.length / limit)
      }
    });
  } catch (error) {
    logger.error('Error retrieving system logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve system logs',
      error: error.message
    });
  }
};

/**
 * @desc    Get dashboard summary for admin overview
 * @route   GET /api/admin/dashboard-summary
 * @access  Private/Admin
 */
exports.getDashboardSummary = async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const oneDayAgo = new Date(today);
    oneDayAgo.setDate(today.getDate() - 1);
    
    const lastMonth = new Date(now);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    // Get user statistics
    const totalUsers = await User.countDocuments();
    const newUsersToday = await User.countDocuments({
      createdAt: { $gte: oneDayAgo }
    });

    // Get active users (mock - in production this would come from a session store)
    const activeNow = Math.floor(Math.random() * 50) + 10;
    
    // Capsule statistics
    const totalCapsules = await Capsule.countDocuments();
    const publicCapsules = await Capsule.countDocuments({ isPublic: true });
    const capsulesCreatedToday = await Capsule.countDocuments({
      createdAt: { $gte: oneDayAgo }
    });
    
    // Revenue information - in production would calculate from real transaction data
    // Get all paid users
    const premiumUsers = await User.countDocuments({ 'subscription.plan_name': 'Premium' });
    const vipUsers = await User.countDocuments({ 'subscription.plan_name': 'Lifetime' });
    
    // Calculate monthly revenue (mockup - in production would use real transaction data)
    const premiumPrice = 9.99;
    const vipPrice = 24.99;
    const monthlyRevenue = (premiumUsers * premiumPrice) + (vipUsers * vipPrice);
    
    // Calculate total revenue to date (mockup)
    // In production this would be calculated from the transactions collection
    const avgSubscriptionMonths = 3.5; // average user has been subscribed for 3.5 months
    const totalRevenue = monthlyRevenue * avgSubscriptionMonths;
    
    // Calculate conversion rate
    const conversionRate = totalUsers > 0 ? ((premiumUsers + vipUsers) / totalUsers) * 100 : 0;
    
    // System health metrics (mockup - in production would use real metrics)
    const systemUptime = 99.95; // percentage
    const avgResponseTime = Math.floor(Math.random() * 50) + 200; // between 200-250ms
    const errorRate = (Math.random() * 0.8).toFixed(2); // between 0-0.8%
    
    // Return dashboard summary
    res.json({
      users: {
        total: totalUsers,
        newToday: newUsersToday,
        activeNow: activeNow
      },
      capsules: {
        total: totalCapsules,
        public: publicCapsules,
        createdToday: capsulesCreatedToday
      },
      revenue: {
        total: totalRevenue,
        lastMonth: monthlyRevenue,
        conversionRate: conversionRate
      },
      system: {
        responseTime: avgResponseTime,
        errorRate: parseFloat(errorRate),
        uptime: systemUptime
      }
    });
  } catch (error) {
    logger.error('Error retrieving dashboard summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard summary',
      error: error.message
    });
  }
};

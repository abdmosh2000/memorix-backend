const express = require('express');
const router = express.Router();
const statController = require('../controllers/statController');
const { protect, admin } = require('../middleware/authMiddleware');

// Public route to get basic stats
router.get('/', statController.getStats);

// Admin-only route to refresh payment statistics
router.get('/refresh-payment', protect, admin, statController.refreshPaymentStats);

module.exports = router;

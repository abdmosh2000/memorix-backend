const express = require('express');
const router = express.Router();
const { checkReleasedCapsules } = require('../controllers/notificationController');
const { protect, admin } = require('../middleware/authMiddleware');

// Check for released capsules and notify users
router.get('/check-releases', protect, admin, checkReleasedCapsules);

module.exports = router;

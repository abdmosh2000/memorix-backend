const express = require('express');
const router = express.Router();
const {
    createCapsule,
    getCapsulesByUser,
    getPublicCapsules,
    getSharedCapsules
} = require('../controllers/capsuleController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createCapsule); // Protected route
router.get('/user/:userId', protect, getCapsulesByUser); // Protected route
router.get('/shared', protect, getSharedCapsules); // Get capsules shared with the current user
router.get('/public', getPublicCapsules);

module.exports = router;

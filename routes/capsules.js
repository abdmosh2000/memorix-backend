const express = require('express');
const router = express.Router();
const {
    createCapsule,
    getCapsulesByUser,
    getPublicCapsules,
    getSharedCapsules,
    getCapsuleById
} = require('../controllers/capsuleController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createCapsule); // Protected route
router.get('/user/:userId', protect, getCapsulesByUser); // Protected route
router.get('/shared', protect, getSharedCapsules); // Get capsules shared with the current user
router.get('/public', getPublicCapsules);
router.get('/:id', protect, getCapsuleById); // Get a specific capsule by ID

module.exports = router;

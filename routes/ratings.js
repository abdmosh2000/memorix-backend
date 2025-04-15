const express = require('express');
const router = express.Router();
const { getRatings, createRating } = require('../controllers/ratingController');
const { protect } = require('../middleware/authMiddleware');

// Public route to get all ratings
router.get('/', getRatings);

// Protected route to create a rating
router.post('/', protect, createRating);

module.exports = router;

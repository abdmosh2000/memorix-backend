const express = require('express');
const router = express.Router();
const { getMediaById } = require('../controllers/mediaController');

// Public route with token-based authentication
router.get('/:id/:mediaType', getMediaById);

module.exports = router;

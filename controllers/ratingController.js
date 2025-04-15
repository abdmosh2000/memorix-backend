const Rating = require('../models/Rating');
const Capsule = require('../models/Capsule');

// @desc    Get all ratings
// @route   GET /api/ratings
// @access  Public
const getRatings = async (req, res) => {
    try {
        const ratings = await Rating.find();
        res.json(ratings);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// @desc    Rate a capsule or app
// @route   POST /api/ratings
// @access  Private
const createRating = async (req, res) => {
    try {
        // Check if this is an app rating or capsule rating
        if (req.body.ux && req.body.design && req.body.usability && req.body.security) {
            // App rating
            const { ux, design, usability, security, feedback } = req.body;
            
            // Create new app rating
            const appRating = new Rating({
                user: req.user.id,
                ux,
                design,
                usability,
                security,
                feedback
            });
            
            await appRating.save();
            return res.status(201).json(appRating);
            
        } else if (req.body.capsuleId) {
            // Capsule rating
            const { capsuleId, rating } = req.body;
            
            if (!rating) {
                return res.status(400).json({ message: 'Rating is required' });
            }
            
            // Check if rating is valid (between 1 and 5)
            if (rating < 1 || rating > 5) {
                return res.status(400).json({ message: 'Rating must be between 1 and 5' });
            }
            
            // Check if capsule exists
            const capsule = await Capsule.findById(capsuleId);
            if (!capsule) {
                return res.status(404).json({ message: 'Capsule not found' });
            }
            
            // Check if user has already rated this capsule
            let userRating = await Rating.findOne({ 
                user: req.user.id,
                capsule: capsuleId
            });
            
            if (userRating) {
                // Update existing rating
                const oldRating = userRating.value;
                userRating.value = rating;
                await userRating.save();
                
                // Update capsule rating stats
                capsule.totalRatings = capsule.totalRatings - oldRating + rating;
                await capsule.save();
                
                return res.json(userRating);
            }
            
            // Create new capsule rating
            userRating = new Rating({
                user: req.user.id,
                capsule: capsuleId,
                value: rating
            });
            
            await userRating.save();
            
            // Update capsule rating stats
            if (!capsule.totalRatings) capsule.totalRatings = 0;
            if (!capsule.ratingCount) capsule.ratingCount = 0;
            
            capsule.totalRatings += rating;
            capsule.ratingCount += 1;
            await capsule.save();
            
            return res.status(201).json(userRating);
        } else {
            return res.status(400).json({ message: 'Invalid rating data provided' });
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

module.exports = { getRatings, createRating };

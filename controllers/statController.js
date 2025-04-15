const Stat = require('../models/Stat');

// @desc    Get all stats
// @route   GET /api/stats
// @access  Public
const getStats = async (req, res) => {
    try {
        let stats = await Stat.findOne();

        // If no stats document exists, create one
        if (!stats) {
            stats = new Stat();
            await stats.save();
        }

        res.json(stats);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

module.exports = { getStats };
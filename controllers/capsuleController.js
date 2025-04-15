const Capsule = require('../models/Capsule');
const User = require('../models/User');

// @desc    Create a new capsule
// @route   POST /api/capsules
// @access  Private
const createCapsule = async (req, res) => {
    const { title, content, releaseDate, isPublic, recipients, mediaType, mediaContent } = req.body;

    try {
        // Get user and check subscription level
        const user = await User.findById(req.user.id);
        
        // Check if user has reached their capsule limit based on subscription
        if (user.subscription === 'free' && user.capsuleCount >= 1) {
            return res.status(403).json({ 
                message: 'Free users can only create one capsule. Please upgrade your subscription.',
                redirectTo: '/pricing'
            });
        }
        
        // Format recipients array if it exists
        let formattedRecipients = [];
        if (recipients && recipients.length > 0) {
            formattedRecipients = recipients.map(email => ({
                email: email.trim().toLowerCase(),
                hasAccessed: false,
                accessDate: null
            }));
        }

        const capsule = new Capsule({
            title,
            content,
            releaseDate,
            isPublic,
            recipients: formattedRecipients,
            mediaType,
            mediaContent,
            user: req.user.id
        });

        await capsule.save();
        
        // Increment user's capsule count
        user.capsuleCount += 1;
        await user.save();

        // In a production app, we would send emails to all recipients here
        // For example:
        // sendCapsuleInvitations(formattedRecipients, capsule.id, req.user.name);

        res.status(201).json(capsule);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// @desc    Get capsules by user
// @route   GET /api/capsules/user/:userId
// @access  Private
const getCapsulesByUser = async (req, res) => {
    try {
        // Get all capsules created by the user (regardless of release date)
        // Creators can see all of their own capsules
        const ownedCapsules = await Capsule.find({ user: req.params.userId });
        
        // Get only released capsules shared with the user
        // Recipients can only see shared capsules whose release date has passed
        const currentDate = new Date();
        const sharedCapsules = await Capsule.find({
            'recipients.email': req.user.email,
            releaseDate: { $lte: currentDate }
        });
        
        // Combine both sets of capsules
        const allCapsules = [...ownedCapsules, ...sharedCapsules];
        
        res.json(allCapsules);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// @desc    Get public capsules
// @route   GET /api/capsules/public
// @access  Public
const getPublicCapsules = async (req, res) => {
    try {
        // Only return public capsules whose release date has passed
        const currentDate = new Date();
        const capsules = await Capsule.find({ 
            isPublic: true,
            releaseDate: { $lte: currentDate }
        }).populate('user', 'name');
        
        res.json(capsules);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

const getSharedCapsules = async (req, res) => {
    try {
        // Find released capsules where the user's email is in the recipients list
        const currentDate = new Date();
        const sharedCapsules = await Capsule.find({
            'recipients.email': req.user.email,
            releaseDate: { $lte: currentDate }
        }).populate('user', 'name email');
        
        // Update hasAccessed status for the recipient
        for (const capsule of sharedCapsules) {
            const recipientIndex = capsule.recipients.findIndex(r => 
                r.email === req.user.email && !r.hasAccessed
            );
            
            if (recipientIndex !== -1) {
                capsule.recipients[recipientIndex].hasAccessed = true;
                capsule.recipients[recipientIndex].accessDate = new Date();
                await capsule.save();
            }
        }
        
        res.json(sharedCapsules);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

module.exports = { createCapsule, getCapsulesByUser, getPublicCapsules, getSharedCapsules };

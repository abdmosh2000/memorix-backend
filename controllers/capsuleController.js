const Capsule = require('../models/Capsule');
const User = require('../models/User');
const encryption = require('../utils/encryption');

// @desc    Create a new capsule
// @route   POST /api/capsules
// @access  Private
const createCapsule = async (req, res) => {
    const { title, content, releaseDate, isPublic, recipients, mediaType, mediaContent } = req.body;

    try {
        // Get user and check subscription level
        const user = await User.findById(req.user.id);
        
        // Verify that the user is verified
        if (!user.verified) {
            return res.status(403).json({ 
                message: 'Please verify your email address before creating a capsule',
                verified: false
            });
        }
        
        // Ensure user has a valid subscription object
        if (typeof user.subscription === 'string') {
            try {
                // Get the old subscription value before updating
                const oldSubscriptionType = user.subscription;
                
                // Create a new subscription object with the correct nested structure
                const plan_name = oldSubscriptionType.charAt(0).toUpperCase() + oldSubscriptionType.slice(1);
                const status = oldSubscriptionType === 'vip' ? 'lifetime' : 'active';
                const expiry_date = oldSubscriptionType === 'free' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days for non-free
                
                // Set individual properties to match the nested structure in the User model
                user.set('subscription', undefined); // Clear existing value
                user.subscription = {}; // Initialize as empty object
                
                // Set the properties according to the schema structure
                user.subscription.plan_name = plan_name;
                user.subscription.subscribed_at = new Date();
                user.subscription.payment_method = 'None';
                user.subscription.status = status;
                user.subscription.expiry_date = expiry_date;
                
                // Save the user with the migrated subscription data
                await user.save();
                console.log(`Migrated user ${user.email} from old subscription format to new format during capsule creation`);
            } catch (migrationError) {
                console.error('Error migrating subscription format:', migrationError, migrationError.stack);
                // Create a default subscription object if migration fails
                try {
                    // Set individual properties to match the nested structure in the User model
                    user.set('subscription', undefined); // Clear existing value
                    user.subscription = {}; // Initialize as empty object
                    
                    // Set the properties according to the schema structure
                    user.subscription.plan_name = 'Free';
                    user.subscription.subscribed_at = new Date();
                    user.subscription.payment_method = 'None';
                    user.subscription.status = 'active';
                    user.subscription.expiry_date = null;
                    
                    await user.save();
                    console.log(`Created default subscription after migration failure for ${user.email}`);
                } catch(err) {
                    console.error('Failed to create default subscription:', err);
                    return res.status(500).json({ message: 'Server error during account migration' });
                }
            }
        }
        
        // Safely extract subscription properties, accounting for nested structure
        const plan_name = user.subscription && user.subscription.plan_name ? user.subscription.plan_name : 'Free';
        const status = user.subscription && user.subscription.status ? user.subscription.status : 'active';

        // Check if user has reached their capsule limit based on subscription plan
        if (plan_name === 'Free' && user.capsuleCount >= 1) {
            return res.status(403).json({ 
                message: 'Free users can only create one capsule. Please upgrade your subscription.',
                redirectTo: '/pricing'
            });
        }
        
        // Check if subscription is expired
        if (status === 'expired' && plan_name !== 'Free') {
            return res.status(403).json({
                message: 'Your subscription has expired. Please renew to continue creating capsules.',
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

        // Send email notifications to recipients
        if (formattedRecipients && formattedRecipients.length > 0) {
            const emailService = require('../utils/emailService');
            emailService.sendCapsuleInvitation(
                formattedRecipients.map(r => r.email), 
                capsule._id, 
                title, 
                user.name, 
                releaseDate
            ).catch(err => {
                console.error('Error sending capsule invitation emails:', err);
                // Continue execution even if emails fail
            });
        }

        // Return a sanitized version (without encrypted content)
        res.status(201).json(capsule.safeVersion);
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
        const ownedCapsules = await Capsule.find({ user: req.params.userId })
            .populate('user', 'name email');
        
        // Decrypt content for owned capsules
        const decryptedOwnedCapsules = ownedCapsules.map(capsule => capsule.safeVersion);
        
        // Get only released capsules shared with the user
        // Recipients can only see shared capsules whose release date has passed
        const currentDate = new Date();
        const sharedCapsules = await Capsule.find({
            'recipients.email': req.user.email,
            releaseDate: { $lte: currentDate }
        });
        
        // Decrypt content for shared capsules
        const decryptedSharedCapsules = sharedCapsules.map(capsule => capsule.safeVersion);
        
        // Combine both sets of capsules
        const allCapsules = [...decryptedOwnedCapsules, ...decryptedSharedCapsules];
        
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
        
        // Return decrypted content for public capsules
        const safePublicCapsules = capsules.map(capsule => capsule.safeVersion);
        res.json(safePublicCapsules);
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
        
        // Return decrypted content for shared capsules
        const safeSharedCapsules = sharedCapsules.map(capsule => capsule.safeVersion);
        res.json(safeSharedCapsules);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// @desc    Get single capsule by ID
// @route   GET /api/capsules/:id
// @access  Private/Mixed (depends on capsule visibility)
const getCapsuleById = async (req, res) => {
    try {
        const capsule = await Capsule.findById(req.params.id)
            .populate('user', 'name email');
        
        if (!capsule) {
            return res.status(404).json({ message: 'Capsule not found' });
        }
        
        const currentDate = new Date();
        const isReleased = currentDate >= capsule.releaseDate;
        
        // Check if user is authorized to view this capsule
        const isOwner = capsule.user._id.toString() === req.user.id;
        const isRecipient = capsule.recipients.some(r => r.email === req.user.email);
        const isPublicAndReleased = capsule.isPublic && isReleased;
        
        if (!isOwner && !isRecipient && !isPublicAndReleased) {
            return res.status(403).json({ message: 'You are not authorized to view this capsule' });
        }
        
        // If user is a recipient, mark as accessed
        if (isRecipient) {
            const recipientIndex = capsule.recipients.findIndex(r => 
                r.email === req.user.email && !r.hasAccessed
            );
            
            if (recipientIndex !== -1) {
                capsule.recipients[recipientIndex].hasAccessed = true;
                capsule.recipients[recipientIndex].accessDate = new Date();
                await capsule.save();
            }
        }
        
        // Return a safe version with decrypted content
        return res.json(capsule.safeVersion);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { 
    createCapsule, 
    getCapsulesByUser, 
    getPublicCapsules, 
    getSharedCapsules,
    getCapsuleById
};

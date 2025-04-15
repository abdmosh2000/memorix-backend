const Capsule = require('../models/Capsule');
const User = require('../models/User');
const { notifyCapsuleCreator, notifyCapsuleRecipient } = require('../utils/notifications');

// @desc    Check for capsules that have reached their release date and notify recipients
// @route   GET /api/notifications/check-releases
// @access  Private/Admin
const checkReleasedCapsules = async (req, res) => {
    try {
        const currentDate = new Date();
        
        // Find capsules that have:
        // 1. Reached their release date
        // 2. Not been marked as notified
        const releasedCapsules = await Capsule.find({
            releaseDate: { 
                $lte: currentDate,  // Release date has passed
                $gte: new Date(currentDate.getTime() - 24 * 60 * 60 * 1000) // Within the last 24 hours
            },
            notifiedRecipients: { $ne: true } // Not yet notified
        }).populate('user', 'name email');
        
        if (releasedCapsules.length === 0) {
            return res.json({ message: 'No new capsules to notify' });
        }
        
        // For each released capsule, notify recipients
        for (const capsule of releasedCapsules) {
            // In a real app, this would send actual emails or push notifications
            // For demonstration/development, we'll just log and mark as notified
            
            console.log(`Notifying recipients for capsule: ${capsule.title}`);
            
            // Notify capsule creator
            await notifyCapsuleCreator(
                capsule.user.email, 
                capsule.title, 
                capsule.releaseDate
            );
            
            // Notify all recipients
            for (const recipient of capsule.recipients) {
                await notifyCapsuleRecipient(
                    recipient.email,
                    capsule.title,
                    capsule.user.name,
                    capsule.releaseDate
                );
            }
            
            // Mark capsule as notified
            capsule.notifiedRecipients = true;
            await capsule.save();
        }
        
        res.json({ 
            success: true, 
            count: releasedCapsules.length, 
            message: `Notified recipients for ${releasedCapsules.length} capsules` 
        });
        
    } catch (err) {
        console.error('Error checking released capsules:', err);
        res.status(500).json({ error: 'Server error during notification check' });
    }
};

module.exports = { checkReleasedCapsules };

/**
 * Notification utility functions for the Memorix application.
 * These functions provide a central place for all notification-related logic,
 * making it easy to change notification methods in the future.
 */

/**
 * Send a notification email to a recipient
 * @param {string} email - Recipient's email address
 * @param {string} subject - Email subject
 * @param {string} message - Email message body
 * @returns {Promise<boolean>} - Success status
 */
const sendEmailNotification = async (email, subject, message) => {
    try {
        // This is a placeholder for actual email sending functionality
        // In a production environment, you would integrate with an email service
        // such as SendGrid, Mailgun, AWS SES, etc.
        
        console.log('SENDING EMAIL:');
        console.log(`To: ${email}`);
        console.log(`Subject: ${subject}`);
        console.log(`Message: ${message}`);
        
        // Simulate successful sending
        return true;
    } catch (error) {
        console.error('Error sending email notification:', error);
        return false;
    }
};

/**
 * Send a notification about a capsule release to the capsule creator
 * @param {string} email - Creator's email address
 * @param {string} capsuleTitle - Title of the capsule
 * @param {Date} releaseDate - Release date of the capsule
 * @returns {Promise<boolean>} - Success status
 */
const notifyCapsuleCreator = async (email, capsuleTitle, releaseDate) => {
    const subject = 'Your Memorix Capsule has been released';
    const message = `
        Your time capsule "${capsuleTitle}" has been released on ${releaseDate.toLocaleString()}.
        
        Recipients can now view the contents of your capsule.
        
        Thank you for using Memorix!
    `;
    
    return await sendEmailNotification(email, subject, message);
};

/**
 * Send a notification to a capsule recipient
 * @param {string} recipientEmail - Recipient's email address
 * @param {string} capsuleTitle - Title of the capsule
 * @param {string} creatorName - Name of the capsule creator
 * @param {Date} releaseDate - Release date of the capsule
 * @returns {Promise<boolean>} - Success status
 */
const notifyCapsuleRecipient = async (recipientEmail, capsuleTitle, creatorName, releaseDate) => {
    const subject = 'A Memorix Capsule has been shared with you';
    const message = `
        A time capsule "${capsuleTitle}" created by ${creatorName} has been shared with you.
        The capsule was set to be released on ${releaseDate.toLocaleString()} and is now available for you to view.
        
        Log in to your Memorix account to view this capsule.
        
        Thank you for using Memorix!
    `;
    
    return await sendEmailNotification(recipientEmail, subject, message);
};

module.exports = {
    sendEmailNotification,
    notifyCapsuleCreator,
    notifyCapsuleRecipient
};

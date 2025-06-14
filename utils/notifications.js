/**
 * Notification utility functions for the Memorix application.
 * These functions provide a central place for all notification-related logic,
 * making it easy to change notification methods in the future.
 */
const emailService = require('./emailService');

/**
 * Send a notification about a capsule release to the capsule creator
 * @param {string} email - Creator's email address
 * @param {string} capsuleTitle - Title of the capsule
 * @param {Date} releaseDate - Release date of the capsule
 * @param {string} content - Decrypted content of the capsule
 * @param {string} capsuleId - ID of the capsule
 * @param {string} mediaType - Type of media content (if any)
 * @returns {Promise<boolean>} - Success status
 */
const notifyCapsuleCreator = async (email, capsuleTitle, releaseDate, content, capsuleId, mediaType) => {
  const subject = 'Your Memorix Capsule has been released';
    
  try {
    // Use the emailService function with capsuleId for secure media access
    await emailService.sendCapsuleReleasedNotification(
      email, 
      subject,
      capsuleTitle,
      null, // No creator name needed for creator notification
      releaseDate,
      content,
      capsuleId, // Pass the capsule ID instead of media content
      mediaType,
      true // This is the creator notification
    );
    return true;
  } catch (error) {
    console.error('Error sending capsule release notification to creator:', error);
    return false;
  }
};

/**
 * Send a notification to a capsule recipient
 * @param {string} recipientEmail - Recipient's email address
 * @param {string} capsuleTitle - Title of the capsule
 * @param {string} creatorName - Name of the capsule creator
 * @param {Date} releaseDate - Release date of the capsule
 * @param {string} content - Decrypted content of the capsule
 * @param {string} capsuleId - ID of the capsule
 * @param {string} mediaType - Type of media content (if any)
 * @returns {Promise<boolean>} - Success status
 */
const notifyCapsuleRecipient = async (recipientEmail, capsuleTitle, creatorName, releaseDate, content, capsuleId, mediaType) => {
  const subject = 'A Memorix Capsule has been shared with you';
    
  try {
    // Use the emailService function with capsuleId for secure media access
    await emailService.sendCapsuleReleasedNotification(
      recipientEmail, 
      subject,
      capsuleTitle,
      creatorName, 
      releaseDate,
      content,
      capsuleId, // Pass the capsule ID instead of media content
      mediaType,
      false // This is not the creator notification
    );
    return true;
  } catch (error) {
    console.error('Error sending capsule release notification to recipient:', error);
    return false;
  }
};

module.exports = {
  notifyCapsuleCreator,
  notifyCapsuleRecipient
};

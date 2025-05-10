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
 * @param {string} mediaContent - Optional media content (base64 encoded)
 * @param {string} mediaType - Type of media content
 * @returns {Promise<boolean>} - Success status
 */
const notifyCapsuleCreator = async (email, capsuleTitle, releaseDate, content, mediaContent, mediaType) => {
  const subject = 'Your Memorix Capsule has been released';
    
  try {
    // Use the new emailService function to send formatted HTML email with content
    await emailService.sendCapsuleReleasedNotification(
      email, 
      subject,
      capsuleTitle,
      null, // No creator name needed for creator notification
      releaseDate,
      content,
      mediaContent, // Pass the media content to the email service
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
 * @param {string} mediaContent - Optional media content (base64 encoded)
 * @param {string} mediaType - Type of media content
 * @returns {Promise<boolean>} - Success status
 */
const notifyCapsuleRecipient = async (recipientEmail, capsuleTitle, creatorName, releaseDate, content, mediaContent, mediaType) => {
  const subject = 'A Memorix Capsule has been shared with you';
    
  try {
    // Use the new emailService function to send formatted HTML email with content
    await emailService.sendCapsuleReleasedNotification(
      recipientEmail, 
      subject,
      capsuleTitle,
      creatorName, 
      releaseDate,
      content,
      mediaContent, // Pass the media content to the email service
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

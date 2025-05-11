/* eslint-disable */
// Script to check for released capsules and notify recipients
// This script should be run periodically, e.g. using a cron job

require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config/config');
const { connectDB } = require('../config/db');
const Capsule = require('../models/Capsule');
const User = require('../models/User');
const { notifyCapsuleCreator, notifyCapsuleRecipient } = require('../utils/notifications');

console.log(`👉 Starting checkReleasedCapsules.js script in ${config.server.env} mode`);

/**
 * Custom exit handler to safely exit the script
 * This avoids ESLint's no-process-exit rule
 */
function safeExit(code) {
  // Using setTimeout allows any pending console logs to complete
  setTimeout(() => {
    process.exit(code);
  }, 0);
}

async function checkReleasedCapsules() {
  console.log('Starting check for released capsules...');
    
  try {
    // Connect to database
    await connectDB();
    console.log('Connected to database');
        
    const currentDate = new Date();
        
    // Find capsules that have:
    // 1. Reached their release date
    // 2. Not been marked as notified
    // Note: We check ALL capsules that haven't been notified, not just those released in the last 24 hours
    const releasedCapsules = await Capsule.find({
      releaseDate: { 
        $lte: currentDate  // Release date has passed (no time limitation)
      },
      notifiedRecipients: { $ne: true } // Not yet notified
    }).populate('user', 'name email');
        
    console.log(`Found ${releasedCapsules.length} released capsules to notify`);
        
    if (releasedCapsules.length === 0) {
      console.log('No new capsules to notify');
      await mongoose.disconnect();
      console.log('Disconnected from database (early exit)');
      safeExit(0);
      return; // This return is for code clarity, though it won't be reached
    }
    
    // Mark all capsules as notified immediately to prevent duplicate processing
    // This prevents race conditions where another instance of this script runs before
    // individual capsules are marked as notified
    const capsuleIds = releasedCapsules.map(capsule => capsule._id);
    console.log(`Marking ${capsuleIds.length} capsules as notified to prevent duplicate processing`);
    
    try {
      await Capsule.updateMany(
        { _id: { $in: capsuleIds } },
        { $set: { notifiedRecipients: true } }
      );
      console.log('Successfully marked all capsules as notified');
    } catch (updateError) {
      console.error('Error marking capsules as notified:', updateError);
      // Continue processing anyway - we'll still try to send notifications
      // but there's a risk of duplicates if another script instance runs
    }
        
    // For each released capsule, notify recipients
    for (const capsule of releasedCapsules) {
      console.log(`Processing capsule ID ${capsule._id}: "${capsule.title}"`);
            
      // Get the decrypted content of the capsule
      let decryptedContent = '';
      let decryptedMediaContent = null;
            
      try {
        // Get decrypted content if it exists and is encrypted
        if (capsule.content) {
          decryptedContent = capsule.getDecryptedContent();
          console.log(`Content successfully decrypted for capsule ID ${capsule._id}`);
        }
                
        // Get decrypted media content if it exists and is encrypted
        if (capsule.mediaContent) {
          decryptedMediaContent = capsule.getDecryptedMedia();
          
          // If media decryption returns null (invalid format), use the original media content
          if (decryptedMediaContent === null && capsule.mediaContent) {
            console.log(`Media decryption failed for capsule ID ${capsule._id}, using original media content`);
            
            // Check if the media content is already a data URL
            if (capsule.mediaContent.startsWith('data:')) {
              decryptedMediaContent = capsule.mediaContent;
            } else {
              // Try to create a data URL based on the media type
              const mediaTypeMap = {
                'photo': 'image/jpeg',
                'video': 'video/mp4',
                'audio': 'audio/mpeg'
              };
              
              const mimeType = mediaTypeMap[capsule.mediaType] || 'application/octet-stream';
              decryptedMediaContent = `data:${mimeType};base64,${capsule.mediaContent}`;
            }
            
            console.log(`Created data URL for media content with type: ${capsule.mediaType}`);
          }
        }
      } catch (error) {
        console.error(`Error decrypting capsule content for ID ${capsule._id}:`, error);
        decryptedContent = 'Error: Content could not be decrypted properly';
        
        // Even if there's an error, try to use the original media content
        if (capsule.mediaContent) {
          console.log(`Attempting to use original media content after error for capsule ID ${capsule._id}`);
          
          // Check if the media content is already a data URL
          if (capsule.mediaContent.startsWith('data:')) {
            decryptedMediaContent = capsule.mediaContent;
          } else {
            // Try to create a data URL based on the media type
            const mediaTypeMap = {
              'photo': 'image/jpeg',
              'video': 'video/mp4',
              'audio': 'audio/mpeg'
            };
            
            const mimeType = mediaTypeMap[capsule.mediaType] || 'application/octet-stream';
            decryptedMediaContent = `data:${mimeType};base64,${capsule.mediaContent}`;
          }
        }
      }
            
      // Notify capsule creator with improved error handling
      try {
        console.log(`Notifying creator: ${capsule.user.email}`);
        await notifyCapsuleCreator(
          capsule.user.email, 
          capsule.title, 
          capsule.releaseDate,
          decryptedContent,
          capsule._id, // Pass capsule ID instead of decrypted media content
          capsule.mediaType
        );
        console.log('Creator notification sent successfully');
      } catch (creatorError) {
        console.error(`Error notifying creator (${capsule.user.email}):`, creatorError);
        // Continue processing - don't let one email failure stop the process
      }
            
      // Notify all recipients with improved error handling
      if (capsule.recipients && capsule.recipients.length > 0) {
        let successCount = 0;
        let failedCount = 0;
        
        for (const recipient of capsule.recipients) {
          try {
            console.log(`Notifying recipient: ${recipient.email}`);
            await notifyCapsuleRecipient(
              recipient.email,
              capsule.title,
              capsule.user.name,
              capsule.releaseDate,
              decryptedContent,
              capsule._id, // Pass capsule ID instead of decrypted media content
              capsule.mediaType
            );
            console.log(`Successfully sent notification to ${recipient.email}`);
            successCount++;
          } catch (recipientError) {
            console.error(`Error notifying recipient (${recipient.email}):`, recipientError);
            failedCount++;
            // Continue with other recipients
          }
        }
        console.log(`Notification summary: ${successCount} successful, ${failedCount} failed out of ${capsule.recipients.length} recipients`);
      } else {
        console.log('No recipients to notify');
      }
            
      // Mark capsule as notified
      capsule.notifiedRecipients = true;
      await capsule.save();
      console.log(`Marked capsule ${capsule._id} as notified`);
    }
        
    console.log(`Successfully processed ${releasedCapsules.length} released capsules`);
  } catch (error) {
    console.error('Error checking released capsules:', error);
    try {
      await mongoose.disconnect();
      console.log('Disconnected from database (after error)');
    } catch (disconnectError) {
      console.error('Error disconnecting from database:', disconnectError);
    }
    safeExit(1);
    return; // This return is for code clarity, though it won't be reached
  }
    
  // Disconnect from database
  await mongoose.disconnect();
  console.log('Disconnected from database');
  safeExit(0);
}

// Run the function
checkReleasedCapsules();

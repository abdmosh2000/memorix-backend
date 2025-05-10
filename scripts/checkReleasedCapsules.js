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
    const releasedCapsules = await Capsule.find({
      releaseDate: { 
        $lte: currentDate,  // Release date has passed
        $gte: new Date(currentDate.getTime() - 24 * 60 * 60 * 1000) // Within the last 24 hours
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
        }
                
        // Get decrypted media content if it exists and is encrypted
        if (capsule.mediaContent) {
          decryptedMediaContent = capsule.getDecryptedMedia();
        }
      } catch (error) {
        console.error(`Error decrypting capsule content for ID ${capsule._id}:`, error);
        decryptedContent = 'Error: Content could not be decrypted properly';
        decryptedMediaContent = null;
      }
            
      // Notify capsule creator
      console.log(`Notifying creator: ${capsule.user.email}`);
      await notifyCapsuleCreator(
        capsule.user.email, 
        capsule.title, 
        capsule.releaseDate,
        decryptedContent,
        decryptedMediaContent,
        capsule.mediaType
      );
            
      // Notify all recipients
      if (capsule.recipients && capsule.recipients.length > 0) {
        for (const recipient of capsule.recipients) {
          console.log(`Notifying recipient: ${recipient.email}`);
          await notifyCapsuleRecipient(
            recipient.email,
            capsule.title,
            capsule.user.name,
            capsule.releaseDate,
            decryptedContent,
            decryptedMediaContent,
            capsule.mediaType
          );
        }
        console.log(`Notified ${capsule.recipients.length} recipients`);
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

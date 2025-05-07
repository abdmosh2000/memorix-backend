#!/usr/bin/env node

// Script to check for released capsules and notify recipients
// This script should be run periodically, e.g. using a cron job

require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const Capsule = require('../models/Capsule');
const User = require('../models/User');
const { notifyCapsuleCreator, notifyCapsuleRecipient } = require('../utils/notifications');

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
            process.exit(0);
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
        process.exit(1);
    }
    
    // Disconnect from database
    await mongoose.disconnect();
    console.log('Disconnected from database');
    process.exit(0);
}

// Run the function
checkReleasedCapsules();

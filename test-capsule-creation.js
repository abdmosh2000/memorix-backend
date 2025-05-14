/* eslint-disable no-process-exit */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Capsule = require('./models/Capsule');

console.log('Starting subscription handling test without database connection');

// Direct test of the subscription conversion logic - simulated, no actual DB connection
async function runTests() {
  try {
    console.log('Starting test for capsule creation with subscription field');

    // Test 1: Create a user with string subscription to test conversion
    console.log('\nTest 1: Create user with string subscription');
    
    // Generate random email to avoid unique constraint error
    const randomEmail = `test${Date.now()}@example.com`;
    
    let testUser = new User({
      name: 'Test User',
      email: randomEmail,
      password: 'password123',
      subscription: 'free' // Set as string to test conversion
    });
    
    console.log('Before save - subscription type:', typeof testUser.subscription);
    console.log('Before save - subscription value:', testUser.subscription);
    
    // Save the user
    try {
      testUser = await testUser.save();
      console.log('User saved successfully');
      console.log('After save - subscription type:', typeof testUser.subscription);
      console.log('After save - subscription value:', JSON.stringify(testUser.subscription, null, 2));
    } catch (err) {
      console.error('Error saving user:', err.message);
      throw err;
    }
    
    // Test 2: Create a capsule for the user
    console.log('\nTest 2: Create capsule for user with subscription');
    
    const testCapsule = new Capsule({
      title: 'Test Capsule',
      content: 'This is a test capsule content.',
      releaseDate: new Date(), // Now
      isPublic: false,
      user: testUser._id
    });
    
    try {
      const savedCapsule = await testCapsule.save();
      console.log('Capsule saved successfully:', savedCapsule._id);
    } catch (err) {
      console.error('Error saving capsule:', err.message);
      throw err;
    }
    
    // Test 3: Update user subscription format
    console.log('\nTest 3: Update user with new subscription format');
    
    try {
      const updatedUser = await User.findByIdAndUpdate(
        testUser._id, 
        { 
          subscription: {
            plan_name: 'Free',
            subscribed_at: new Date(),
            payment_method: 'None',
            status: 'active',
            expiry_date: null
          }
        },
        { new: true, runValidators: true }
      );
      
      console.log('User updated with new subscription format');
      console.log('Updated subscription value:', JSON.stringify(updatedUser.subscription, null, 2));
    } catch (err) {
      console.error('Error updating subscription format:', err.message);
      throw err;
    }
    
    // Test 4: Create a capsule with full user object
    console.log('\nTest 4: Get user and create capsule with user object context');
    
    try {
      // Get the full user
      const fullUser = await User.findById(testUser._id);
      console.log('Retrieved user subscription:', JSON.stringify(fullUser.subscription, null, 2));
      
      // Create another capsule
      const secondCapsule = new Capsule({
        title: 'Second Test Capsule',
        content: 'This is another test capsule.',
        releaseDate: new Date(Date.now() + 86400000), // Tomorrow
        isPublic: false,
        user: fullUser._id
      });
      
      const savedSecondCapsule = await secondCapsule.save();
      console.log('Second capsule saved successfully:', savedSecondCapsule._id);
    } catch (err) {
      console.error('Error in Test 4:', err.message);
      throw err;
    }
    
    console.log('\nTests completed successfully');
  } catch (err) {
    console.error('Test failed with error:', err);
  } finally {
    // Clean up by removing test data (you may comment this out if you want to keep the test data)
    /*
    try {
      await Capsule.deleteMany({ title: { $in: ['Test Capsule', 'Second Test Capsule'] } });
      await User.deleteOne({ email: testUser.email });
      console.log('Test data cleaned up');
    } catch (cleanupErr) {
      console.error('Error during cleanup:', cleanupErr);
    }
    */
    
    // Close the database connection
    await mongoose.connection.close();
    console.log('Database connection closed');
    
    // Exit the process
    process.exit(0);
  }
}

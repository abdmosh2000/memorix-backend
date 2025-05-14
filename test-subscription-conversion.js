/* eslint-disable no-inner-declarations */
/* eslint-disable no-console */
const User = require('./models/User');

console.log('Testing User model subscription field conversion');

// Simple test to check what happens when setting subscription to a string value
function testSimpleSubscriptionConversion() {
  console.log('\nTest 1: Creating user with string subscription values');
  
  // Test each subscription type
  ['free', 'premium', 'vip', 'lifetime', 'invalid'].forEach(subType => {
    // Create new user with string subscription
    const user = new User({
      name: 'Test User',
      email: `test-${subType}@example.com`,
      password: 'password123',
      subscription: subType
    });
    
    console.log(`\nWith "${subType}" subscription:`);
    console.log('Subscription type:', typeof user.subscription);
    console.log('Subscription value:', JSON.stringify(user.subscription, null, 2));
  });
}

// Directly test the subscription conversion function from User model
function testManualConversion() {
  console.log('\nTest 2: Manually implementing subscription conversion');
  
  // Our manual implementation based on what we see in User.js
  function convertSubscription(sub) {
    // Normalize the subscription value
    const subType = typeof sub === 'string' ? sub.toLowerCase() : 'free';
    
    // Map subscription string to plan name
    let planName;
    if (subType === 'free') {
      planName = 'Free';
    } else if (subType === 'premium' || subType === 'paid') {
      planName = 'Premium';
    } else if (subType === 'lifetime' || subType === 'vip') {
      planName = 'Lifetime';
    } else {
      planName = 'Free'; // Default for unrecognized values
    }
    
    // Determine status and expiry date
    const status = (planName === 'Lifetime') ? 'lifetime' : 'active';
    const expiryDate = (planName === 'Free' || planName === 'Lifetime') 
      ? null 
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days for Premium
    
    return {
      plan_name: planName,
      subscribed_at: new Date(),
      payment_method: 'None',
      status: status,
      expiry_date: expiryDate
    };
  }
  
  ['free', 'premium', 'vip', 'lifetime', 'invalid'].forEach(subType => {
    console.log(`\nConverting "${subType}" subscription:`);
    console.log(JSON.stringify(convertSubscription(subType), null, 2));
  });
}

try {
  // Run tests
  testSimpleSubscriptionConversion();
  testManualConversion();
  console.log('\nSubscription conversion testing completed');
} catch (err) {
  console.error('Test failed with error:', err);
}

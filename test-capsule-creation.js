// Test script for creating a capsule using built-in http module

const http = require('http');
const config = require('./config/config');

// Local API endpoint for creating capsules
const API_HOST = 'localhost';
const API_PORT = 10000;
const API_PATH = '/api/capsules';

// Sample authenticated user token - you'll need to replace this with a valid token
const AUTH_TOKEN = 'YOUR_AUTH_TOKEN_HERE';

// Sample capsule data
const capsuleData = {
  title: 'Test Capsule',
  content: 'This is a test capsule to verify the API is working correctly.',
  isPublic: false,
  releaseDate: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
  recipients: ['test@example.com']
  // No media content for simplicity
};

function createTestCapsule() {
  console.log('🧪 Attempting to create test capsule...');
  
  // Convert data to JSON
  const postData = JSON.stringify(capsuleData);
  
  // Set up the request options
  const options = {
    hostname: API_HOST,
    port: API_PORT,
    path: API_PATH,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'Authorization': `Bearer ${AUTH_TOKEN}`
    }
  };
  
  // Create the request
  const req = http.request(options, res => {
    console.log('Status:', res.statusCode);
    console.log('Headers:', res.headers);
    
    let data = '';
    
    // Collect response data
    res.on('data', chunk => {
      data += chunk;
    });
    
    // Process complete response
    res.on('end', () => {
      try {
        const parsedData = JSON.parse(data);
        console.log('Response:', JSON.stringify(parsedData, null, 2));
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('✅ Capsule created successfully!');
        } else {
          console.error('❌ Failed to create capsule. Check the response for details.');
        }
      } catch (error) {
        console.error('Error parsing JSON response:', error);
        console.log('Raw response:', data);
      }
    });
  });
  
  // Handle request errors
  req.on('error', error => {
    console.error('❌ Error during capsule creation test:', error);
  });
  
  // Send the request with data
  req.write(postData);
  req.end();
  
  console.log('Request sent, waiting for response...');
}

// Run the test
createTestCapsule();

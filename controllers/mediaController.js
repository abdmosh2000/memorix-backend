const Capsule = require('../models/Capsule');
const crypto = require('crypto');
const config = require('../config/config');

// Helper function to generate a secure token for media access
const generateMediaToken = (capsuleId, mediaType, expiresAt) => {
  // Create a string to hash that includes the capsule ID and an expiration date
  // This ensures tokens expire after a certain time
  const tokenData = `${capsuleId}:${mediaType}:${expiresAt}`;
  
  // Use HMAC with server secret to create a secure, unforgeable token
  const hmac = crypto.createHmac('sha256', config.jwt.secret);
  hmac.update(tokenData);
  const hash = hmac.digest('hex');
  
  // Return a URL-friendly token that combines expiration time and hash
  return `${expiresAt.getTime()}.${hash}`;
};

// Helper function to verify a media token
const verifyMediaToken = (token, capsuleId, mediaType) => {
  try {
    // Split the token into expiration timestamp and hash
    const [expiresAtStr, hash] = token.split('.');
    const expiresAt = new Date(parseInt(expiresAtStr));
    
    // Check if the token has expired
    if (expiresAt < new Date()) {
      console.log('Media token expired');
      return false;
    }
    
    // Regenerate the token data string
    const tokenData = `${capsuleId}:${mediaType}:${expiresAt}`;
    
    // Create HMAC to verify the hash
    const hmac = crypto.createHmac('sha256', config.jwt.secret);
    hmac.update(tokenData);
    const expectedHash = hmac.digest('hex');
    
    // Compare the expected hash with the provided hash
    return hash === expectedHash;
  } catch (error) {
    console.error('Error verifying media token:', error);
    return false;
  }
};

// Function to generate a secure media access URL
const generateMediaUrl = (capsuleId, mediaType) => {
  // Set the token to expire in 7 days - adjust as needed
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  
  // Generate a token for this media
  const token = generateMediaToken(capsuleId, mediaType, expiresAt);
  
  // Create a URL that points to our media endpoint
  return `${config.server.baseUrl}/api/media/${capsuleId}/${mediaType}?token=${token}`;
};

// @desc    Get media content by capsule ID
// @route   GET /api/media/:id/:mediaType
// @access  Public (with token)
const getMediaById = async (req, res) => {
  try {
    const { id, mediaType } = req.params;
    const { token } = req.query;
    
    // Verify token
    if (!token || !verifyMediaToken(token, id, mediaType)) {
      return res.status(401).json({ message: 'Invalid or expired media token' });
    }
    
    // Find the capsule
    const capsule = await Capsule.findById(id);
    if (!capsule) {
      return res.status(404).json({ message: 'Capsule not found' });
    }
    
    // Verify that the media type requested matches what's in the capsule
    if (capsule.mediaType !== mediaType) {
      return res.status(400).json({ message: 'Invalid media type requested' });
    }
    
    // Decrypt the media content
    let mediaContent = null;
    try {
      mediaContent = capsule.getDecryptedMedia();
    } catch (error) {
      console.error('Error decrypting media:', error);
      return res.status(500).json({ message: 'Failed to decrypt media content' });
    }
    
    if (!mediaContent) {
      return res.status(404).json({ message: 'Media content not found or could not be decrypted' });
    }
    
    // Get the content type based on media type
    let contentType = 'application/octet-stream'; // Default
    switch (mediaType) {
      case 'photo':
        // The base64 data should start with the data URI, extract the actual content type
        if (mediaContent.startsWith('data:image/')) {
          contentType = mediaContent.substring(5, mediaContent.indexOf(';'));
        } else {
          contentType = 'image/jpeg'; // Default for photos
        }
        break;
      case 'video':
        contentType = 'video/mp4'; // Default for videos
        break;
      case 'audio':
        contentType = 'audio/mpeg'; // Default for audio
        break;
    }
    
    // Set proper headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
    
    // For base64 data URIs, strip off the prefix and send only the data
    if (mediaContent.includes(';base64,')) {
      const base64Data = mediaContent.split(';base64,')[1];
      const binaryData = Buffer.from(base64Data, 'base64');
      return res.send(binaryData);
    } 
    
    // For raw base64, convert to binary and send
    try {
      const binaryData = Buffer.from(mediaContent, 'base64');
      res.send(binaryData);
    } catch (error) {
      console.error('Error processing media content:', error);
      res.status(500).json({ message: 'Failed to process media content' });
    }
  } catch (error) {
    console.error('Error serving media:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getMediaById,
  generateMediaUrl
};

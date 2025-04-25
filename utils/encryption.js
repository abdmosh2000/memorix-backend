const crypto = require('crypto');
const config = require('../config/config');

/**
 * Encrypts data using AES-256-GCM
 * @param {string|object} data - Data to encrypt (if object, will be stringified)
 * @param {string} [key=config.encryption.capsuleEncryptKey] - Encryption key
 * @returns {string} - Encrypted data as base64 string with IV and auth tag
 */
function encrypt(data, key = config.encryption.capsuleEncryptKey) {
  try {
    // Convert data to string if it's an object
    if (typeof data === 'object') {
      data = JSON.stringify(data);
    }

    // Generate a random initialization vector
    const iv = crypto.randomBytes(16);
    
    // Create cipher using AES-256-GCM (Galois/Counter Mode - more secure than CBC)
    const cipher = crypto.createCipheriv(
      'aes-256-gcm', 
      Buffer.from(key.padEnd(32).slice(0, 32)), // Ensure key is exactly 32 bytes
      iv
    );
    
    // Encrypt the data
    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // Get authentication tag (for integrity verification)
    const authTag = cipher.getAuthTag();
    
    // Combine IV, encrypted data, and auth tag into a single string
    // Format: base64(iv):base64(authTag):base64(encryptedData)
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypts data that was encrypted with the encrypt function
 * @param {string} encryptedData - Data to decrypt (in format from encrypt function)
 * @param {string} [key=config.encryption.capsuleEncryptKey] - Decryption key
 * @param {boolean} [parseJson=false] - Whether to parse the result as JSON
 * @returns {string|object} - Decrypted data
 */
function decrypt(encryptedData, key = config.encryption.capsuleEncryptKey, parseJson = false) {
  try {
    // Split the encrypted data into its components
    const [ivBase64, authTagBase64, encryptedBase64] = encryptedData.split(':');
    
    // Convert components from base64
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');
    const encrypted = encryptedBase64;
    
    // Create decipher
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      Buffer.from(key.padEnd(32).slice(0, 32)), // Ensure key is exactly 32 bytes
      iv
    );
    
    // Set auth tag for authenticated decryption
    decipher.setAuthTag(authTag);
    
    // Decrypt the data
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    // Parse as JSON if requested
    if (parseJson) {
      return JSON.parse(decrypted);
    }
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Hash a string using SHA-256
 * @param {string} data - Data to hash
 * @returns {string} - Hashed data as hex
 */
function hash(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generates a secure random token
 * @param {number} [bytes=32] - Number of random bytes
 * @returns {string} - Random token as hex
 */
function generateRandomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Creates an HMAC for data integrity and authentication
 * @param {string|object} data - Data to create HMAC for 
 * @param {string} [key=config.encryption.capsuleEncryptKey] - Secret key
 * @returns {string} - HMAC as hex
 */
function createHmac(data, key = config.encryption.capsuleEncryptKey) {
  if (typeof data === 'object') {
    data = JSON.stringify(data);
  }
  return crypto.createHmac('sha256', key).update(data).digest('hex');
}

/**
 * Verifies an HMAC against the original data
 * @param {string|object} data - Original data
 * @param {string} hmac - HMAC to verify
 * @param {string} [key=config.encryption.capsuleEncryptKey] - Secret key
 * @returns {boolean} - Whether the HMAC is valid
 */
function verifyHmac(data, hmac, key = config.encryption.capsuleEncryptKey) {
  const calculatedHmac = createHmac(data, key);
  return crypto.timingSafeEqual(
    Buffer.from(calculatedHmac, 'hex'),
    Buffer.from(hmac, 'hex')
  );
}

module.exports = {
  encrypt,
  decrypt,
  hash,
  generateRandomToken,
  createHmac,
  verifyHmac
};

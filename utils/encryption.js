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
    // Format: base64(iv).base64(authTag).base64(encryptedData)
    // Using '.' as separator instead of ':' to avoid conflicts with base64 data
    return `${iv.toString('base64')}.${authTag.toString('base64')}.${encrypted}`;
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
 * @throws {Error} - With detailed error message if decryption fails
 */
function decrypt(encryptedData, key = config.encryption.capsuleEncryptKey, parseJson = false) {
  // Input validation
  if (!encryptedData) {
    console.error('Decryption error: Encrypted data is empty or undefined');
    throw new Error('Cannot decrypt empty or undefined data');
  }
  
  if (typeof encryptedData !== 'string') {
    console.error('Decryption error: Encrypted data must be a string, got:', typeof encryptedData);
    throw new Error(`Cannot decrypt data of type ${typeof encryptedData}`);
  }
  
  console.log(`Decrypting data (${encryptedData.length} chars)...`);
  console.log(`Format check - Contains ':': ${encryptedData.includes(':')}, Contains '.': ${encryptedData.includes('.')}`);
  
  try {
    // Check for old format (':' separator) and new format ('.' separator)
    let ivBase64, authTagBase64, encryptedBase64;
    let formatUsed;
    
    if (encryptedData.includes('.')) {
      // New format with '.' separator
      formatUsed = 'new format (dot separator)';
      console.log('Detected new encryption format using "." separator');
      const parts = encryptedData.split('.');
      if (parts.length !== 3) {
        throw new Error(`Invalid encrypted data format: expected 3 parts, got ${parts.length}`);
      }
      [ivBase64, authTagBase64, encryptedBase64] = parts;
    } else if (encryptedData.includes(':')) {
      // Legacy format with ':' separator (backward compatibility)
      formatUsed = 'legacy format (colon separator)';
      console.log('Detected legacy encryption format using ":" separator');
      
      try {
        // Try to split by the first two occurrences of ':'
        const firstSeparatorIndex = encryptedData.indexOf(':');
        if (firstSeparatorIndex === -1) {
          throw new Error('Invalid legacy encrypted data format: missing first separator');
        }
        
        const secondSeparatorIndex = encryptedData.indexOf(':', firstSeparatorIndex + 1);
        if (secondSeparatorIndex === -1) {
          throw new Error('Invalid legacy encrypted data format: missing second separator');
        }
        
        ivBase64 = encryptedData.substring(0, firstSeparatorIndex);
        authTagBase64 = encryptedData.substring(firstSeparatorIndex + 1, secondSeparatorIndex);
        encryptedBase64 = encryptedData.substring(secondSeparatorIndex + 1);
        
        // Validate basic structure
        if (!ivBase64 || !authTagBase64 || !encryptedBase64) {
          throw new Error('Invalid legacy encrypted data format: empty component(s)');
        }
      } catch (error) {
        console.error('Error parsing legacy encrypted data:', error);
        throw new Error(`Failed to parse encrypted data: ${error.message}`);
      }
    } else {
      // If no separators are found, the data is not in the expected format
      throw new Error('Invalid encrypted data format: missing separators');
    }
    
    console.log('Successfully parsed encryption format:', formatUsed);
    
    // Convert components from base64 with error handling
    try {
      // Validate and convert iv
      const iv = Buffer.from(ivBase64, 'base64');
      if (iv.length !== 16) {
        throw new Error(`Invalid IV length: ${iv.length} bytes (expected 16 bytes)`);
      }
      console.log('IV validated successfully');
      
      // Validate and convert authTag
      const authTag = Buffer.from(authTagBase64, 'base64');
      if (authTag.length !== 16) {
        throw new Error(`Invalid authTag length: ${authTag.length} bytes (expected 16 bytes)`);
      }
      console.log('AuthTag validated successfully');
      
      // Get the encrypted payload
      const encrypted = encryptedBase64;
      if (!encrypted) {
        throw new Error('Empty encrypted payload');
      }
      
      // Create standardized key
      const normalizedKey = Buffer.from(key.padEnd(32).slice(0, 32)); // Ensure key is exactly 32 bytes
    
      // Create decipher
      const decipher = crypto.createDecipheriv('aes-256-gcm', normalizedKey, iv);
      
      // Set auth tag for authenticated decryption
      decipher.setAuthTag(authTag);
    
      // Decrypt the data
      let decrypted;
      try {
        decrypted = decipher.update(encrypted, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        console.log('Decryption successful');
      } catch (cipherError) {
        console.error('Cipher operation failed:', cipherError);
        throw new Error(`Cipher operation failed: ${cipherError.message}`);
      }
    
      // Parse as JSON if requested
      if (parseJson) {
        try {
          const parsedData = JSON.parse(decrypted);
          console.log('Successfully parsed decrypted data as JSON');
          return parsedData;
        } catch (jsonError) {
          console.error('Failed to parse decrypted data as JSON:', jsonError);
          throw new Error(`Failed to parse decrypted data as JSON: ${jsonError.message}`);
        }
      }
      
      return decrypted;
    } catch (error) {
      console.error('Decryption component error:', error);
      throw new Error(`Failed to decrypt data: ${error.message}`);
    }
  } catch (error) {
    console.error('Decryption error:', error);
    // Include additional context about the encrypted data format to aid debugging
    throw new Error(`Failed to decrypt data: ${error.message}`);
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

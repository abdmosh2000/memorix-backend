/**
 * Tests for encryption utility functions
 */

const encryption = require('../utils/encryption');

describe('Encryption Utility', () => {
  const testData = 'This is a test string to be encrypted!';
  const testObject = { name: 'Test Object', value: 123, nested: { key: 'value' } };
  
  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt a string correctly', () => {
      // Encrypt the test data
      const encryptedData = encryption.encrypt(testData);
      
      // Verify that the encrypted data is a string and different from original
      expect(typeof encryptedData).toBe('string');
      expect(encryptedData).not.toBe(testData);
      expect(encryptedData).toContain(':'); // Our format includes colons as separators
      
      // Decrypt the data
      const decryptedData = encryption.decrypt(encryptedData);
      
      // Verify the decrypted data matches the original
      expect(decryptedData).toBe(testData);
    });
    
    it('should handle objects by JSON stringifying them', () => {
      // Encrypt an object
      const encryptedData = encryption.encrypt(testObject);
      
      // Decrypt with parseJson flag set to true
      const decryptedData = encryption.decrypt(encryptedData, undefined, true);
      
      // Verify the decrypted object matches the original
      expect(decryptedData).toEqual(testObject);
    });
    
    it('should encrypt differently with different keys', () => {
      // Encrypt with default key
      const encrypted1 = encryption.encrypt(testData);
      
      // Encrypt with custom key
      const customKey = 'my-custom-encryption-key-for-testing-12345';
      const encrypted2 = encryption.encrypt(testData, customKey);
      
      // Verify that the encryptions are different
      expect(encrypted1).not.toBe(encrypted2);
      
      // Verify that we can still decrypt with the custom key
      const decrypted = encryption.decrypt(encrypted2, customKey);
      expect(decrypted).toBe(testData);
      
      // Verify that using wrong key throws an error
      expect(() => {
        encryption.decrypt(encrypted2, 'wrong-key');
      }).toThrow();
    });
  });
  
  describe('hash function', () => {
    it('should generate consistent hashes for same input', () => {
      const hash1 = encryption.hash(testData);
      const hash2 = encryption.hash(testData);
      
      // Verify the hash is a string and consistent
      expect(typeof hash1).toBe('string');
      expect(hash1).toBe(hash2);
      
      // Verify the hash is 64 characters (sha256 hex output)
      expect(hash1.length).toBe(64);
    });
    
    it('should generate different hashes for different inputs', () => {
      const hash1 = encryption.hash(testData);
      const hash2 = encryption.hash(testData + 'different');
      
      // Hashes should be different
      expect(hash1).not.toBe(hash2);
    });
  });
  
  describe('HMAC functionality', () => {
    it('should create and verify HMACs correctly', () => {
      // Create HMAC
      const hmac = encryption.createHmac(testData);
      
      // Verify HMAC
      expect(encryption.verifyHmac(testData, hmac)).toBe(true);
      
      // Verify that incorrect data fails HMAC verification
      expect(encryption.verifyHmac('wrong data', hmac)).toBe(false);
    });
    
    it('should handle objects in HMAC creation and verification', () => {
      // Create HMAC for object
      const hmac = encryption.createHmac(testObject);
      
      // Verify with same object
      expect(encryption.verifyHmac(testObject, hmac)).toBe(true);
      
      // Verify with different object fails
      expect(encryption.verifyHmac({ ...testObject, extra: 'field' }, hmac)).toBe(false);
    });
  });
  
  describe('Random token generation', () => {
    it('should generate random tokens of the specified length', () => {
      // Generate token with default length (32 bytes = 64 hex chars)
      const token1 = encryption.generateRandomToken();
      expect(token1.length).toBe(64);
      
      // Generate token with custom length
      const token2 = encryption.generateRandomToken(16); // 16 bytes = 32 hex chars
      expect(token2.length).toBe(32);
      
      // Tokens should be different
      expect(token1).not.toBe(token2);
    });
  });
});

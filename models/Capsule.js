const mongoose = require('mongoose');
const encryption = require('../utils/encryption');

const capsuleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  content: {
    type: String,
    required: true
  },
  contentEncrypted: {
    type: Boolean,
    default: true
  },
  releaseDate: {
    type: Date,
    required: true
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  recipients: [{
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    hasAccessed: {
      type: Boolean,
      default: false
    },
    accessDate: {
      type: Date,
      default: null
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  mediaType: {
    type: String,
    enum: ['photo', 'video', 'audio', null],
    default: null
  },
  mediaContent: {
    type: String,
    default: null
  },
  mediaEncrypted: {
    type: Boolean,
    default: true
  },
  notifiedRecipients: {
    type: Boolean,
    default: false
  },
  totalRatings: {
    type: Number,
    default: 0
  },
  ratingCount: {
    type: Number,
    default: 0
  }
});

// Pre-save middleware to encrypt content and media if needed
capsuleSchema.pre('save', function(next) {
  try {
    console.log(`Pre-save hook for Capsule ID: ${this._id || 'new capsule'}`);
        
    // If content is not already encrypted and should be, encrypt it
    if (this.contentEncrypted && this.isModified('content')) {
      // Check if content is already encrypted (contains separator characters used in encryption)
      // Updated to check for both new (.) and legacy (:) encryption formats
      if (!this.content.includes('.') && !this.content.includes(':')) {
        console.log('Encrypting capsule content...');
        try {
          this.content = encryption.encrypt(this.content);
          console.log('Content successfully encrypted');
        } catch (encryptError) {
          console.error('Failed to encrypt content:', encryptError);
          throw encryptError; // Re-throw to be caught by outer try-catch
        }
      } else {
        console.log('Content appears to be already encrypted, skipping encryption');
      }
    }
        
    // If media content exists, is not already encrypted, and should be, encrypt it
    if (this.mediaEncrypted && this.mediaContent && this.isModified('mediaContent')) {
      // Check if media is already encrypted - updated to check both formats
      if (!this.mediaContent.includes('.') && !this.mediaContent.includes(':')) {
        console.log('Encrypting capsule media...');
        try {
          this.mediaContent = encryption.encrypt(this.mediaContent);
          console.log('Media successfully encrypted');
        } catch (encryptError) {
          console.error('Failed to encrypt media:', encryptError);
          throw encryptError; // Re-throw to be caught by outer try-catch
        }
      } else {
        console.log('Media appears to be already encrypted, skipping encryption');
      }
    }
        
    next();
  } catch (error) {
    console.error('Error encrypting capsule data:', error);
    next(error);
  }
});

// Instance method to get decrypted content
capsuleSchema.methods.getDecryptedContent = function() {
  if (!this.contentEncrypted || !this.content) {
    console.log('Content not encrypted or empty, returning as is');
    return this.content;
  }
    
  console.log(`Attempting to decrypt content for capsule ID: ${this._id}`);
  
  // Check if the content is in a valid format before attempting to decrypt
  const hasDotFormat = this.content.includes('.') && this.content.split('.').length === 3;
  const hasColonFormat = this.content.includes(':') && this.content.split(':').length === 3;
  
  console.log(`Content format check - Dot format: ${hasDotFormat}, Colon format: ${hasColonFormat}`);
  
  // If the format is invalid, return an error message without attempting decryption
  if (!hasDotFormat && !hasColonFormat) {
    console.error(`Invalid content format for capsule ID ${this._id} - missing required separators`);
    
    // Log more details about the format to help diagnose the issue
    const separatorCount = this.content.includes(':') 
      ? this.content.split(':').length - 1 
      : this.content.split('.').length - 1;
    
    console.error(`Content has ${separatorCount} separators, expected 2`);
    
    // Return error message for invalid format
    return 'Error: Content format is invalid and cannot be decrypted';
  }
    
  try {
    const decrypted = encryption.decrypt(this.content);
    console.log('Content successfully decrypted');
    return decrypted;
  } catch (error) {
    console.error(`Error decrypting capsule content for ID ${this._id}:`, error);
        
    // Log more details about the content format to help diagnose the issue
    const contentPreview = this.content.substring(0, 50) + (this.content.length > 50 ? '...' : '');
    console.error('Content preview:', contentPreview);
    
    // Log detailed format information
    const formatInfo = {
      length: this.content.length,
      dotSeparators: this.content.split('.').length - 1,
      colonSeparators: this.content.split(':').length - 1,
      startsWithBase64Chars: /^[A-Za-z0-9+/]+=*$/.test(this.content.split(/[.:]/, 1)[0])
    };
    
    console.error('Content format details:', formatInfo);
        
    return 'Error: Content could not be decrypted';
  }
};

// Instance method to get decrypted media content
capsuleSchema.methods.getDecryptedMedia = function() {
  if (!this.mediaEncrypted || !this.mediaContent) {
    console.log('Media not encrypted or empty, returning as is');
    return this.mediaContent;
  }
    
  console.log(`Attempting to decrypt media for capsule ID: ${this._id}`);
  
  // Check if the media content is in a valid format before attempting to decrypt
  const hasDotFormat = this.mediaContent.includes('.') && this.mediaContent.split('.').length === 3;
  const hasColonFormat = this.mediaContent.includes(':') && this.mediaContent.split(':').length === 3;
  
  console.log(`Media format check - Dot format: ${hasDotFormat}, Colon format: ${hasColonFormat}`);
  
  // If the format is invalid, return null without attempting decryption
  if (!hasDotFormat && !hasColonFormat) {
    console.error(`Invalid media format for capsule ID ${this._id} - missing required separators`);
    
    // Log more details about the format to help diagnose the issue
    const separatorCount = this.mediaContent.includes(':') 
      ? this.mediaContent.split(':').length - 1 
      : this.mediaContent.split('.').length - 1;
    
    console.error(`Media has ${separatorCount} separators, expected 2`);
    
    // Return null for invalid format
    return null;
  }
    
  try {
    const decrypted = encryption.decrypt(this.mediaContent);
    console.log('Media successfully decrypted');
    return decrypted;
  } catch (error) {
    console.error(`Error decrypting media for capsule ID ${this._id}:`, error);
    
    // For media content, just log the format info, not content preview (could be large)
    const formatInfo = {
      length: this.mediaContent.length,
      dotSeparators: this.mediaContent.split('.').length - 1,
      colonSeparators: this.mediaContent.split(':').length - 1,
      startsWithBase64Chars: /^[A-Za-z0-9+/]+=*$/.test(this.mediaContent.split(/[.:]/, 1)[0])
    };
    
    console.error('Media format details:', formatInfo);
    
    return null;
  }
};

// Virtual for retrieving a safe version of the capsule for public viewing
capsuleSchema.virtual('safeVersion').get(function() {
  // Create a plain object from the document
  const capsuleObj = this.toObject({ virtuals: false });
    
  // If the capsule is encrypted and we have access, decrypt it
  if (this.contentEncrypted && this.content) {
    try {
      const decryptedContent = this.getDecryptedContent();
      
      // Check if decryption returned an error message
      if (typeof decryptedContent === 'string' && decryptedContent.startsWith('Error:')) {
        console.warn(`Using error message for content: ${decryptedContent}`);
        capsuleObj.content = decryptedContent;
        // Keep contentEncrypted as true to indicate it's still not decrypted
      } else {
        capsuleObj.content = decryptedContent;
        capsuleObj.contentEncrypted = false;
      }
    } catch (error) {
      console.error('Error creating safe version of capsule:', error);
      capsuleObj.content = 'Error: Content unavailable';
    }
  }
    
  // Same for media content
  if (this.mediaEncrypted && this.mediaContent) {
    try {
      const decryptedMedia = this.getDecryptedMedia();
      
      // Check if decryption returned null (indicating an error)
      if (decryptedMedia === null) {
        console.warn('Media decryption returned null, setting mediaContent to null');
        capsuleObj.mediaContent = null;
        // Keep mediaEncrypted as true to indicate it's still not decrypted
      } else {
        capsuleObj.mediaContent = decryptedMedia;
        capsuleObj.mediaEncrypted = false;
      }
    } catch (error) {
      console.error('Error decrypting media for safe version:', error);
      capsuleObj.mediaContent = null;
    }
  }
    
  // Remove any sensitive fields that shouldn't be exposed
  delete capsuleObj.__v;
    
  return capsuleObj;
});

const Capsule = mongoose.model('Capsule', capsuleSchema);

module.exports = Capsule;

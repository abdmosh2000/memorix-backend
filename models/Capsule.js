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
        // If content is not already encrypted and should be, encrypt it
        if (this.contentEncrypted && this.isModified('content')) {
            // Check if content is already encrypted (starts with base64 format)
            if (!this.content.includes(':')) {
                this.content = encryption.encrypt(this.content);
            }
        }
        
        // If media content exists, is not already encrypted, and should be, encrypt it
        if (this.mediaEncrypted && this.mediaContent && this.isModified('mediaContent')) {
            // Check if media is already encrypted
            if (!this.mediaContent.includes(':')) {
                this.mediaContent = encryption.encrypt(this.mediaContent);
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
        return this.content;
    }
    
    try {
        return encryption.decrypt(this.content);
    } catch (error) {
        console.error('Error decrypting capsule content:', error);
        return 'Error: Content could not be decrypted';
    }
};

// Instance method to get decrypted media content
capsuleSchema.methods.getDecryptedMedia = function() {
    if (!this.mediaEncrypted || !this.mediaContent) {
        return this.mediaContent;
    }
    
    try {
        return encryption.decrypt(this.mediaContent);
    } catch (error) {
        console.error('Error decrypting capsule media:', error);
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
            capsuleObj.content = this.getDecryptedContent();
            capsuleObj.contentEncrypted = false;
        } catch (error) {
            console.error('Error creating safe version of capsule:', error);
            capsuleObj.content = 'Error: Content unavailable';
        }
    }
    
    // Same for media content
    if (this.mediaEncrypted && this.mediaContent) {
        try {
            capsuleObj.mediaContent = this.getDecryptedMedia();
            capsuleObj.mediaEncrypted = false;
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

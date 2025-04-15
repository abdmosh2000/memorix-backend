const mongoose = require('mongoose');

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

const Capsule = mongoose.model('Capsule', capsuleSchema);

module.exports = Capsule;

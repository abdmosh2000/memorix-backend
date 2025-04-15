const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    // Fields for app rating
    ux: {
        type: Number,
        min: 1,
        max: 10
    },
    design: {
        type: Number,
        min: 1,
        max: 10
    },
    usability: {
        type: Number,
        min: 1,
        max: 10
    },
    security: {
        type: Number,
        min: 1,
        max: 10
    },
    feedback: {
        type: String,
        default: ''
    },
    // Fields for capsule rating
    capsule: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Capsule'
    },
    value: {
        type: Number,
        min: 1,
        max: 5
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Validate that either (ux, design, usability, security) or (capsule, value) is provided
ratingSchema.pre('validate', function(next) {
    // If this is an app rating
    if (this.ux || this.design || this.usability || this.security) {
        if (!this.ux || !this.design || !this.usability || !this.security) {
            return next(new Error('When rating the app, all four rating categories must be provided'));
        }
        return next();
    }
    
    // If this is a capsule rating
    if (this.capsule && this.value) {
        return next();
    }
    
    // If neither case is satisfied
    return next(new Error('Invalid rating: must either provide app rating fields or capsule rating fields'));
});

const Rating = mongoose.model('Rating', ratingSchema);

module.exports = Rating;

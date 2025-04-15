const mongoose = require('mongoose');

const statSchema = new mongoose.Schema({
    totalCapsules: {
        type: Number,
        default: 0
    },
    usersByCountry: {
        type: Map,
        of: Number,
        default: {}
    },
    mostViewedCapsules: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Capsule',
        default: []
    },
    averageCapsuleLifespan: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Stat = mongoose.model('Stat', statSchema);

module.exports = Stat;
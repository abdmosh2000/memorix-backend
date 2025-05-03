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
    paymentStats: {
        totalRevenue: {
            type: Number,
            default: 0
        },
        subscriptionCounts: {
            free: {
                type: Number,
                default: 0
            },
            premium: {
                type: Number,
                default: 0
            },
            vip: {
                type: Number,
                default: 0
            }
        },
        monthlyRevenue: {
            type: Map,
            of: Number,
            default: {}
        },
        transactions: {
            type: Number,
            default: 0
        },
        averageOrderValue: {
            type: Number,
            default: 0
        },
        conversionRate: {
            type: Number,
            default: 0
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

const Stat = mongoose.model('Stat', statSchema);

module.exports = Stat;

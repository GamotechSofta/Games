import mongoose from 'mongoose';

const betSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    marketId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Market',
        required: true,
    },
    /**
     * Which session the bet was placed on.
     * - 'open': before opening result is declared
     * - 'close': after opening result is declared (market running)
     */
    betOn: {
        type: String,
        enum: ['open', 'close'],
        default: 'open',
    },
    betType: {
        type: String,
        required: true,
        enum: [
            'single',
            'jodi',
            'panna',
            'half-sangam',
            'full-sangam',
            'sp-common',
            'dp-common',
            'cp-common',
            'sp-motor',
            'dp-motor',
            'sp-dp-motor',
            'sp-dp-motor-dp',
            'sp-dp-motor-tp',
            'odd-even',
            'chart-game',
        ],
    },
    betNumber: {
        type: String,
        required: true,
    },
    amount: {
        type: Number,
        required: true,
        min: 0,
    },
    status: {
        type: String,
        enum: ['pending', 'won', 'lost', 'cancelled'],
        default: 'pending',
    },
    payout: {
        type: Number,
        default: 0,
    },
    scheduledDate: {
        type: Date,
        default: null,
    },
    isScheduled: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
});

// User bet history, market stats, settlement, and admin reports.
betSchema.index({ userId: 1, createdAt: -1 });
betSchema.index({ marketId: 1, status: 1, createdAt: -1 });
betSchema.index({ marketId: 1, createdAt: -1 });
betSchema.index({ marketId: 1, createdAt: -1, status: 1 });
betSchema.index({ status: 1, createdAt: -1 });
betSchema.index({ userId: 1, status: 1, createdAt: -1 });
betSchema.index({ scheduledDate: 1, marketId: 1 });
// Market detail stats: match by market + status + createdAt / scheduledDate windows
betSchema.index({ marketId: 1, status: 1, scheduledDate: 1 });

const Bet = mongoose.model('Bet', betSchema);
export default Bet;

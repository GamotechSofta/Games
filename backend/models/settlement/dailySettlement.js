import mongoose from 'mongoose';

/**
 * Daily commission settlement (Admin Collects).
 * Commission amount is computed from bets; admin marks paid/unpaid per day.
 */
const dailySettlementSchema = new mongoose.Schema({
    bookieId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true,
    },
    bookieType: {
        type: String,
        required: true,
        enum: ['admin_collects', 'bookie_collects'],
    },
    /** Settlement date (stored as start of day UTC for consistency) */
    settlementDate: {
        type: Date,
        required: true,
        index: true,
    },
    /**
     * For admin_collects: amount = Commission given by Admin to Bookie (Admin DETA)
     * For bookie_collects: amount = Platform charge received by Admin from Bookie (Admin GHETA)
     */
    amount: {
        type: Number,
        required: true,
        min: 0,
    },
    remarks: {
        type: String,
        trim: true,
        default: '',
    },
    status: {
        type: String,
        enum: ['unpaid', 'paid', 'pending', 'payment_sent', 'bookie_confirmed', 'approved', 'rejected'],
        default: 'unpaid',
    },
    bookieConfirmedAt: { type: Date },
    adminProcessedAt: { type: Date },
    adminRemarks: { type: String, trim: true },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true,
    },
}, {
    timestamps: true,
});

dailySettlementSchema.index({ bookieId: 1, settlementDate: -1 });
dailySettlementSchema.index({ bookieType: 1, settlementDate: -1 });

const DailySettlement = mongoose.model('DailySettlement', dailySettlementSchema);
export default DailySettlement;

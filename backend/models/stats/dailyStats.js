import mongoose from 'mongoose';

/**
 * Pre-aggregated platform stats for an IST calendar day (YYYY-MM-DD).
 * Built nightly by cron; used to speed up single-day report queries.
 */
const dailyStatsSchema = new mongoose.Schema({
    dateKey: {
        type: String,
        required: true,
        trim: true,
        match: /^\d{4}-\d{2}-\d{2}$/,
    },
    betRevenue: { type: Number, default: 0 },
    betPayouts: { type: Number, default: 0 },
    betCount: { type: Number, default: 0 },
    winningBets: { type: Number, default: 0 },
    losingBets: { type: Number, default: 0 },
    totalDeposits: { type: Number, default: 0 },
    totalWithdrawals: { type: Number, default: 0 },
    newUsers: { type: Number, default: 0 },
    computedAt: { type: Date, default: Date.now },
}, {
    timestamps: true,
});

dailyStatsSchema.index({ dateKey: 1 }, { unique: true });

const DailyStats = mongoose.models.DailyStats || mongoose.model('DailyStats', dailyStatsSchema);
export default DailyStats;

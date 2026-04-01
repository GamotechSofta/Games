import mongoose from 'mongoose';

const gapWalletTransactionSchema = new mongoose.Schema(
    {
        transactionId: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        type: {
            type: String,
            enum: ['DEBIT', 'CREDIT', 'ROLLBACK', 'debit', 'credit', 'rollback'],
            required: true,
            index: true,
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        status: {
            type: String,
            enum: ['SUCCESS', 'FAILED'],
            default: 'SUCCESS',
        },
        balanceAfter: {
            type: Number,
            required: true,
            min: 0,
        },
        requestMeta: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },
        gameId: {
            type: String,
            default: '',
            trim: true,
            index: true,
        },
        roundId: {
            type: String,
            default: '',
            trim: true,
            index: true,
        },
        originalTransactionId: {
            type: String,
            default: '',
            trim: true,
            index: true,
        },
        rolledBack: {
            type: Boolean,
            default: false,
            index: true,
        },
        rawPayload: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },
        provider: {
            type: String,
            default: 'GAP',
            trim: true,
        },
        remarks: {
            type: String,
            default: '',
            trim: true,
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

// TTL: auto-delete transaction logs after 7 days
gapWalletTransactionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });

const GapWalletTransaction = mongoose.model('GapWalletTransaction', gapWalletTransactionSchema);
export default GapWalletTransaction;

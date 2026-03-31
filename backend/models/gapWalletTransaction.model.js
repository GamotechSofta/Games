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
            enum: ['debit', 'credit'],
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

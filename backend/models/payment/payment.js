import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    /** Which bookie this user belongs to (null = direct/admin user) */
    bookieId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        default: null,
    },
    type: {
        type: String,
        required: true,
        enum: ['deposit', 'withdrawal'],
    },
    amount: {
        type: Number,
        required: true,
        min: 0,
    },
    method: {
        type: String,
        required: true,
        enum: ['upi', 'bank_transfer', 'wallet', 'cash', 'payu'],
        default: 'upi',
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'completed'],
        default: 'pending',
    },
    // For deposits - user uploads payment proof
    screenshotUrl: {
        type: String,
        trim: true,
    },
    // UTR / Transaction ID entered by user
    upiTransactionId: {
        type: String,
        trim: true,
    },
    // Legacy field
    transactionId: {
        type: String,
        trim: true,
    },
    // PayU payment link invoice number (from PayU response)
    payuInvoiceNumber: {
        type: String,
        trim: true,
    },
    // User's note when submitting
    userNote: {
        type: String,
        trim: true,
    },
    // Admin's remarks when approving/rejecting
    adminRemarks: {
        type: String,
        trim: true,
    },
    // Which admin/bookie processed this
    processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
    },
    // Was it processed by admin or bookie
    processedByType: {
        type: String,
        enum: ['admin', 'bookie'],
        default: 'admin',
    },
    // When was it processed
    processedAt: {
        type: Date,
    },
    // For withdrawals - which bank account to use
    bankDetailId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BankDetail',
    },
    // Legacy notes field
    notes: {
        type: String,
        trim: true,
    },
}, {
    timestamps: true,
});

// Indexes for faster queries
paymentSchema.index({ userId: 1, type: 1, status: 1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ bookieId: 1, status: 1 });
paymentSchema.index({ type: 1, status: 1, createdAt: -1 });
paymentSchema.index({ method: 1, type: 1, status: 1, createdAt: -1 });

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;

import mongoose from 'mongoose';

const pushSubscriptionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    endpoint: { type: String, required: true },
    keys: {
        p256dh: { type: String, required: true },
        auth: { type: String, required: true },
    },
    userAgent: { type: String, default: '' },
    platform: { type: String, default: 'web' },
    /** Where the player PWA was opened (e.g. https://aakda.in) — used for notification deep links */
    appOrigin: { type: String, default: '' },
}, {
    timestamps: true,
});

pushSubscriptionSchema.index({ endpoint: 1 }, { unique: true });

export default mongoose.model('PushSubscription', pushSubscriptionSchema);

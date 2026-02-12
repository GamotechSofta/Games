import mongoose from 'mongoose';

/**
 * Settings model to persist system-wide configuration and state.
 * Used to store things like last market reset date so they survive server restarts.
 */
const settingsSchema = new mongoose.Schema({
    /** Unique key to identify the setting (e.g. 'lastMarketResetDate') */
    key: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    /** The value stored as a string (dates stored as YYYY-MM-DD format) */
    value: {
        type: String,
        required: true,
    },
    /** Description of what this setting is for */
    description: {
        type: String,
        default: '',
    },
    /** Last updated timestamp */
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

// Update the updatedAt timestamp on save
settingsSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

const Settings = mongoose.model('Settings', settingsSchema);
export default Settings;

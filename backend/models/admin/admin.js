import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const adminSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
    },
    role: {
        type: String,
        default: 'super_admin',
        enum: ['super_admin', 'bookie', 'specific_admin'],
    },
    /** specific_admin only: list of sidebar paths this admin can access (e.g. /dashboard, /markets) */
    allowedTabs: [{
        type: String,
        trim: true,
    }],
    status: {
        type: String,
        default: 'active',
        enum: ['active', 'inactive'],
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
    },
    phone: {
        type: String,
        trim: true,
    },
    /** Bookie-only: type of collection model */
    bookieType: {
        type: String,
        enum: ['admin_collects', 'bookie_collects'],
        default: 'admin_collects',
    },
    /** Encrypted UPI ID – used for payment collection (both admin and bookie) */
    upiId: {
        type: String,
        trim: true,
        default: '',
    },
    /** Bookie-only: UI theme for their users' panel (user app). Ignored for super_admin. */
    uiTheme: {
        themeId: { type: String, enum: ['default', 'gold', 'blue', 'green', 'red', 'purple'], default: 'default' },
        primaryColor: { type: String, trim: true },
        accentColor: { type: String, trim: true },
    },
    /** Bookie-only: Commission percentage (0-100). Set by super admin upon approval. */
    commissionPercentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
    },
    /** Super admin only: Secret password required when declaring result (Confirm & Declare). Optional – if not set, no extra check. */
    secretDeclarePassword: {
        type: String,
        default: null,
        select: false,
    },
    /** Bookie (bookie_collects) only: Security password for sensitive actions like wallet add/deduct. Optional. */
    securityPassword: {
        type: String,
        default: null,
        select: false,
    },
}, {
    timestamps: true,
});

// Hash password before saving
adminSchema.pre('save', async function () {
    if (this.isModified('password')) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }
    if (this.isModified('secretDeclarePassword') && this.secretDeclarePassword) {
        const salt = await bcrypt.genSalt(10);
        this.secretDeclarePassword = await bcrypt.hash(this.secretDeclarePassword, salt);
    }
    if (this.isModified('securityPassword') && this.securityPassword) {
        const salt = await bcrypt.genSalt(10);
        this.securityPassword = await bcrypt.hash(this.securityPassword, salt);
    }
});

// Method to compare password
adminSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Method to compare secret declare password (super_admin only)
adminSchema.methods.compareSecretDeclarePassword = async function (candidatePassword) {
    if (!this.secretDeclarePassword) return false;
    return bcrypt.compare(candidatePassword, this.secretDeclarePassword);
};

// Method to compare security password (bookie bookie_collects only)
adminSchema.methods.compareSecurityPassword = async function (candidatePassword) {
    if (!this.securityPassword) return false;
    return bcrypt.compare(candidatePassword, this.securityPassword);
};

const Admin = mongoose.model('Admin', adminSchema);
export default Admin;

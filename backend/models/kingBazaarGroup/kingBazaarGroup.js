import mongoose from 'mongoose';

const kingBazaarGroupSchema = new mongoose.Schema({
    /** Unique key (e.g. 'king-morning', 'king-evening'). Used in Market.kingBazaarGroup and in URLs. */
    key: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    /** Display name (e.g. 'King Morning Bazaar'). */
    label: {
        type: String,
        required: true,
        trim: true,
    },
    /** Order for tabs/cards (lower first). */
    order: {
        type: Number,
        default: 0,
    },
}, { timestamps: true });

const KingBazaarGroup = mongoose.model('KingBazaarGroup', kingBazaarGroupSchema);
export default KingBazaarGroup;

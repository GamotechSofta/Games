import mongoose from 'mongoose';

const gameSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        gameId: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            index: true,
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
            index: true,
        },
        provider: {
            type: String,
            required: true,
            trim: true,
        },
        title: {
            type: String,
            default: '',
            trim: true,
        },
        image: {
            type: String,
            default: '',
            trim: true,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
    },
    { timestamps: true }
);

// Keep status and isActive aligned for compatibility.
gameSchema.pre('save', function (next) {
    if (this.isModified('status')) {
        this.isActive = this.status === 'active';
    } else if (this.isModified('isActive')) {
        this.status = this.isActive ? 'active' : 'inactive';
    }
    if (!this.title) this.title = this.name || '';
    next();
});

const Game = mongoose.model('Game', gameSchema);
export default Game;

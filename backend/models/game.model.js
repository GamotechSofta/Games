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
        /** Self-hosted / Spring Boot game entry URL (e.g. https://ludo-frontend.onrender.com/) */
        launchBaseUrl: {
            type: String,
            default: '',
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

// Active games list: status=active sorted by newest.
gameSchema.index({ status: 1, createdAt: -1 });

// Keep status and isActive aligned for compatibility.
// Mongoose 9+: pre('save') must not use next callback.
gameSchema.pre('save', function () {
    if (this.isModified('status')) {
        this.isActive = this.status === 'active';
    } else if (this.isModified('isActive')) {
        this.status = this.isActive ? 'active' : 'inactive';
    }
    if (!this.title) this.title = this.name || '';
});

const Game = mongoose.model('Game', gameSchema);
export default Game;

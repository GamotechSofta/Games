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
    },
    { timestamps: true }
);

const Game = mongoose.model('Game', gameSchema);
export default Game;

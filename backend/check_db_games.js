import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Game from './models/game.model.js';

dotenv.config();

(async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const count = await Game.countDocuments({});
        const activeCount = await Game.countDocuments({ status: 'active' });
        const providers = await Game.distinct('provider');
        
        console.log(`Total games in DB: ${count}`);
        console.log(`Active games in DB: ${activeCount}`);
        console.log(`Providers in DB (${providers.length}):`, providers);
        
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
})();

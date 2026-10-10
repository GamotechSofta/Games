import { getGameList, authenticateUser, buildLaunchUrl } from './services/casinoProvider.service.js';
import mongoose from 'mongoose';
import User from './models/user/user.js';
import dotenv from 'dotenv';
dotenv.config();

const userId = '6aa443ed49f8b71e14bf1334';

(async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        
        console.log("Fetching games from provider...");
        const result = await getGameList({ currency: 'INR' });
        
        let gamesList = [];
        if (Array.isArray(result?.games)) gamesList = result.games;
        else if (Array.isArray(result?.data)) gamesList = result.data;
        else if (Array.isArray(result?.message)) gamesList = result.message;
        
        if (gamesList.length === 0) {
            console.error("No games found from provider.");
            process.exit(1);
        }
        
        // Find a game that explicitly supports INR in its currencies array
        // Or just print the ones that do
        const inrGames = gamesList.filter(g => {
            if (Array.isArray(g.currencies)) {
                return g.currencies.map(c => String(c).toUpperCase()).includes('INR');
            }
            return false;
        });

        console.log(`Found ${inrGames.length} games that explicitly support INR.`);
        
        let game = inrGames.length > 0 ? inrGames[0] : gamesList[0];
        
        const gid = game.gid || game.gameId || game.id;
        console.log(`Picked game: ${game.name || game.title} (ID: ${gid}) - Supports INR explicitly: ${inrGames.length > 0}`);
        
        const user = await User.findById(userId).lean();
        
        console.log("Authenticating user with provider...");
        const authRes = await authenticateUser({
            username: user.username || user.name || 'TestPlayer',
            userId: String(user._id),
            currency: 'INR',
            closeUrl: 'https://aakda.in'
        });
        
        const providerToken = authRes?.token || authRes?.data?.token || (typeof authRes?.message === 'string' && !authRes.status ? authRes.message : null) || authRes?.message;
        if (!providerToken || typeof providerToken !== 'string') {
            console.error("Failed to get provider token:", authRes);
            process.exit(1);
        }
        console.log("Got Provider Token:", providerToken);
        
        const launchUrl = buildLaunchUrl(gid, providerToken);
        console.log("\n==============================");
        console.log("READY TO LAUNCH!");
        console.log("Game:", game.name || game.title);
        console.log("Provider Token:", providerToken);
        console.log("Launch URL:");
        console.log(launchUrl);
        console.log("==============================\n");
        
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
})();

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
        const result = await getGameList({ currency: 'USD' });
        
        let gamesList = [];
        if (Array.isArray(result?.games)) gamesList = result.games;
        else if (Array.isArray(result?.data)) gamesList = result.data;
        else if (Array.isArray(result?.message)) gamesList = result.message;
        
        if (gamesList.length === 0) {
            console.error("No games found from provider.");
            process.exit(1);
        }
        
        // Find a game from Pragmatic or Evolution
        const targetGame = gamesList.find(g => {
            const provider = String(g.provider || g.platform || g.type || '').toLowerCase();
            return provider.includes('pragmatic') || provider.includes('evolution') || provider.includes('elk');
        });

        const game = targetGame || gamesList[0];
        
        const gid = game.gid || game.gameId || game.id;
        const providerName = game.provider || game.platform || game.type || 'Unknown';
        console.log(`Picked game: ${game.name || game.title} (ID: ${gid}) from provider: ${providerName}`);
        
        const user = await User.findById(userId).lean();
        
        console.log("Authenticating user with provider...");
        const authRes = await authenticateUser({
            username: user.username || user.name || 'TestPlayer',
            userId: String(user._id),
            currency: 'USD',
            closeUrl: 'https://aakda.in'
        });
        
        const providerToken = authRes?.token || authRes?.data?.token || (typeof authRes?.message === 'string' && !authRes.status ? authRes.message : null) || authRes?.message;
        if (!providerToken || typeof providerToken !== 'string') {
            console.error("Failed to get provider token:", authRes);
            process.exit(1);
        }
        
        // WE MUST CREATE THE GAME SESSION SO THE BALANCE CALLBACK WORKS!
        const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        await mongoose.connection.collection('gamesessions').insertOne({
            userId: user._id,
            gameId: gid,
            sessionId: String(sessionId),
            launchUrl: buildLaunchUrl(gid, providerToken),
            providerToken: String(providerToken),
            provider: 'provider',
            rawResponse: authRes,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        
        const launchUrl = buildLaunchUrl(gid, providerToken);
        console.log("\n==============================");
        console.log("READY TO LAUNCH!");
        console.log("Game:", game.name || game.title, `(${providerName})`);
        console.log("Launch URL:");
        console.log(launchUrl);
        console.log("==============================\n");
        
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
})();

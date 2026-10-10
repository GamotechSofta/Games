import dotenv from 'dotenv';
import { getGameList, getProviders } from './services/casinoProvider.service.js';

dotenv.config();

(async () => {
    try {
        console.log("Fetching providers...");
        const providers = await getProviders();
        if (Array.isArray(providers)) {
           console.log(`Found ${providers.length} providers.`);
        } else if (providers.message && Array.isArray(providers.message)) {
           console.log(`Found ${providers.message.length} providers (message array).`);
        }
        
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
})();

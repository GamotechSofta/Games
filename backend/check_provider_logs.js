import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

(async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const logs = await mongoose.connection.collection('provider_logs')
            .find({})
            .sort({ timestamp: -1 })
            .limit(5)
            .toArray();
            
        console.log(`Found ${logs.length} recent provider logs.`);
        logs.forEach(log => {
            console.log("\n--- Log at", log.timestamp);
            console.log("Headers:", log.headers);
            console.log("Body:", log.body);
        });
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
})();

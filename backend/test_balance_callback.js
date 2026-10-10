import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { casinoProviderCallback } from './controllers/game.controller.js';

dotenv.config();

(async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        
        const req = {
            headers: {
                'api-key': process.env.API_KEY,
            },
            body: {
                opType: 2051,
                token: 'dc9577f0-c74e15f8-5fca508d-4bd5692b',
            },
            query: {}
        };
        
        const res = {
            status: function(code) {
                this.statusCode = code;
                return this;
            },
            json: function(data) {
                console.log('Status:', this.statusCode);
                console.log('Response:', data);
            }
        };
        
        console.log("Simulating provider balance callback...");
        await casinoProviderCallback(req, res);
        
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
})();

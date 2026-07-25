/**
 * Upsert PotLudo (fashionbuddies) into the games collection.
 * Usage: node scripts/seedPotLudo.js
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Game from '../models/game.model.js';

dotenv.config();

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!uri) {
  console.error('Missing MONGODB_URI');
  process.exit(1);
}

const payload = {
  name: 'PotLudo',
  title: 'PotLudo',
  gameId: String(process.env.APP_OPERATOR_GAME_ID || '2'),
  provider: 'potludo',
  launchBaseUrl:
    process.env.LUDO_LAUNCH_BASE_URL || 'https://fashionbuddies.in/play/online',
  status: 'active',
  isActive: true,
  image: '',
};

try {
  await mongoose.connect(uri);
  const game = await Game.findOneAndUpdate(
    { gameId: payload.gameId },
    { $set: payload },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log('PotLudo ready:', {
    id: String(game._id),
    gameId: game.gameId,
    name: game.name,
    provider: game.provider,
    launchBaseUrl: game.launchBaseUrl,
    status: game.status,
  });
  await mongoose.disconnect();
} catch (err) {
  console.error('Seed failed:', err.message);
  process.exit(1);
}

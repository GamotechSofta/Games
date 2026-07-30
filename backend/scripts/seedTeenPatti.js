/**
 * Upsert Teen Patti (doormart.shop) into the games collection.
 * Usage: node scripts/seedTeenPatti.js
 *
 * Launch format:
 *   https://www.doormart.shop/?id=<platform_token>&game_id=2
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
  name: 'Teen Patti',
  title: 'Teen Patti',
  gameId: String(process.env.TEENPATTI_CATALOG_GAME_ID || 'teenpatti'),
  provider: 'teenpatti',
  launchBaseUrl:
    process.env.TEENPATTI_LAUNCH_BASE_URL ||
    process.env.DOORMART_LAUNCH_URL ||
    'https://www.doormart.shop/',
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
  console.log('Teen Patti ready:', {
    id: String(game._id),
    gameId: game.gameId,
    name: game.name,
    provider: game.provider,
    launchBaseUrl: game.launchBaseUrl,
    status: game.status,
    launchExample: `${String(game.launchBaseUrl).replace(/\/?$/, '/')}?id=<TOKEN>&game_id=${process.env.TEENPATTI_OPERATOR_GAME_ID || '2'}`,
  });
  await mongoose.disconnect();
} catch (err) {
  console.error('Seed failed:', err.message);
  process.exit(1);
}

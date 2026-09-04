import express from 'express';
import { launchGame, addGame, listGames, toggleGame, listActiveGames, updateGame, listProviderEnabledGames } from '../controllers/game.controller.js';
import { verifyAdmin } from '../middleware/adminAuth.js';

const gameRoutes = express.Router();
const adminGameRoutes = express.Router();

gameRoutes.get('/health', (req, res) => {
  return res.status(200).json({
    success: true,
    status: 'game-api-ok',
  });
});

// Public/user game launch
gameRoutes.post('/launch', launchGame);
gameRoutes.get('/list', listActiveGames);
gameRoutes.get('/enabled', listProviderEnabledGames);

// Admin game management
adminGameRoutes.post('/add', verifyAdmin, addGame);
adminGameRoutes.put('/update', verifyAdmin, updateGame);
adminGameRoutes.get('/list', verifyAdmin, listGames);
adminGameRoutes.put('/toggle', verifyAdmin, toggleGame);

export { adminGameRoutes };
export default gameRoutes;

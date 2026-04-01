import express from 'express';
import { launchGame, addGame, listGames, toggleGame, listActiveGames } from '../controllers/game.controller.js';
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

// Admin game management
adminGameRoutes.post('/add', verifyAdmin, addGame);
adminGameRoutes.get('/list', verifyAdmin, listGames);
adminGameRoutes.put('/toggle', verifyAdmin, toggleGame);

export { adminGameRoutes };
export default gameRoutes;

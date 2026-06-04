import express from 'express';
import {
    getTelecallerDashboard,
    getMyCalledPlayers,
    setMyCalledPlayers,
} from '../../controllers/telecallerController.js';
import { verifyTelecaller, verifyAdmin } from '../../middleware/adminAuth.js';

const router = express.Router();

router.get('/dashboard', verifyTelecaller, getTelecallerDashboard);

router.get('/called-players', verifyAdmin, getMyCalledPlayers);
router.put('/called-players', verifyAdmin, setMyCalledPlayers);

export default router;

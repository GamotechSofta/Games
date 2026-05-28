import express from 'express';
import { getHomeBootstrap } from '../../controllers/homeController.js';

const router = express.Router();

router.get('/bootstrap', getHomeBootstrap);

export default router;


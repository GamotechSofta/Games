import express from 'express';
import {
    createMarket,
    getMarkets,
    getMarketById,
    getMarketResultHistory,
    getMarketStats,
    getSinglePattiSummary,
    updateMarket,
    setOpeningNumber,
    setClosingNumber,
    setWinNumber,
    deleteMarket,
    seedStartlineMarkets,
    previewDeclareOpenResult,
    declareOpenResult,
    previewDeclareCloseResult,
    declareCloseResult,
    clearResult,
    getWinningBetsPreview,
    getWinningBetsPreviewKingBazaar,
    previewDeclareKingBazaar,
    declareKingBazaar,
} from '../../controllers/marketController.js';
import { getStarlineGroups, createStarlineGroup, deleteStarlineGroup } from '../../controllers/starlineGroupController.js';
import { getKingBazaarGroups, createKingBazaarGroup, deleteKingBazaarGroup } from '../../controllers/kingBazaarGroupController.js';
import { marketLiveUpdates } from '../../controllers/marketLiveController.js';
import { getMarketRevisionHandler } from '../../controllers/marketRevisionController.js';
import { verifyAdmin } from '../../middleware/adminAuth.js';

const router = express.Router();

// Public routes — live result sync
router.get('/revision', getMarketRevisionHandler);
router.get('/live-updates', marketLiveUpdates);
router.get('/get-markets', getMarkets);
router.get('/get-market/:id', getMarketById);
router.get('/starline-groups', getStarlineGroups);
router.get('/king-bazaar-groups', getKingBazaarGroups);
router.get('/result-history', getMarketResultHistory);

// Admin: market detail stats (amount & no. of bets per option)
router.get('/get-market-stats/:id', verifyAdmin, getMarketStats);
router.get('/get-single-patti-summary/:id', verifyAdmin, getSinglePattiSummary);

// Super admin: declare result (preview, declare open, declare close)
router.get('/preview-declare-open/:id', verifyAdmin, previewDeclareOpenResult);
router.get('/preview-declare-close/:id', verifyAdmin, previewDeclareCloseResult);
router.get('/winning-bets-preview/:id', verifyAdmin, getWinningBetsPreview);
router.get('/winning-bets-preview-king-bazaar/:id', verifyAdmin, getWinningBetsPreviewKingBazaar);
router.post('/declare-open/:id', verifyAdmin, declareOpenResult);
router.post('/declare-close/:id', verifyAdmin, declareCloseResult);
router.post('/clear-result/:id', verifyAdmin, clearResult);

// King Bazaar specific declare result (super_admin + specific_admin when they have Add Result tab)
router.get('/preview-declare-king-bazaar/:id', verifyAdmin, previewDeclareKingBazaar);
router.post('/declare-king-bazaar/:id', verifyAdmin, declareKingBazaar);

// Market management (super_admin + specific_admin when they have Markets tab)
router.post('/create-market', verifyAdmin, createMarket);
router.post('/seed-startline', verifyAdmin, seedStartlineMarkets);
router.patch('/update-market/:id', verifyAdmin, updateMarket);
router.patch('/set-opening-number/:id', verifyAdmin, setOpeningNumber);
router.patch('/set-closing-number/:id', verifyAdmin, setClosingNumber);
router.patch('/set-win-number/:id', verifyAdmin, setWinNumber);
router.delete('/delete-market/:id', verifyAdmin, deleteMarket);
router.post('/starline-groups', verifyAdmin, createStarlineGroup);
router.delete('/starline-groups/:key', verifyAdmin, deleteStarlineGroup);
router.post('/king-bazaar-groups', verifyAdmin, createKingBazaarGroup);
router.delete('/king-bazaar-groups/:key', verifyAdmin, deleteKingBazaarGroup);

export default router;

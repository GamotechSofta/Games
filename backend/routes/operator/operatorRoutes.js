import express from 'express';
import {
    operatorUserLogin,
    operatorUserDetail,
    operatorUserBalanceV2,
    logOperatorRequest,
} from '../../controllers/operatorController.js';

const router = express.Router();

/**
 * PotLudo / fashionbuddies operator callbacks
 * (APP_OPERATOR_BASE_URL=https://api.aakda.in):
 *   GET  /service/user/detail              (+ header token)
 *   POST /service/operator/user/balance/v2 (+ header token)
 *   POST /operator/user/login              (optional)
 */
router.use(logOperatorRequest);
router.post('/user/login', operatorUserLogin);
router.get('/user/login', operatorUserLogin);

export const operatorServiceRouter = express.Router();
operatorServiceRouter.use(logOperatorRequest);
operatorServiceRouter.get('/user/detail', operatorUserDetail);
operatorServiceRouter.post('/user/detail', operatorUserDetail);
operatorServiceRouter.post('/operator/user/balance/v2', operatorUserBalanceV2);
operatorServiceRouter.get('/operator/user/balance/v2', operatorUserBalanceV2);

export default router;

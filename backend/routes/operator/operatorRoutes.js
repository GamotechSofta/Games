import express from 'express';
import {
    operatorUserLogin,
    operatorUserDetail,
    operatorUserBalanceV2,
    logOperatorRequest,
} from '../../controllers/operatorController.js';

const router = express.Router();

/**
 * PotLudo / fashionbuddies operator callbacks (configured on aakda.in):
 *   POST /operator/user/login
 *   POST /service/user/detail
 *   POST /service/operator/user/balance/v2
 *
 * Also accept GET for detail/balance (some providers probe with GET).
 */
router.use(logOperatorRequest);
router.post('/user/login', operatorUserLogin);
router.get('/user/login', operatorUserLogin);

export const operatorServiceRouter = express.Router();
operatorServiceRouter.use(logOperatorRequest);
operatorServiceRouter.post('/user/detail', operatorUserDetail);
operatorServiceRouter.get('/user/detail', operatorUserDetail);
operatorServiceRouter.post('/operator/user/balance/v2', operatorUserBalanceV2);
operatorServiceRouter.get('/operator/user/balance/v2', operatorUserBalanceV2);

export default router;

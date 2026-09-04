import express from 'express';
import {
    operatorUserLogin,
    operatorUserDetail,
    operatorUserBalanceV2,
    logOperatorRequest,
} from '../../controllers/operatorController.js';

const router = express.Router();

/**
 * Operator callbacks for PotLudo (fashionbuddies) and Teen Patti (doormart),
 * with APP_OPERATOR_BASE_URL=https://api.aakda.in:
 *   GET  /service/user/detail              (+ header token)
 *   POST /service/operator/user/balance/v2 (+ header token)
 *   POST /operator/user/login              (optional)
 */
router.use(logOperatorRequest);
router.post('/user/login', operatorUserLogin);
router.get('/user/login', operatorUserLogin);
router.get('/user/detail', operatorUserDetail);
router.post('/user/detail', operatorUserDetail);
router.post('/user/balance/v2', operatorUserBalanceV2);

export const operatorServiceRouter = express.Router();
operatorServiceRouter.use(logOperatorRequest);
operatorServiceRouter.get('/user/detail', operatorUserDetail);
operatorServiceRouter.post('/user/detail', operatorUserDetail);
operatorServiceRouter.post('/operator/user/balance/v2', operatorUserBalanceV2);
operatorServiceRouter.get('/operator/user/balance/v2', operatorUserBalanceV2);

/**
 * Mounted at `/user` for operators configured with a bare base URL, so
 * `/user/detail` and `/user/balance/v2` resolve without the `/service` prefix.
 */
export const operatorUserRootRouter = express.Router();
operatorUserRootRouter.use(logOperatorRequest);
operatorUserRootRouter.get('/detail', operatorUserDetail);
operatorUserRootRouter.post('/detail', operatorUserDetail);
operatorUserRootRouter.post('/balance/v2', operatorUserBalanceV2);
operatorUserRootRouter.post('/login', operatorUserLogin);

export default router;

import crypto from 'crypto';
import { decryptWithPrivateKey } from '../services/gap.service.js';
import { gapConfig } from '../services/gap.service.js';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger.js';

const resolvePemPath = (filePath) => (path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath));

function getGapPublicKey() {
    const publicPath = resolvePemPath(gapConfig.GAP_PUBLIC_KEY_PATH || '');
    if (!publicPath || !fs.existsSync(publicPath)) {
        throw new Error('GAP public key file not found. Check GAP_PUBLIC_KEY_PATH');
    }
    return fs.readFileSync(publicPath, 'utf8');
}

/**
 * Verify GAP signature for encrypted payload.
 * - Expects encrypted payload in req.body.data
 * - Expects signature header in x-signature (or x-gap-signature/signature)
 * - On success, decrypted payload is attached to req.gapPayload
 *
 * To avoid breaking existing callers, this middleware allows plain JSON fallback
 * when req.body.data is not present.
 */
export const verifyGapSignature = (req, res, next) => {
    try {
        const encryptedData = req.body?.data;
        const signature =
            req.headers['x-signature'] ||
            req.headers['x-gap-signature'] ||
            req.headers.signature;

        // Backward compatibility mode: plain JSON body (existing integration).
        if (!encryptedData) {
            req.gapPayload = null;
            return next();
        }

        if (!signature) {
            return res.status(401).json({
                status: 'FAILED',
                message: 'Missing signature',
            });
        }

        const publicKey = getGapPublicKey();
        const verifier = crypto.createVerify('RSA-SHA256');
        verifier.update(String(encryptedData), 'utf8');
        verifier.end();
        const ok = verifier.verify(publicKey, String(signature), 'base64');

        if (!ok) {
            logger.warn('GAP signature verification failed', { ip: req.ip });
            return res.status(401).json({
                status: 'FAILED',
                message: 'Invalid signature',
            });
        }

        // Decrypt and expose payload for controllers.
        const decryptedText = decryptWithPrivateKey(String(encryptedData));
        let parsed = {};
        try {
            parsed = JSON.parse(decryptedText);
        } catch {
            return res.status(400).json({
                status: 'FAILED',
                message: 'Invalid encrypted payload JSON',
            });
        }

        req.gapPayload = parsed?.payload && typeof parsed.payload === 'object'
            ? parsed.payload
            : parsed;

        return next();
    } catch (error) {
        logger.error('GAP auth middleware error', { error: error.message });
        return res.status(401).json({
            status: 'FAILED',
            message: 'Unauthorized GAP request',
        });
    }
};

export default verifyGapSignature;

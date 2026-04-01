import crypto from 'crypto';
import { decryptWithPrivateKey } from '../services/gap.service.js';
import { gapConfig } from '../services/gap.service.js';
import fs from 'fs';
import path from 'path';
import logger, { sanitizeForLog } from '../utils/logger.js';

const resolvePemPath = (filePath) => (path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath));

function getGapPublicKey() {
    const inlineKey = String(process.env.GAP_PUBLIC_KEY || '').trim();
    if (inlineKey) return inlineKey;
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
        const enabled = String(process.env.GAP_SIGNATURE_ENABLED || 'false').toLowerCase() === 'true';
        if (!enabled) {
            logger.info('GAP signature bypassed (testing mode)', {
                route: req.originalUrl,
                method: req.method,
            });
            req.gapPayload = req.body || null;
            return next();
        }

        const encryptedData = req.body?.data;
        const signature =
            req.get('Signature') ||
            req.get('x-signature') ||
            req.get('x-gap-signature') ||
            req.headers.signature ||
            req.headers['x-signature'] ||
            req.headers['x-gap-signature'];

        if (!signature) {
            logger.warn('GAP signature missing', {
                route: req.originalUrl,
                method: req.method,
                ip: req.ip,
            });
            return res.status(401).json({
                success: false,
                code: 'MISSING_SIGNATURE',
                message: 'Missing signature',
            });
        }

        const publicKey = getGapPublicKey();
        const verifier = crypto.createVerify('RSA-SHA256');
        const payloadForVerify = encryptedData ? String(encryptedData) : JSON.stringify(req.body || {});
        verifier.update(payloadForVerify, 'utf8');
        verifier.end();
        const ok = verifier.verify(publicKey, String(signature), 'base64');

        if (!ok) {
            logger.warn('GAP signature verification failed', {
                route: req.originalUrl,
                method: req.method,
                ip: req.ip,
            });
            return res.status(401).json({
                success: false,
                code: 'INVALID_SIGNATURE',
                message: 'Invalid signature',
            });
        }

        // If encrypted payload exists, decrypt; otherwise trust signed JSON body.
        if (encryptedData) {
            const decryptedText = decryptWithPrivateKey(String(encryptedData));
            let parsed = {};
            try {
                parsed = JSON.parse(decryptedText);
            } catch {
                return res.status(400).json({
                    success: false,
                    code: 'INVALID_ENCRYPTED_PAYLOAD',
                    message: 'Invalid encrypted payload JSON',
                });
            }
            req.gapPayload = parsed?.payload && typeof parsed.payload === 'object' ? parsed.payload : parsed;
        } else {
            req.gapPayload = req.body || null;
        }

        logger.info('GAP signature verification passed', sanitizeForLog({
            route: req.originalUrl,
            method: req.method,
            ip: req.ip,
            hasEncryptedData: !!encryptedData,
        }));

        return next();
    } catch (error) {
        logger.error('GAP auth middleware error', sanitizeForLog({
            route: req.originalUrl,
            method: req.method,
            ip: req.ip,
            error: error.message,
        }));
        return res.status(401).json({
            success: false,
            code: 'SIGNATURE_VERIFICATION_ERROR',
            message: 'Invalid signature',
        });
    }
};

export default verifyGapSignature;

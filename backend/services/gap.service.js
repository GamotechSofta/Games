import axios from 'axios';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const GAP_BASE_URL = process.env.GAP_BASE_URL || '';
const GAP_PRIVATE_KEY_PATH = process.env.GAP_PRIVATE_KEY_PATH || '';
const GAP_PUBLIC_KEY_PATH = process.env.GAP_PUBLIC_KEY_PATH || '';
const OPERATOR_ID = process.env.OPERATOR_ID || '';

/** Resolve PEM path from env (relative paths allowed). */
function resolvePemPath(filePath) {
    if (!filePath) return '';
    return path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
}

/** Read private key configured in env. */
function getPrivateKey() {
    const privatePath = resolvePemPath(GAP_PRIVATE_KEY_PATH);
    if (!privatePath || !fs.existsSync(privatePath)) {
        throw new Error('GAP private key file not found. Check GAP_PRIVATE_KEY_PATH');
    }
    return fs.readFileSync(privatePath, 'utf8');
}

/** Read default GAP public key configured in env. */
function getDefaultPublicKey() {
    const publicPath = resolvePemPath(GAP_PUBLIC_KEY_PATH);
    if (!publicPath || !fs.existsSync(publicPath)) {
        throw new Error('GAP public key file not found. Check GAP_PUBLIC_KEY_PATH');
    }
    return fs.readFileSync(publicPath, 'utf8');
}

/** Encrypt JSON/string with GAP public key. */
export function encryptWithPublicKey(data, publicKey) {
    const plainText = typeof data === 'string' ? data : JSON.stringify(data);
    const encrypted = crypto.publicEncrypt(
        {
            key: publicKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256',
        },
        Buffer.from(plainText, 'utf8')
    );
    return encrypted.toString('base64');
}

/** Decrypt base64 text with local private key. */
export function decryptWithPrivateKey(data) {
    const privateKey = getPrivateKey();
    const decrypted = crypto.privateDecrypt(
        {
            key: privateKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256',
        },
        Buffer.from(data, 'base64')
    );
    return decrypted.toString('utf8');
}

/**
 * Make encrypted GAP request and decrypt response.
 * Expected response format: { data: "<base64-encrypted>" }.
 */
export async function gapRequest(endpoint, payload, gapPublicKey) {
    if (!GAP_BASE_URL) {
        throw new Error('GAP_BASE_URL is required');
    }

    const publicKey = gapPublicKey || getDefaultPublicKey();
    const body = {
        operatorId: OPERATOR_ID,
        timestamp: new Date().toISOString(),
        payload,
    };
    const encryptedData = encryptWithPublicKey(body, publicKey);

    const url = `${GAP_BASE_URL.replace(/\/$/, '')}/${String(endpoint || '').replace(/^\//, '')}`;
    console.log('[GAP] Request:', url);

    const response = await axios.post(
        url,
        { data: encryptedData },
        { timeout: 15000, headers: { 'Content-Type': 'application/json' } }
    );

    if (!response?.data) {
        throw new Error('Empty response from GAP');
    }

    if (response.data.data) {
        const decrypted = decryptWithPrivateKey(response.data.data);
        return JSON.parse(decrypted);
    }

    // Some environments might return plain JSON.
    return response.data;
}

export const gapConfig = {
    GAP_BASE_URL,
    GAP_PRIVATE_KEY_PATH,
    GAP_PUBLIC_KEY_PATH,
    OPERATOR_ID,
};

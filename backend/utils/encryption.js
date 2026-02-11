import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

function getKey() {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
        throw new Error('ENCRYPTION_KEY is not set in .env');
    }
    // Ensure key is exactly 32 bytes (256 bits)
    return crypto.createHash('sha256').update(key).digest();
}

/**
 * Encrypt a plain text string.
 * Returns a string in the format: iv:encryptedData (both hex encoded).
 */
export function encrypt(text) {
    if (!text) return '';
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
    let encrypted = cipher.update(String(text), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt a previously encrypted string.
 * Expects input in the format: iv:encryptedData (both hex encoded).
 */
export function decrypt(encryptedText) {
    if (!encryptedText || !encryptedText.includes(':')) return '';
    const [ivHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

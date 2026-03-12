/**
 * PayU India integration: Payment Links API (OAuth) + Hosted Checkout (Key/Salt).
 * Hosted Checkout works with PAYU_KEY and PAYU_SALT only (no numeric Merchant ID).
 */

import crypto from 'crypto';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let payuHasher;
try {
    payuHasher = require('payu-sdk/lib/payu/hasher.js');
} catch {
    payuHasher = null;
}

const PAYU_MODE = (process.env.PAYU_MODE || 'test').toLowerCase();
const isTest = PAYU_MODE !== 'live' && PAYU_MODE !== 'production';

const ACCOUNTS_BASE = isTest ? 'https://uat-accounts.payu.in' : 'https://accounts.payu.in';
const ONEAPI_BASE = isTest ? 'https://uatoneapi.payu.in' : 'https://oneapi.payu.in';
const HOSTED_PAYMENT_URL = isTest ? 'https://test.payu.in/_payment' : 'https://secure.payu.in/_payment';

let cachedToken = null;
let tokenExpiry = 0;

/**
 * Get OAuth access token (cached until near expiry).
 */
async function getPayUToken() {
    const clientId = process.env.PAYU_CLIENT_ID;
    const clientSecret = process.env.PAYU_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
        throw new Error('PayU: PAYU_CLIENT_ID and PAYU_CLIENT_SECRET are required');
    }
    if (cachedToken && Date.now() < tokenExpiry - 60000) {
        return cachedToken;
    }
    const body = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
        scope: 'create_payment_links read_payment_links',
    });
    const res = await fetch(`${ACCOUNTS_BASE}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
    });
    const text = await res.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch {
        throw new Error(`PayU token API returned non-JSON (${res.status}). Check PAYU_CLIENT_ID/PAYU_CLIENT_SECRET and PAYU_MODE.`);
    }
    if (data.error) {
        throw new Error(`PayU token error: ${data.error_description || data.error}`);
    }
    cachedToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in || 3600) * 1000;
    return cachedToken;
}

/**
 * Create a PayU payment link.
 * @param {Object} opts - { amount, description, successURL, failureURL, invoiceNumber }
 * @returns {Promise<{ paymentLink: string, invoiceNumber: string }>}
 */
async function createPaymentLink(opts) {
    const { amount, description, successURL, failureURL, invoiceNumber } = opts;
    const merchantId = process.env.PAYU_MERCHANT_ID || process.env.PAYU_KEY;
    if (!merchantId) {
        throw new Error('PayU: PAYU_MERCHANT_ID or PAYU_KEY is required');
    }
    const token = await getPayUToken();
    const payload = {
        subAmount: Math.round(Number(amount)),
        isPartialPaymentAllowed: false,
        description: description || 'Add fund',
        source: 'API',
        currency: 'INR',
    };
    if (successURL) payload.successURL = successURL;
    if (failureURL) payload.failureURL = failureURL;
    if (invoiceNumber) payload.invoiceNumber = String(invoiceNumber);

    const res = await fetch(`${ONEAPI_BASE}/payment-links/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'merchantId': merchantId,
        },
        body: JSON.stringify(payload),
    });
    const text = await res.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch {
        if (res.status === 403) {
            throw new Error('PayU returned 403 Forbidden. The Payment Links API usually requires a numeric PAYU_MERCHANT_ID (from PayU dashboard under Integration/API, not the alphanumeric Key). Ensure your token has create_payment_links scope.');
        }
        throw new Error(`PayU create-link API returned non-JSON (${res.status}). Check PAYU_MERCHANT_ID and PayU dashboard.`);
    }

    if (data.status !== 0 || !data.result) {
        const msg = data.message || data.errorCode || 'Failed to create payment link';
        throw new Error(`PayU: ${msg}`);
    }
    return {
        paymentLink: data.result.paymentLink,
        invoiceNumber: data.result.invoiceNumber || invoiceNumber,
    };
}

/**
 * Get transactions for a payment link (to verify success).
 * @param {string} invoiceId - PayU invoice ID
 * @returns {Promise<Array<{ status: string }>>}
 */
async function getPaymentLinkTransactions(invoiceId) {
    const merchantId = process.env.PAYU_MERCHANT_ID || process.env.PAYU_KEY;
    if (!merchantId) {
        throw new Error('PayU: PAYU_MERCHANT_ID or PAYU_KEY is required');
    }
    const token = await getPayUToken();
    const now = new Date();
    const dateTo = now.toISOString().slice(0, 10);
    const dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const url = `${ONEAPI_BASE}/payment-links/${encodeURIComponent(invoiceId)}/txns?dateFrom=${dateFrom}&dateTo=${dateTo}`;
    const res = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'merchantId': merchantId,
        },
    });
    const data = await res.json();

    if (data.status !== 0 || !data.result || !data.result.data) {
        return [];
    }
    return data.result.data;
}

// ============ Hosted Checkout (Key + Salt) – no numeric Merchant ID needed ============

/**
 * PayU request hash – uses official payu-sdk formula when available, else same formula.
 * Formula: sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||salt)
 */
export const generateHostedHash = (params) => {
    const key = String(params.key ?? '').trim();
    const txnid = String(params.txnid ?? '').trim();
    const amount = String(params.amount ?? '').trim();
    const productinfo = String(params.productinfo ?? '').trim();
    const firstname = String(params.firstname ?? '').trim();
    const email = String(params.email ?? '').trim();
    const salt = String(params.salt ?? '').trim();
    const udf1 = String(params.udf1 ?? '').trim();
    const udf2 = String(params.udf2 ?? '').trim();
    const udf3 = String(params.udf3 ?? '').trim();
    const udf4 = String(params.udf4 ?? '').trim();
    const udf5 = String(params.udf5 ?? '').trim();

    if (payuHasher && payuHasher.generateHash) {
        try {
            const hash = payuHasher.generateHash({
                key,
                salt,
                txnid,
                amount,
                productinfo,
                firstname,
                email,
                udf1,
                udf2,
                udf3,
                udf4,
                udf5,
            });
            const hashStr = `${key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}||||||${salt}`;
            console.log('FINAL HASH STRING (PayU SDK):', hashStr);
            return hash.toLowerCase();
        } catch (e) {
            console.warn('PayU SDK hash failed, using fallback:', e.message);
        }
    }

    const hashString =
        `${key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}||||||${salt}`.trim();
    console.log('FINAL HASH STRING:', hashString);
    const hash = crypto
        .createHash('sha512')
        .update(hashString)
        .digest('hex')
        .toLowerCase();
    return hash;
};

/**
 * Verify response hash from PayU callback (reverse hash).
 * Formula: sha512(SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
 */
function verifyHostedResponseHash(params) {
    const salt = params.salt || '';
    const status = params.status || '';
    const udf5 = params.udf5 || '';
    const udf4 = params.udf4 || '';
    const udf3 = params.udf3 || '';
    const udf2 = params.udf2 || '';
    const udf1 = params.udf1 || '';
    const email = params.email || '';
    const firstname = params.firstname || '';
    const productinfo = params.productinfo || '';
    const amount = params.amount || '';
    const txnid = params.txnid || '';
    const key = params.key || '';
    const hashString = `${salt}|${status}||||||${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`;
    return crypto.createHash('sha512').update(hashString).digest('hex');
}

/** Remove pipe and trim – pipe in any field breaks hash; same value used in hash and form. */
const safe = (v) => String(v ?? '').replace(/\|/g, '').trim() || '';

/**
 * Build form data for PayU. Hash and form are built from the SAME paymentData so they always match.
 * @returns {{ formActionUrl: string, formData: Record<string, string> }}
 */
function buildHostedCheckoutForm(opts) {
    const { amount, txnid, productinfo, firstname, email, phone, surl, furl } = opts;
    const rawKey = (process.env.PAYU_KEY || '').trim();
    const rawSalt = (process.env.PAYU_SALT || '').trim();
    console.log('PAYU_KEY length:', rawKey.length, '(expected ~6–20; if larger, check .env for space/newline)');
    console.log('PAYU_SALT length:', rawSalt.length, '(expected ~16–32; if larger, check .env for space/newline)');
    const key = safe(rawKey);
    const salt = rawSalt;
    if (!key || !salt) {
        throw new Error('PayU: PAYU_KEY and PAYU_SALT are required for Hosted Checkout');
    }

    const paymentData = {
        key,
        txnid,
        amount: Number(amount).toFixed(2),
        productinfo: safe(productinfo || 'Game Wallet'),
        firstname: safe(firstname || 'User'),
        email: safe(email || 'user@example.com'),
        salt,
    };

    const hash = generateHostedHash(paymentData);

    const formData = {
        key: paymentData.key,
        txnid: paymentData.txnid,
        amount: paymentData.amount,
        productinfo: paymentData.productinfo,
        firstname: paymentData.firstname,
        email: paymentData.email,
        hash,
        phone: String(phone || '9876543210').trim(),
        surl: (surl || '').trim(),
        furl: (furl || '').trim(),
        udf1: '',
        udf2: '',
        udf3: '',
        udf4: '',
        udf5: '',
    };

    console.log('FINAL FORM DATA:', formData);

    return { formActionUrl: HOSTED_PAYMENT_URL, formData };
}

export {
    getPayUToken,
    createPaymentLink,
    getPaymentLinkTransactions,
    buildHostedCheckoutForm,
    verifyHostedResponseHash,
    HOSTED_PAYMENT_URL,
};

/**
 * Sanitize payment-related text for client APIs (hide gateway names, old DB strings).
 */

export function sanitizeDisplayText(text) {
    if (text == null || text === '') return '';
    let s = String(text).trim();
    const rules = [
        [/payu\s*deposit\s*credited/gi, 'Deposit credited'],
        [/auto-approved\s*via\s*payu\s*hosted/gi, 'Approved'],
        [/auto-approved\s*via\s*payu/gi, 'Approved'],
        [/auto-approved\s*\(\s*online\s*deposit\s*\)/gi, 'Approved'],
        [/auto-approved\s*\(\s*online\s*\)/gi, 'Approved'],
        [/payu\s*hosted/gi, ''],
        [/online\s*deposit/gi, 'deposit'],
        [/payu/gi, ''],
    ];
    for (const [re, rep] of rules) {
        s = s.replace(re, rep);
    }
    s = s.replace(/\s{2,}/g, ' ').replace(/^\(\s*\)$/g, '').trim();
    return s;
}

/** Remarks that add no value once status is shown — omit from API/UI. */
export function isGenericPaymentRemark(text) {
    const s = sanitizeDisplayText(text).toLowerCase();
    if (!s) return true;
    return ['approved', 'deposit', 'deposit credited', 'approved automatically'].includes(s);
}

function toPlain(doc) {
    if (!doc) return doc;
    return typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
}

/** Strip gateway/method fields and clean remarks for admin/bookie/user panels. */
export function toClientPayment(doc) {
    const obj = toPlain(doc);
    if (obj.adminRemarks != null) {
        const cleaned = sanitizeDisplayText(obj.adminRemarks);
        obj.adminRemarks = isGenericPaymentRemark(obj.adminRemarks) ? undefined : cleaned;
    }
    if (obj.userNote) {
        obj.userNote = sanitizeDisplayText(obj.userNote) || undefined;
    }
    delete obj.method;
    delete obj.payuInvoiceNumber;
    return obj;
}

export function toClientWalletTransaction(tx) {
    const obj = toPlain(tx);
    if (obj.description) {
        obj.description = sanitizeDisplayText(obj.description) || obj.description;
    }
    return obj;
}

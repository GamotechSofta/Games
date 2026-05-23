/** Client-side display cleanup (matches backend paymentDisplay.js). */

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
    return s.replace(/\s{2,}/g, ' ').trim();
}

export function isGenericPaymentRemark(text) {
    const s = sanitizeDisplayText(text).toLowerCase();
    if (!s) return true;
    return ['approved', 'deposit', 'deposit credited', 'approved automatically'].includes(s);
}

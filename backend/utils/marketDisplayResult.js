const THREE_DIGITS = /^\d{3}$/;

function sumDigits(str) {
    return [...str].reduce((acc, c) => acc + parseInt(c, 10), 0);
}

function lastDigitOfSum(threeDigitStr) {
    return sumDigits(threeDigitStr) % 10;
}

function getMiddleDigits(openingNumber, closingNumber) {
    if (!openingNumber || !THREE_DIGITS.test(openingNumber)) return null;
    const first = lastDigitOfSum(openingNumber);
    if (!closingNumber || !THREE_DIGITS.test(closingNumber)) return `${first}*`;
    const second = lastDigitOfSum(closingNumber);
    return `${first}${second}`;
}

/** Compute display result string for a lean market document (no Mongoose instance). */
export function computeMarketDisplayResult(market) {
    const opening = market?.openingNumber;
    const closing = market?.closingNumber;
    const marketType = market?.marketType || 'main';
    const isStartline = marketType === 'startline';
    const isKing = marketType === 'king';

    if (isKing) {
        if (!opening || !THREE_DIGITS.test(opening)) return '**';
        if (!closing || !THREE_DIGITS.test(closing)) return '*-*';
        const first = sumDigits(opening) % 10;
        const second = sumDigits(closing) % 10;
        return `${first}${second}`;
    }

    if (isStartline) {
        const openingDisplay = opening && THREE_DIGITS.test(opening) ? opening : '***';
        const digit = opening && THREE_DIGITS.test(opening) ? String(sumDigits(opening) % 10) : '*';
        return `${openingDisplay} - ${digit}`;
    }

    const openingDisplay = opening && THREE_DIGITS.test(opening) ? opening : '***';
    const closingDisplay = closing && THREE_DIGITS.test(closing) ? closing : '***';

    if (!opening || !THREE_DIGITS.test(opening)) {
        return '***-**-***';
    }

    const middle = getMiddleDigits(opening, closing);
    const middleDisplay = middle === null ? '**' : middle.length === 1 ? `${middle}*` : middle;

    return `${openingDisplay}-${middleDisplay}-${closingDisplay}`;
}

export function attachDisplayResults(markets) {
    return (markets || []).map((m) => ({
        ...m,
        displayResult: computeMarketDisplayResult(m),
    }));
}

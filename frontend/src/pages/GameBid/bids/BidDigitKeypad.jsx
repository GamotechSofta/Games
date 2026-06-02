import React, { useCallback, useState } from 'react';

/**
 * Digit pad — each number in a rounded square box.
 */
export default function BidDigitKeypad({
    disabled = false,
    pointsByDigit = {},
    onDigitClick,
    className = '',
    size = 'md',
    selectedDigits = [],
    digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    showPointsBadge = true,
    subtleSelected = false,
}) {
    const [flash, setFlash] = useState(null);
    const selectedSet = new Set((selectedDigits || []).map((d) => String(d)));
    const rows = [
        digits.slice(0, 5),
        digits.slice(5, 10),
    ];

    const handleClick = useCallback(
        (num) => {
            if (disabled) return;
            setFlash(num);
            window.setTimeout(() => setFlash((v) => (v === num ? null : v)), 420);
            onDigitClick?.(num);
        },
        [disabled, onDigitClick]
    );

    const sizeClass =
        size === 'sm' ? 'bid-dial-pad--sm' : size === 'lg' ? 'bid-dial-pad--lg' : '';

    return (
        <div
            className={`bid-dial-pad ${sizeClass} ${disabled ? '' : 'bid-dial-pad--live'} ${className}`.trim()}
            aria-label="Digit selector"
        >
            {rows.map((row, rowIndex) => (
                <div key={rowIndex} className="bid-dial-pad__row">
                    {row.map((num, colIndex) => {
                        const pts = Number(pointsByDigit[num]) || 0;
                        const hasBet = pts > 0 || selectedSet.has(String(num));
                        const delay = rowIndex * 5 + colIndex;

                        return (
                            <button
                                key={num}
                                type="button"
                                disabled={disabled}
                                onClick={() => handleClick(num)}
                                className={`bid-dial-key ${disabled ? 'bid-dial-key--off' : 'bid-dial-key--on'} ${hasBet ? 'bid-dial-key--picked' : ''} ${hasBet && subtleSelected ? 'bid-dial-key--picked-soft' : ''} ${flash === num ? 'bid-dial-key--flash bid-dial-key--tap-glow' : ''}`}
                                style={{ '--dial-i': delay }}
                                aria-label={`Digit ${num}`}
                            >
                                <span className="bid-dial-key__box">
                                    <span className="bid-dial-key__num">{num}</span>
                                </span>
                                {showPointsBadge && hasBet && (
                                    <span className="bid-dial-key__pts" key={pts}>
                                        {pts > 999 ? '999+' : pts}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}

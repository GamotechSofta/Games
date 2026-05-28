import React from 'react';

export const QUICK_POINT_VALUES = [10, 20, 30, 40, 50];

const getQuickPointIconSrc = (pts) => `/images/icons/${pts}_rs_icon-removebg-preview.png`;

export const getQuickPointButtonClass = (selected) =>
    `h-10 sm:h-11 min-w-[2.5rem] sm:min-w-[2.75rem] flex items-center justify-center transition-transform active:scale-[0.98] ${
        selected ? 'scale-105' : 'hover:scale-105'
    }`;

export function QuickPointButton({ pts, selected, onClick, className = '' }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`${getQuickPointButtonClass(selected)} relative ${className}`.trim()}
            aria-label={`Quick points ${pts}`}
        >
            <img
                src={getQuickPointIconSrc(pts)}
                alt={`${pts} points`}
                className={`h-full w-auto object-contain transition-all ${
                    selected
                        ? 'drop-shadow-[0_0_10px_rgba(220,38,38,0.45)] brightness-110'
                        : 'opacity-70 hover:opacity-100'
                }`}
            />
            {selected && (
                <>
                    <span className="absolute -inset-1 rounded-lg border-2 border-red-500/90 pointer-events-none" />
                    <span className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 rounded-full bg-red-600 border border-white shadow-sm pointer-events-none" />
                </>
            )}
        </button>
    );
}

/**
 * Standard Quick Points row — matches SP DP T Motor UI.
 * @param {string|number|null} value — current points (for selected highlight)
 * @param {(pts: number) => void} onSelect
 * @param {(pts: number) => boolean} [isSelected] — override selected check
 */
export default function QuickPointsRow({
    value,
    onSelect,
    isSelected,
    values = QUICK_POINT_VALUES,
    label = 'Quick Points',
    labelClassName = 'shrink-0 w-24 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-200',
    stackedLabel = false,
    stackedLabelSecondLine = 'Points',
    className = '',
}) {
    const checkSelected = isSelected ?? ((pts) => String(value ?? '') === String(pts));

    const labelNode = stackedLabel ? (
        <span className={`${labelClassName} leading-tight flex flex-col`}>
            <span>Quick</span>
            <span>{stackedLabelSecondLine}</span>
        </span>
    ) : (
        <label className={labelClassName}>{label}</label>
    );

    return (
        <div className={`flex items-center gap-2 ${className}`.trim()}>
            {labelNode}
            <div className="flex-1 min-w-0 grid grid-cols-5 gap-2">
                {values.map((pts) => (
                    <QuickPointButton
                        key={pts}
                        pts={pts}
                        selected={checkSelected(pts)}
                        onClick={() => onSelect(pts)}
                    />
                ))}
            </div>
        </div>
    );
}

/** Inline / scroll row (e.g. Jodi Bulk toolbar) — same button style */
export function QuickPointsInline({
    selectedValue,
    onSelect,
    values = QUICK_POINT_VALUES,
    stackedLabel = false,
    className = '',
}) {
    const checkSelected = (pts) => selectedValue === pts || String(selectedValue) === String(pts);

    return (
        <div className={`flex items-center gap-1.5 overflow-x-auto scrollbar-hidden whitespace-nowrap ${className}`.trim()}>
            {stackedLabel ? (
                <span className="mr-1 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-200 shrink-0 leading-tight flex flex-col">
                    <span>Quick</span>
                    <span>Points</span>
                </span>
            ) : (
                <span className="mr-1 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-200 shrink-0">Quick Points</span>
            )}
            {values.map((pts) => (
                <QuickPointButton
                    key={pts}
                    pts={pts}
                    selected={checkSelected(pts)}
                    onClick={() => onSelect(pts)}
                    className="shrink-0 min-w-[2.5rem]"
                />
            ))}
        </div>
    );
}

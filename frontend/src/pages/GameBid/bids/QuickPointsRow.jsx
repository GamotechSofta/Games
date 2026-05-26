import React from 'react';

export const QUICK_POINT_VALUES = [10, 20, 30, 40, 50];

export const getQuickPointButtonClass = (selected) =>
    `min-h-[40px] h-10 rounded-md font-bold text-sm sm:text-base border transition-all active:scale-[0.98] ${
        selected
            ? 'bg-gradient-to-r from-red-700 to-red-600 text-white border-red-700 dark:border-white/25 shadow-[0_10px_20px_rgba(185,28,28,0.18)] dark:shadow-[0_12px_24px_rgba(0,0,0,0.35)]'
            : 'bg-white dark:bg-[#2a1d21] text-red-700 dark:text-red-200 border-red-200 dark:border-white/20 hover:bg-red-50 hover:border-red-300 dark:hover:bg-red-950/35 dark:hover:border-white/30'
    }`;

export function QuickPointButton({ pts, selected, onClick, className = '' }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`${getQuickPointButtonClass(selected)} ${className}`.trim()}
        >
            {pts}
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
    labelClassName = 'shrink-0 w-24 text-xs sm:text-sm font-semibold text-gray-400',
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
                <span className="mr-1 text-xs sm:text-sm font-semibold text-gray-400 shrink-0 leading-tight flex flex-col">
                    <span>Quick</span>
                    <span>Points</span>
                </span>
            ) : (
                <span className="mr-1 text-xs sm:text-sm font-semibold text-gray-400 shrink-0">Quick Points</span>
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

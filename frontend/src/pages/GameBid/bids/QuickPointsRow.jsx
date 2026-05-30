import React from 'react';

export const QUICK_POINT_VALUES = [10, 20, 30, 40, 50];

const getQuickPointIconSrc = (pts) => `/images/icons/${pts}_rs_icon-removebg-preview.png`;

const SIZE_STYLES = {
    sm: {
        btn: 'h-8 sm:h-10',
        gridGap: 'gap-1 sm:gap-1.5',
        rowGap: 'gap-1.5 sm:gap-2',
    },
    lg: {
        btn: 'h-14 sm:h-16 md:h-[4.5rem]',
        gridGap: 'gap-2 sm:gap-3',
        rowGap: 'gap-3 sm:gap-4',
    },
};

export const getQuickPointButtonClass = (selected, size = 'lg') => {
    const h = SIZE_STYLES[size]?.btn ?? SIZE_STYLES.lg.btn;
    return `${h} w-full flex items-center justify-center transition-all active:scale-[0.96] rounded-xl ${
        selected
            ? 'scale-105 drop-shadow-[0_0_14px_rgba(220,38,38,0.35)]'
            : 'opacity-80 hover:opacity-100 hover:scale-105 hover:drop-shadow-[0_0_10px_rgba(220,38,38,0.2)]'
    }`;
};

export function QuickPointButton({ pts, selected, onClick, className = '', size = 'lg' }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`${getQuickPointButtonClass(selected, size)} relative ${className}`.trim()}
            aria-label={`Quick points ${pts}`}
            aria-pressed={selected}
        >
            <img
                src={getQuickPointIconSrc(pts)}
                alt={`${pts} points`}
                className={`h-[88%] w-auto max-w-full object-contain transition-all ${
                    selected ? 'brightness-110 saturate-110' : ''
                }`}
            />
            {selected && (
                <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-full bg-red-600 border-2 border-white dark:border-[#121316] shadow-md pointer-events-none" />
            )}
        </button>
    );
}

/**
 * Standard Quick Points row — premium flat layout (no chip boxes).
 */
export default function QuickPointsRow({
    value,
    onSelect,
    isSelected,
    values = QUICK_POINT_VALUES,
    label = 'Quick Points',
    labelClassName = 'shrink-0 w-28 text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100 tracking-wide',
    stackedLabel = false,
    stackedLabelSecondLine = 'Points',
    className = '',
    size = 'lg',
}) {
    const checkSelected = isSelected ?? ((pts) => String(value ?? '') === String(pts));
    const sizeStyle = SIZE_STYLES[size] ?? SIZE_STYLES.lg;

    const labelNode = stackedLabel ? (
        <span className={`${labelClassName} leading-tight flex flex-col shrink-0`}>
            <span>Quick</span>
            <span>{stackedLabelSecondLine}</span>
        </span>
    ) : (
        <span className={`${labelClassName} shrink-0`}>{label}</span>
    );

    return (
        <div className={`flex items-center ${sizeStyle.rowGap} ${className}`.trim()}>
            {labelNode}
            <div className={`flex-1 min-w-0 grid grid-cols-5 ${sizeStyle.gridGap}`}>
                {values.map((pts) => (
                    <QuickPointButton
                        key={pts}
                        pts={pts}
                        selected={checkSelected(pts)}
                        onClick={() => onSelect(pts)}
                        size={size}
                    />
                ))}
            </div>
        </div>
    );
}

/** Inline / scroll row (e.g. Jodi Bulk toolbar) */
export function QuickPointsInline({
    selectedValue,
    onSelect,
    values = QUICK_POINT_VALUES,
    stackedLabel = false,
    className = '',
    size = 'lg',
}) {
    const checkSelected = (pts) => selectedValue === pts || String(selectedValue) === String(pts);
    const btnH = SIZE_STYLES[size]?.btn ?? SIZE_STYLES.lg.btn;

    return (
        <div className={`flex items-center gap-2 sm:gap-3 overflow-x-auto scrollbar-hidden whitespace-nowrap ${className}`.trim()}>
            {stackedLabel ? (
                <span className="mr-1 text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100 shrink-0 leading-tight flex flex-col">
                    <span>Quick</span>
                    <span>Points</span>
                </span>
            ) : (
                <span className="mr-1 text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100 shrink-0">Quick Points</span>
            )}
            {values.map((pts) => (
                <QuickPointButton
                    key={pts}
                    pts={pts}
                    selected={checkSelected(pts)}
                    onClick={() => onSelect(pts)}
                    className={`shrink-0 min-w-[3.25rem] sm:min-w-[3.75rem] ${btnH}`}
                    size={size}
                />
            ))}
        </div>
    );
}

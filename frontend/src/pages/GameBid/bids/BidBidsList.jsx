import React from 'react';
import { bidRowBg, bidTableHeader } from '../../../styles/appTheme';

/**
 * Standard bet rows table — Pana / Point / Type / Delete (original layout).
 */
export default function BidBidsList({
    rows = [],
    onUpdatePoints,
    onRemove,
    variant = 'mobile',
    className = '',
    numberColumnLabel = 'Pana',
}) {
    const isDesktop = variant === 'desktop';

    const mobileInputClass =
        'w-full h-9 sm:h-10 rounded-lg border border-red-200 dark:border-white/20 bg-white dark:bg-[#202329] text-center font-bold text-gray-900 dark:text-gray-200 focus:border-red-500 dark:focus:border-white/35 text-base focus:outline-none';

    const desktopInputClass =
        'w-full h-8 rounded border border-red-200 dark:border-white/20 bg-white dark:bg-[#202329] text-center font-semibold text-gray-900 dark:text-white text-sm focus:border-red-500 dark:focus:border-white/35 focus:outline-none';

    if (isDesktop) {
        return (
            <div
                className={`rounded-xl border border-red-200 dark:border-white/20 bg-white dark:bg-[#202329] overflow-hidden w-full ${className}`.trim()}
            >
                <div className={`grid grid-cols-4 ${bidTableHeader}`}>
                    <div className="px-2 py-1.5">{numberColumnLabel}</div>
                    <div className="px-2 py-1.5 text-center">Point</div>
                    <div className="px-2 py-1.5 text-center">Type</div>
                    <div className="px-2 py-1.5 text-center">Delete</div>
                </div>
                {rows.map((row) => (
                    <div
                        key={row.id}
                        className="grid grid-cols-4 border-t border-red-200 dark:border-white/20 text-sm items-center"
                    >
                        <div className="px-2 py-1.5 font-semibold text-gray-900 dark:text-white">{row.number}</div>
                        <div className="px-1 py-1">
                            <input
                                type="text"
                                inputMode="numeric"
                                value={row.points}
                                onChange={(e) => onUpdatePoints(row.id, e.target.value)}
                                className={desktopInputClass}
                                aria-label={`Points for ${row.number}`}
                            />
                        </div>
                        <div className="px-2 py-1.5 text-center text-gray-600 dark:text-gray-300">{row.type}</div>
                        <div className="px-2 py-1.5 text-center">
                            <button
                                type="button"
                                onClick={() => onRemove(row.id)}
                                className="text-red-500 hover:text-red-600"
                                aria-label={`Remove ${row.number}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className={className}>
            <div className="grid grid-cols-4 gap-1 sm:gap-2 text-center text-red-700 dark:text-red-200 font-bold text-sm sm:text-base mb-2 px-1">
                <div>{numberColumnLabel}</div>
                <div>Point</div>
                <div>Type</div>
                <div>Delete</div>
            </div>
            <div className="h-px bg-gray-200 dark:bg-white/20 w-full mb-2" />
            <div className="space-y-2">
                {rows.map((row) => (
                    <div
                        key={row.id}
                        className={`grid grid-cols-4 gap-1 sm:gap-2 text-center items-center py-2.5 px-2 rounded-lg border border-red-200 dark:border-white/20 text-base ${bidRowBg}`}
                    >
                        <div className="font-bold text-lg text-gray-900 dark:text-white">{row.number}</div>
                        <div className="px-0.5 min-w-0">
                            <input
                                type="text"
                                inputMode="numeric"
                                value={row.points}
                                onChange={(e) => onUpdatePoints(row.id, e.target.value)}
                                className={mobileInputClass}
                                aria-label={`Points for ${row.number}`}
                            />
                        </div>
                        <div className="text-base sm:text-lg text-gray-600 dark:text-gray-300">{row.type}</div>
                        <div className="flex justify-center">
                            <button
                                type="button"
                                onClick={() => onRemove(row.id)}
                                className="p-2 text-red-500 hover:text-red-600 active:scale-95"
                                aria-label={`Remove ${row.number}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path
                                        fillRule="evenodd"
                                        d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

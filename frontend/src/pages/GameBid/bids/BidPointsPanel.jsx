import React from 'react';
import QuickPointsRow from './QuickPointsRow';
import { bidPointsSection, bidPointsLabel, bidPointsInput, bidClearBtnLg } from '../../../styles/appTheme';

/**
 * Points entry — boxed input + quick chips.
 */
export default function BidPointsPanel({
    pointsValue,
    onPointsChange,
    onClear,
    onQuickSelect,
    placeholder = 'Points',
    enterLabel = 'Enter Points',
    maxLength = 6,
    className = '',
    labelWidthClass = 'w-[6.5rem] sm:w-28',
}) {
    return (
        <div className={`${bidPointsSection} ${className}`.trim()}>
            <div className="flex items-center gap-3 sm:gap-4">
                <span className={`${bidPointsLabel} ${labelWidthClass} shrink-0`}>{enterLabel}</span>
                <div className="flex-1 min-w-0 flex items-center gap-2 sm:gap-3">
                    <input
                        type="text"
                        inputMode="numeric"
                        value={pointsValue}
                        onChange={(e) => onPointsChange((e.target.value ?? '').replace(/\D/g, '').slice(0, maxLength))}
                        placeholder={placeholder}
                        className={bidPointsInput}
                    />
                    <button type="button" onClick={onClear} className={bidClearBtnLg}>
                        Clear
                    </button>
                </div>
            </div>
            <QuickPointsRow
                value={pointsValue}
                onSelect={onQuickSelect}
                size="lg"
                labelClassName={`${bidPointsLabel} ${labelWidthClass} shrink-0`}
            />
        </div>
    );
}

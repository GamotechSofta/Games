import React from 'react';
import { bidStatInlineGrid, bidStatInlineCell, bidMetaLabel, bidMetaValue, bidMetaInlineRow } from '../../styles/appTheme';

/** Count + bet amount row — flat grid, no boxes */
export default function BidInlineStats({
    count,
    amount,
    countLabel = 'Count',
    amountLabel = 'Bet Amount',
    className = '',
}) {
    return (
        <div className={`${bidStatInlineGrid} ${className}`.trim()}>
            <div className={bidStatInlineCell}>
                <div className={bidMetaLabel}>{countLabel}</div>
                <div className={`leading-tight ${bidMetaValue}`}>{count}</div>
            </div>
            <div className={bidStatInlineCell}>
                <div className={bidMetaLabel}>{amountLabel}</div>
                <div className={`leading-tight ${bidMetaValue}`}>{amount}</div>
            </div>
        </div>
    );
}

/** Desktop-only flat stats (pairs with showInlineStats on mobile) */
export function BidDesktopStats({
    count,
    amount,
    countLabel = 'Count',
    amountLabel = 'Bet Amount',
    className = '',
}) {
    return (
        <div className={`hidden md:flex pr-12 pl-1 pb-1 justify-end w-full ${className}`.trim()}>
            <div className={bidMetaInlineRow}>
                <div className="px-4 py-1 text-center">
                    <div className={bidMetaLabel}>{countLabel}</div>
                    <div className={`leading-tight ${bidMetaValue}`}>{count}</div>
                </div>
                <div className="px-4 py-1 text-center">
                    <div className={bidMetaLabel}>{amountLabel}</div>
                    <div className={`leading-tight ${bidMetaValue}`}>{amount}</div>
                </div>
            </div>
        </div>
    );
}

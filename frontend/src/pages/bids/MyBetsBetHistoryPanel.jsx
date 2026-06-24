import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  betHistoryCopyToast,
  betHistoryEmpty,
  betHistoryIndexLabel,
  getBetCardClasses,
  getBetStatusDisplay,
  getSessionBadgeClasses,
} from './betHistoryTheme';

const copyToClipboard = (text, onSuccess) => {
  const s = String(text || '').trim();
  if (!s) return;
  navigator.clipboard?.writeText(s).then(() => onSuccess?.()).catch(() => {});
};

const formatScheduledDate = (scheduledDate) => {
  if (!scheduledDate) return null;
  try {
    const d = typeof scheduledDate === 'string' ? new Date(scheduledDate) : scheduledDate;
    if (Number.isNaN(d?.getTime())) return null;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/');
  } catch {
    return null;
  }
};

/**
 * Bet History panel for My Bets (desktop).
 */
export default function MyBetsBetHistoryPanel({
  desktopBetHistoryUid,
  groupedDesktopByMarket = [],
  formatTxnTime,
  hasMore = false,
  isFetching = false,
  onLoadMore,
}) {
  const { t } = useTranslation();
  const allBetsNewestFirst = useMemo(() => {
    const flat = [];
    for (const { bets } of groupedDesktopByMarket || []) {
      for (const row of bets || []) flat.push(row);
    }
    return flat.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [groupedDesktopByMarket]);

  const [copyToast, setCopyToast] = useState('');

  return (
    <div className={allBetsNewestFirst.length ? 'mt-0' : 'mt-2'}>
      {copyToast && (
        <div className={betHistoryCopyToast}>
          {copyToast}
        </div>
      )}

      <div className="max-h-[calc(100vh-220px)] overflow-y-auto hide-scrollbar">
        {!desktopBetHistoryUid ? (
          <div className={betHistoryEmpty}>
            {t('bids.loginToSeeHistory')}
          </div>
        ) : allBetsNewestFirst.length === 0 ? (
          <div className={betHistoryEmpty}>
            {t('bids.noBetsFound')}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 overflow-x-hidden">
            {allBetsNewestFirst.map((row, idx) => {
              const { betId, betValue, gameType, points, session, verdict, createdAt } = row;
              const isScheduled = row.bet?.scheduledDate || row.bet?.isScheduled;
              const scheduledDateStr = formatScheduledDate(row.bet?.scheduledDate);
              const marketTitle = row.market || row.marketTitle || 'MARKET';
              const status = getBetStatusDisplay(t, verdict);
              return (
                <div
                  key={betId}
                  className={getBetCardClasses(verdict?.state)}
                >
                  {verdict?.state === 'cancelled' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-red-100/50 dark:bg-black/50 z-10 pointer-events-none">
                      <svg className="w-12 h-12 text-red-600 dark:text-red-400 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </div>
                  )}
                  <div className="flex justify-between items-center gap-1 flex-wrap">
                    <span className={`${betHistoryIndexLabel} shrink-0`}>#{idx + 1}</span>
                    {session ? <span className={getSessionBadgeClasses(session)}>{session}</span> : null}
                  </div>
                  <div className="flex justify-between items-center gap-1 text-[10px]">
                    <span className="text-gray-500 dark:text-gray-400 shrink-0">{t('bids.betIdLabel')}</span>
                    <span className="flex items-center gap-1 min-w-0">
                      <span className="font-mono text-gray-700 dark:text-gray-300 truncate" title={betId}>{String(betId || '').slice(-8)}</span>
                      <button type="button" onClick={(e) => { e.stopPropagation(); copyToClipboard(betId, () => { setCopyToast(t('bids.betIdCopied')); setTimeout(() => setCopyToast(''), 2000); }); }} className="shrink-0 p-0.5 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors" title={t('bids.copyBetId')} aria-label={t('bids.copyBetId')}>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      </button>
                    </span>
                  </div>
                  {isScheduled && (
                    <div className="text-[9px] font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded px-1.5 py-0.5 inline-block shrink-0">
                      {t('bids.scheduledBet')}{scheduledDateStr ? ` · ${scheduledDateStr}` : ''}
                    </div>
                  )}
                  <p className="text-[10px] text-gray-600 dark:text-gray-400 truncate" title={marketTitle}>{String(marketTitle).toUpperCase() || 'MARKET'}</p>
                  <div className="flex justify-between gap-1 text-xs">
                    <span className="text-gray-500 dark:text-gray-400 shrink-0">{t('bids.gameLabel')}</span>
                    <span className="text-gray-900 dark:text-white font-medium truncate">{gameType}</span>
                  </div>
                  <div className="flex justify-between gap-1 text-xs">
                    <span className="text-gray-500 dark:text-gray-400 shrink-0">{t('bids.betLabel')}</span>
                    <span className="text-gray-900 dark:text-white font-bold truncate">{betValue}</span>
                  </div>
                  <div className="flex justify-between gap-1 text-xs">
                    <span className="text-gray-500 dark:text-gray-400 shrink-0">{t('bids.pointsLabel')}</span>
                    <span className="text-gray-900 dark:text-white font-semibold">{points}</span>
                  </div>
                  <div className="flex justify-between gap-1 text-xs items-center min-w-0">
                    <span className="text-gray-500 dark:text-gray-400 shrink-0">{t('bids.statusLabel')}</span>
                    <span className={`${status.className} truncate text-[10px]`}>{status.text}{verdict?.state === 'won' && verdict?.payout > 0 ? ` ₹${Number(verdict.payout).toLocaleString('en-IN')}` : ''}</span>
                  </div>
                  <div className="flex justify-between gap-1 text-[10px]">
                    <span className="text-gray-500 dark:text-gray-400 shrink-0">{t('bids.timeLabel')}</span>
                    <span className="text-gray-600 dark:text-gray-300 truncate">{formatTxnTime(createdAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {hasMore ? (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isFetching}
            className="px-6 py-2.5 rounded-xl bg-[#d4af37] border border-[#c9a227] text-black font-bold text-sm hover:brightness-105 disabled:opacity-60 transition"
          >
            {isFetching ? t('common.loading') : t('bids.loadMoreBets', { defaultValue: 'Load more bets' })}
          </button>
        </div>
      ) : null}
    </div>
  );
}

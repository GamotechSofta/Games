import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

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
 * Bet History panel for My Bets (desktop): same card layout as mobile view.
 */
export default function MyBetsBetHistoryPanel({
  desktopBetHistoryUid,
  groupedDesktopByMarket = [],
  cancelMessage,
  onCancelBetClick,
  cancellingBetId,
  formatTxnTime,
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
  const statusLabel = (verdict) => {
    if (!verdict) return { text: '—', className: 'text-gray-500' };
    if (verdict.state === 'won') return { text: t('bids.status.win'), className: 'text-[#43b36a] font-semibold' };
    if (verdict.state === 'lost') return { text: t('bids.status.lost'), className: 'text-red-400 font-semibold' };
    if (verdict.state === 'cancelled') return { text: t('bids.status.cancelled'), className: 'text-orange-600 dark:text-orange-400 font-semibold' };
    return { text: t('bids.status.pending'), className: 'text-amber-400/90 font-medium' };
  };

  return (
    <div className={allBetsNewestFirst.length ? 'mt-0' : 'mt-6'}>
      {copyToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[1100] px-4 py-2.5 rounded-lg bg-[#d4af37] text-black font-semibold text-sm shadow-lg">
          {copyToast}
        </div>
      )}
      {cancelMessage?.text && (
        <div
          className={`mb-3 rounded-xl px-4 py-3 text-sm ${
            cancelMessage.type === 'success'
              ? 'bg-green-500/10 border border-green-500/30 text-green-200'
              : 'bg-red-500/10 border border-red-500/30 text-red-200'
          }`}
        >
          {cancelMessage.text}
        </div>
      )}

      <div className="max-h-[calc(100vh-220px)] overflow-y-auto hide-scrollbar">
        {!desktopBetHistoryUid ? (
          <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-black/20 p-4 text-gray-300 text-sm">
            {t('bids.loginToSeeHistory')}
          </div>
        ) : allBetsNewestFirst.length === 0 ? (
          <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-black/20 p-4 text-gray-300 text-sm">
            {t('bids.noBetsFound')}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 overflow-x-hidden">
            {allBetsNewestFirst.map((row, idx) => {
              const { betId, betValue, gameType, points, session, verdict, createdAt, canCancel } = row;
              const isScheduled = row.bet?.scheduledDate || row.bet?.isScheduled;
              const scheduledDateStr = formatScheduledDate(row.bet?.scheduledDate);
              const marketTitle = row.market || row.marketTitle || 'MARKET';
              const status = statusLabel(verdict);
              return (
                <div
                  key={betId}
                  className={`relative rounded-lg border-2 p-2 space-y-1.5 min-w-0 shadow-[0_8px_20px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_20px_rgba(0,0,0,0.3)] overflow-hidden ${
                    verdict?.state === 'cancelled'
                      ? 'bg-orange-50 dark:bg-[#202124] border-orange-400'
                      : 'bg-white dark:bg-[#202124] ' + (
                    verdict?.state === 'won'
                      ? 'border-[#43b36a]'
                      : verdict?.state === 'lost'
                        ? 'border-red-500'
                        : verdict?.state === 'pending'
                          ? 'border-amber-500'
                          : 'border-gray-200 dark:border-white/10'
                  )}`}
                >
                  {verdict?.state === 'cancelled' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-orange-100/60 dark:bg-black/50 z-10 pointer-events-none">
                      <svg className="w-12 h-12 text-orange-600 dark:text-orange-400 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </div>
                  )}
                  <div className="flex justify-between items-center gap-1 flex-wrap">
                    <span className="text-[#d4af37] text-[10px] font-semibold shrink-0">#{idx + 1}</span>
                    {session ? <span className="text-[9px] font-bold text-[#d4af37] border border-[#d4af37]/30 rounded px-1 py-0.5 shrink-0">{session}</span> : null}
                  </div>
                  <div className="flex justify-between items-center gap-1 text-[10px]">
                    <span className="text-gray-500 dark:text-gray-400 shrink-0">{t('bids.betIdLabel')}</span>
                    <span className="flex items-center gap-1 min-w-0">
                      <span className="font-mono text-gray-700 dark:text-gray-300 truncate" title={betId}>{String(betId || '').slice(-8)}</span>
                      <button type="button" onClick={(e) => { e.stopPropagation(); copyToClipboard(betId, () => { setCopyToast(t('bids.betIdCopied')); setTimeout(() => setCopyToast(''), 2000); }); }} className="shrink-0 p-0.5 text-gray-500 dark:text-gray-400 hover:text-[#d4af37] transition-colors" title={t('bids.copyBetId')} aria-label={t('bids.copyBetId')}>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      </button>
                    </span>
                  </div>
                  {isScheduled && (
                    <div className="text-[9px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded px-1.5 py-0.5 inline-block shrink-0">
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
                  {verdict?.state === 'pending' && canCancel?.canCancel && (
                    <div className="pt-1.5 border-t border-gray-200 dark:border-white/10">
                      <button
                        type="button"
                        onClick={() => onCancelBetClick(betId)}
                        disabled={cancellingBetId === betId}
                        title={t('bids.cancelAndRefund')}
                        className="w-full inline-flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-semibold min-h-[36px] bg-gray-200 border border-gray-300 text-gray-900 hover:bg-gray-300 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:hover:bg-gray-700 disabled:opacity-60 disabled:cursor-wait"
                      >
                        {cancellingBetId === betId ? (
                          <>
                            <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            {t('bids.cancelling')}
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            {t('bids.cancelAndRefund')}
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

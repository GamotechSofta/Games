import React, { useMemo } from 'react';

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
  const allBetsNewestFirst = useMemo(() => {
    const flat = [];
    for (const { bets } of groupedDesktopByMarket || []) {
      for (const row of bets || []) flat.push(row);
    }
    return flat.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [groupedDesktopByMarket]);

  const statusLabel = (verdict) => {
    if (!verdict) return { text: '—', className: 'text-gray-500' };
    if (verdict.state === 'won') return { text: 'Won', className: 'text-[#43b36a] font-semibold' };
    if (verdict.state === 'lost') return { text: 'Lost', className: 'text-red-400 font-semibold' };
    if (verdict.state === 'cancelled') return { text: 'Cancelled', className: 'text-orange-400 font-semibold' };
    return { text: 'Pending', className: 'text-amber-400/90 font-medium' };
  };

  return (
    <div className={allBetsNewestFirst.length ? 'mt-0' : 'mt-6'}>
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
          <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-gray-300 text-sm">
            Please login to see your bet history.
          </div>
        ) : allBetsNewestFirst.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-gray-300 text-sm">
            No bets found.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 overflow-x-hidden">
            {allBetsNewestFirst.map((row, idx) => {
              const { betId, betValue, gameType, points, session, verdict, createdAt, canCancel } = row;
              const marketTitle = row.market || row.marketTitle || 'MARKET';
              const status = statusLabel(verdict);
              return (
                <div
                  key={betId}
                  className={`relative rounded-lg border-2 bg-[#202124] p-2 space-y-1.5 min-w-0 shadow-[0_8px_20px_rgba(0,0,0,0.3)] overflow-hidden ${
                    verdict?.state === 'won'
                      ? 'border-[#43b36a]'
                      : verdict?.state === 'lost'
                        ? 'border-red-500'
                        : verdict?.state === 'pending'
                          ? 'border-amber-500'
                          : verdict?.state === 'cancelled'
                            ? 'border-orange-400'
                            : 'border-white/10'
                  }`}
                >
                  {verdict?.state === 'cancelled' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10 pointer-events-none">
                      <svg className="w-12 h-12 text-orange-400 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </div>
                  )}
                  <div className="flex justify-between items-center gap-1 flex-wrap">
                    <span className="text-[#d4af37] text-[10px] font-semibold shrink-0">#{idx + 1}</span>
                    {session ? <span className="text-[9px] font-bold text-[#d4af37] border border-[#d4af37]/30 rounded px-1 py-0.5 shrink-0">{session}</span> : null}
                  </div>
                  <p className="text-[10px] text-gray-400 truncate" title={marketTitle}>{String(marketTitle).toUpperCase() || 'MARKET'}</p>
                  <div className="flex justify-between gap-1 text-xs">
                    <span className="text-gray-400 shrink-0">Game</span>
                    <span className="text-white font-medium truncate">{gameType}</span>
                  </div>
                  <div className="flex justify-between gap-1 text-xs">
                    <span className="text-gray-400 shrink-0">Bet</span>
                    <span className="text-white font-bold truncate">{betValue}</span>
                  </div>
                  <div className="flex justify-between gap-1 text-xs">
                    <span className="text-gray-400 shrink-0">Points</span>
                    <span className="text-white font-semibold">{points}</span>
                  </div>
                  <div className="flex justify-between gap-1 text-xs items-center min-w-0">
                    <span className="text-gray-400 shrink-0">Status</span>
                    <span className={`${status.className} truncate text-[10px]`}>{status.text}{verdict?.state === 'won' && verdict?.payout > 0 ? ` ₹${Number(verdict.payout).toLocaleString('en-IN')}` : ''}</span>
                  </div>
                  <div className="flex justify-between gap-1 text-[10px]">
                    <span className="text-gray-400 shrink-0">Time</span>
                    <span className="text-gray-300 truncate">{formatTxnTime(createdAt)}</span>
                  </div>
                  {verdict?.state === 'pending' && canCancel?.canCancel && (
                    <div className="pt-1.5 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => onCancelBetClick(betId)}
                        disabled={cancellingBetId === betId}
                        title="Cancel & refund"
                        className="w-full inline-flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-semibold min-h-[36px] bg-gray-800 border border-gray-600 text-white hover:bg-gray-700 disabled:opacity-60 disabled:cursor-wait"
                      >
                        {cancellingBetId === betId ? (
                          <>
                            <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Cancelling...
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Cancel & refund
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

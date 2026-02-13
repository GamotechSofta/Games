import React from 'react';

/**
 * Bet History panel for My Bets (desktop): grouped by market with table.
 */
export default function MyBetsBetHistoryPanel({
  desktopBetHistoryUid,
  groupedDesktopByMarket = [],
  cancelMessage,
  onCancelBetClick,
  cancellingBetId,
  formatTxnTime,
}) {
  return (
    <div className={groupedDesktopByMarket.length ? 'mt-0' : 'mt-6'}>
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
        ) : groupedDesktopByMarket.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-gray-300 text-sm">
            No bets found.
          </div>
        ) : (
          <div className="space-y-4">
            {groupedDesktopByMarket.map(({ marketKey, marketTitle, bets }) => (
              <section key={marketKey} className="rounded-xl overflow-hidden border border-white/10 bg-black/25">
                <div className="bg-[#0b2b55] px-4 py-2.5 border-b border-white/10">
                  <h3 className="text-white font-extrabold tracking-wide truncate text-sm">
                    {marketTitle.toUpperCase()}
                  </h3>
                  <p className="text-[#d4af37]/90 text-xs mt-0.5">
                    {bets.length} bet{bets.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[580px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-white/10 bg-black/20">
                        <th className="text-left py-2 px-2 text-[#d4af37] font-bold text-xs uppercase tracking-wider">
                          #
                        </th>
                        <th className="text-left py-2 px-2 text-[#d4af37] font-bold text-xs uppercase tracking-wider">
                          Game Type
                        </th>
                        <th className="text-left py-2 px-2 text-[#d4af37] font-bold text-xs uppercase tracking-wider">
                          Bet
                        </th>
                        <th className="text-center py-2 px-2 text-[#d4af37] font-bold text-xs uppercase tracking-wider">
                          Session
                        </th>
                        <th className="text-right py-2 px-2 text-[#d4af37] font-bold text-xs uppercase tracking-wider">
                          Points
                        </th>
                        <th className="text-center py-2 px-2 text-[#d4af37] font-bold text-xs uppercase tracking-wider">
                          Status
                        </th>
                        <th className="text-left py-2 px-2 text-[#d4af37] font-bold text-xs uppercase tracking-wider">
                          Time
                        </th>
                        <th className="text-center py-2 px-2 text-[#d4af37] font-bold text-xs uppercase tracking-wider w-24">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {bets.map((row, idx) => {
                        const { betId, betValue, gameType, points, session, verdict, createdAt, canCancel } = row;
                        const statusCls =
                          verdict.state === 'won'
                            ? 'text-[#43b36a] font-semibold'
                            : verdict.state === 'lost'
                              ? 'text-red-400 font-semibold'
                              : verdict.state === 'cancelled'
                                ? 'text-orange-400 font-semibold'
                                : 'text-amber-400/90 font-medium';
                        const statusText =
                          verdict.state === 'won'
                            ? 'Won'
                            : verdict.state === 'lost'
                              ? 'Lost'
                              : verdict.state === 'cancelled'
                                ? 'Cancelled'
                                : 'Pending';
                        return (
                          <tr key={betId} className="border-b border-white/5 hover:bg-white/[0.03]">
                            <td className="py-2 px-2 text-gray-400 text-xs">{idx + 1}</td>
                            <td className="py-2 px-2 text-white font-medium">{gameType}</td>
                            <td className="py-2 px-2 text-white font-semibold">{betValue}</td>
                            <td className="py-2 px-2 text-center">
                              {session ? (
                                <span className="text-[10px] font-bold text-[#d4af37] border border-[#d4af37]/30 rounded px-1.5 py-0.5">
                                  {session}
                                </span>
                              ) : (
                                <span className="text-gray-500">—</span>
                              )}
                            </td>
                            <td className="py-2 px-2 text-right text-white font-semibold">{points}</td>
                            <td className="py-2 px-2 text-center">
                              <span className={statusCls}>{statusText}</span>
                              {verdict.state === 'won' && verdict.payout > 0 && (
                                <div className="text-[#43b36a] text-[10px]">
                                  ₹{Number(verdict.payout).toLocaleString('en-IN')}
                                </div>
                              )}
                            </td>
                            <td className="py-2 px-2 text-gray-400 text-xs whitespace-nowrap">
                              {formatTxnTime(createdAt)}
                            </td>
                            <td className="py-2 px-2 text-center">
                              {verdict.state === 'pending' && canCancel?.canCancel ? (
                                <button
                                  type="button"
                                  onClick={() => onCancelBetClick(betId)}
                                  disabled={cancellingBetId === betId}
                                  className="inline-flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-semibold min-h-[32px] bg-gray-800 border border-gray-600 text-white hover:bg-gray-700 hover:border-amber-500/50 disabled:opacity-60"
                                  title="Cancel & refund"
                                >
                                  {cancellingBetId === betId ? (
                                    <svg
                                      className="animate-spin h-3 w-3 shrink-0"
                                      xmlns="http://www.w3.org/2000/svg"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                    >
                                      <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                      />
                                      <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                      />
                                    </svg>
                                  ) : (
                                    <>
                                      <svg
                                        className="w-3 h-3 shrink-0"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                        />
                                      </svg>
                                      <span>Cancel</span>
                                    </>
                                  )}
                                </button>
                              ) : verdict.state !== 'pending' ? (
                                <span className="text-gray-500 text-[10px]">—</span>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

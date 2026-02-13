import React from 'react';
import ResultDatePicker from '../../components/ResultDatePicker';

/**
 * Game Results panel for My Bets: date selector + market results table/cards.
 */
export default function MyBetsGameResultsPanel({
  resultsDate,
  onResultsDateChange,
  resultsRows = [],
}) {
  return (
    <div className="mt-3">
      <div className="mb-3 rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[#d4af37] text-xs font-semibold uppercase tracking-wider">Results for</p>
          <p className="text-white font-bold text-sm sm:text-base mt-0.5">
            {resultsDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <div className="md:hidden shrink-0">
          <ResultDatePicker
            value={resultsDate}
            onChange={onResultsDateChange}
            maxDate={new Date()}
            label="Date"
            buttonClassName="px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white font-semibold text-xs hover:border-[#d4af37]/40 transition-colors"
          />
        </div>
      </div>
      <div className="max-h-[calc(100vh-300px)] overflow-y-auto hide-scrollbar">
        {resultsRows.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#202124] p-6 text-center text-gray-300">
            No results for this date.
          </div>
        ) : (
          <>
            <div className="hidden md:block rounded-xl overflow-hidden border border-white/10 bg-black/25">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[320px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-black/20">
                      <th className="text-left py-2.5 px-3 text-[#d4af37] font-bold text-xs uppercase tracking-wider">
                        #
                      </th>
                      <th className="text-left py-2.5 px-3 text-[#d4af37] font-bold text-xs uppercase tracking-wider">
                        Market
                      </th>
                      <th className="text-right py-2.5 px-3 text-[#d4af37] font-bold text-xs uppercase tracking-wider">
                        Result
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultsRows.map((r, idx) => (
                      <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                        <td className="py-2 px-3 text-gray-400 text-xs">{idx + 1}</td>
                        <td className="py-2 px-3 text-white font-semibold tracking-wide truncate max-w-[200px]">
                          {r.name}
                        </td>
                        <td className="py-2 px-3 text-right font-extrabold tracking-wide text-[#d4af37] shrink-0">
                          {r.result}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="md:hidden space-y-3">
              {resultsRows.map((r) => (
                <div
                  key={r.id}
                  className="rounded-2xl bg-[#202124] border border-white/10 px-4 py-3 shadow-[0_10px_22px_rgba(0,0,0,0.35)] flex items-center justify-between gap-3"
                >
                  <span className="font-semibold text-white text-sm truncate flex-1 min-w-0">{r.name}</span>
                  <span className="font-extrabold tracking-wide text-[#d4af37] shrink-0 text-sm">{r.result}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

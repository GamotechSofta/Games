import React from 'react';
import { useTranslation } from 'react-i18next';
import ResultDatePicker from '../../components/ResultDatePicker';
import { bidAccent, bidTableHeader, textPrimary } from '../../styles/appTheme';

/**
 * Game Results panel: date banner + market results table/cards.
 */
export default function MyBetsGameResultsPanel({
  resultsDate,
  onResultsDateChange,
  resultsRows = [],
  showMobileDatePicker = true,
}) {
  const { t } = useTranslation();

  const dateLabel = resultsDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="mt-3">
      <div className="mb-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#202124]/80 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-wider ${bidAccent}`}>{t('bids.resultsFor')}</p>
          <p className={`font-bold text-sm sm:text-base mt-0.5 ${textPrimary}`}>{dateLabel}</p>
        </div>
        {showMobileDatePicker ? (
          <div className="md:hidden shrink-0">
            <ResultDatePicker
              value={resultsDate}
              onChange={onResultsDateChange}
              maxDate={new Date()}
              label={t('bids.date')}
              buttonClassName="px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-900 font-semibold text-xs hover:border-amber-400 dark:bg-[#202124] dark:border-white/10 dark:text-white dark:hover:border-[#d4af37]/40 transition-colors"
            />
          </div>
        ) : null}
      </div>

      <div className="max-h-[calc(100vh-300px)] overflow-y-auto hide-scrollbar">
        {resultsRows.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#202124] p-6 text-center text-gray-500 dark:text-gray-300">
            {t('bids.noResultsForDate')}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 bg-white dark:bg-[#202124] shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[320px] border-collapse text-sm">
                  <thead>
                    <tr className={`border-b border-gray-200 dark:border-white/10 ${bidTableHeader}`}>
                      <th className="text-left py-2.5 px-3 font-bold text-xs uppercase tracking-wider w-12">
                        #
                      </th>
                      <th className="text-left py-2.5 px-3 font-bold text-xs uppercase tracking-wider">
                        {t('bids.market')}
                      </th>
                      <th className="text-right py-2.5 px-3 font-bold text-xs uppercase tracking-wider">
                        {t('bids.result')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultsRows.map((r, idx) => (
                      <tr
                        key={r.id}
                        className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/[0.03] last:border-b-0"
                      >
                        <td className="py-2.5 px-3 text-gray-500 dark:text-gray-400 text-xs tabular-nums">
                          {idx + 1}
                        </td>
                        <td className={`py-2.5 px-3 font-semibold tracking-wide truncate max-w-[280px] ${textPrimary}`}>
                          {r.name}
                        </td>
                        <td className={`py-2.5 px-3 text-right font-extrabold tracking-wide shrink-0 tabular-nums ${bidAccent}`}>
                          {r.result}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {resultsRows.map((r) => (
                <div
                  key={r.id}
                  className="rounded-2xl bg-white dark:bg-[#202124] border border-gray-200 dark:border-white/10 px-4 py-3 shadow-sm dark:shadow-[0_10px_22px_rgba(0,0,0,0.35)] flex items-center justify-between gap-3"
                >
                  <span className={`font-semibold text-sm truncate flex-1 min-w-0 ${textPrimary}`}>{r.name}</span>
                  <span className={`font-extrabold tracking-wide shrink-0 text-sm ${bidAccent}`}>{r.result}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

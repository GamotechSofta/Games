import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useGameRates, { DEFAULT_RATES } from '../hooks/useGameRates';
import {
  backBtn,
  bidAccent,
  bidSurface,
  pageShell,
  textMuted,
} from '../styles/appTheme';

const rateRedClass = 'font-bold tabular-nums text-red-600 dark:text-red-500';
const rateHeaderRedClass =
  'font-bold text-xs uppercase tracking-wider text-red-600 dark:text-red-500 !text-red-600 dark:!text-red-500';

const getGameLabels = (t) => [
  { key: 'single', label: t('gameRate.singleDigit') },
  { key: 'jodi', label: t('gameRate.jodi') },
  { key: 'singlePatti', label: t('gameRate.singlePatti') },
  { key: 'doublePatti', label: t('gameRate.doublePatti') },
  { key: 'triplePatti', label: t('gameRate.triplePatti') },
  { key: 'halfSangam', label: t('gameRate.halfSangam') },
  { key: 'fullSangam', label: t('gameRate.fullSangam') },
];

const GameRate = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { rates, loading, error } = useGameRates();

  const rateMap = rates || DEFAULT_RATES;
  const GAME_LABELS = getGameLabels(t);
  const rows = GAME_LABELS.map((g, idx) => ({
    srNo: idx + 1,
    game: g.label,
    rate: rateMap[g.key] ?? DEFAULT_RATES[g.key],
  }));

  return (
    <div className={`${pageShell} min-h-screen`}>
      <div className="mx-auto w-full max-w-2xl px-4 sm:px-6 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] pt-4 sm:pt-6">
        <div className="flex items-center gap-3 mb-5 sm:mb-6">
          <button type="button" onClick={() => navigate(-1)} className={backBtn} aria-label={t('common.back')}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              {t('header.updateRate')}
            </h1>
            <p className={`text-xs sm:text-sm mt-0.5 ${textMuted}`}>
              {t('gameRate.subtitle', { defaultValue: 'Payout rate per ₹1 bet' })}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className={`rounded-2xl overflow-hidden shadow-sm ${bidSurface}`}>
          <div className="h-0.5 bg-gradient-to-r from-red-700 to-red-600" />

          {loading ? (
            <div className="p-6 space-y-3 skeleton-shimmer">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div key={i} className="flex gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gray-200 dark:bg-white/10 shrink-0" />
                  <div className="h-10 flex-1 rounded-lg bg-gray-200 dark:bg-white/10" />
                  <div className="h-10 w-16 rounded-lg bg-gray-200 dark:bg-white/10 shrink-0" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-red-200 dark:border-white/20 bg-gray-50 dark:bg-white/10">
                      <th className="text-left py-3.5 px-4 font-bold text-xs uppercase tracking-wider text-red-700 dark:text-gray-200">
                        {t('gameRate.srNo', { defaultValue: 'Sr No' })}
                      </th>
                      <th className="text-left py-3.5 px-4 font-bold text-xs uppercase tracking-wider text-red-700 dark:text-gray-200">
                        {t('gameRate.gameColumn', { defaultValue: 'Game' })}
                      </th>
                      <th className={`text-right py-3.5 px-4 ${rateHeaderRedClass}`}>
                        {t('gameRate.rateColumn', { defaultValue: 'Rate (1 =)' })}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => (
                      <tr
                        key={row.game}
                        className={`border-b border-red-100 dark:border-white/10 last:border-b-0 transition-colors hover:bg-red-50/50 dark:hover:bg-white/[0.04] ${
                          idx % 2 === 1 ? 'bg-gray-50/80 dark:bg-white/[0.02]' : 'bg-white dark:bg-transparent'
                        }`}
                      >
                        <td className={`py-3.5 px-4 text-sm ${textMuted}`}>{row.srNo}</td>
                        <td className="py-3.5 px-4 font-medium text-gray-900 dark:text-white">{row.game}</td>
                        <td className={`py-3.5 px-4 text-right text-base ${rateRedClass}`}>
                          {row.rate}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="sm:hidden divide-y divide-red-100 dark:divide-white/10">
                {rows.map((row) => (
                  <div
                    key={row.game}
                    className="flex items-center gap-3 px-4 py-3.5 bg-white dark:bg-transparent active:bg-red-50/60 dark:active:bg-white/[0.04]"
                  >
                    <span
                      className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold border border-red-200 dark:border-white/20 bg-gray-50 dark:bg-white/10 ${bidAccent}`}
                    >
                      {row.srNo}
                    </span>
                    <span className="flex-1 min-w-0 font-medium text-sm text-gray-900 dark:text-white truncate">
                      {row.game}
                    </span>
                    <span className={`shrink-0 text-base ${rateRedClass}`}>{row.rate}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameRate;

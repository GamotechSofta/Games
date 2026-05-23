import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getRatesCurrent } from '../api/bets';

const getGameLabels = (t) => [
  { key: 'single', label: t('gameRate.singleDigit') },
  { key: 'jodi', label: t('gameRate.jodi') },
  { key: 'singlePatti', label: t('gameRate.singlePatti') },
  { key: 'doublePatti', label: t('gameRate.doublePatti') },
  { key: 'triplePatti', label: t('gameRate.triplePatti') },
  { key: 'halfSangam', label: t('gameRate.halfSangam') },
  { key: 'fullSangam', label: t('gameRate.fullSangam') },
];

const DEFAULT_RATES = {
  single: 10,
  jodi: 100,
  singlePatti: 150,
  doublePatti: 300,
  triplePatti: 1000,
  halfSangam: 5000,
  fullSangam: 10000,
};

const GameRate = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [rates, setRates] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRates = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await getRatesCurrent();
        if (res.success && res.data) {
          setRates(res.data);
        } else {
          setRates(DEFAULT_RATES);
        }
      } catch {
        setRates(DEFAULT_RATES);
      } finally {
        setLoading(false);
      }
    };
    fetchRates();
  }, []);

  const rateMap = rates || DEFAULT_RATES;
  const GAME_LABELS = getGameLabels(t);
  const rows = GAME_LABELS.map((g, idx) => ({
    srNo: idx + 1,
    game: g.label,
    rate: rateMap[g.key] ?? DEFAULT_RATES[g.key],
  }));

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-gray-900 dark:bg-black dark:text-white px-3 sm:px-6 md:px-8 pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
      <div className="w-full max-w-xl mx-auto">
        <div className="flex items-center gap-3 pt-4 pb-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="min-w-[44px] min-h-[44px] rounded-xl bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-white/20 transition-all shrink-0"
            aria-label={t('common.back')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{t('header.updateRate')}</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Payout rate per 1 unit bet (1 =)</p>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>
        )}

        {loading ? (
          <div className="mt-6 flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-amber-500/50 border-t-amber-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="mt-6 rounded-2xl bg-gradient-to-br from-white/[0.07] to-white/[0.02] border border-gray-200 dark:border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm sm:text-base">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-white/10 bg-black/20">
                    <th className="text-left py-3 px-4 text-[#d4af37] font-bold text-xs uppercase tracking-wider">Sr No</th>
                    <th className="text-left py-3 px-4 text-[#d4af37] font-bold text-xs uppercase tracking-wider">Game</th>
                    <th className="text-right py-3 px-4 text-[#d4af37] font-bold text-xs uppercase tracking-wider">Rate (1 =)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.game} className="border-b border-gray-200 dark:border-white/5 last:border-b-0 hover:bg-white/[0.03]">
                      <td className="py-3 px-4 text-gray-400">{row.srNo}</td>
                      <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">{row.game}</td>
                      <td className="py-3 px-4 text-right font-semibold text-[#d4af37]">{row.rate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameRate;

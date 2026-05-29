import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { iconBtn, textPrimary } from '../styles/appTheme';

const Games = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="w-full text-gray-900 dark:text-white px-3 py-4 min-h-[50vh] flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className={`w-10 h-10 flex items-center justify-center ${iconBtn}`}
          aria-label={t('common.back')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className={`text-xl font-bold ${textPrimary}`}>
          {t('markets.casinoGames', { defaultValue: 'Casino Games' })}
        </h1>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center text-center px-4 py-12">
        <p className="text-2xl sm:text-3xl font-bold text-[#d4af37] dark:text-amber-400">
          {t('games.comingSoon', { defaultValue: 'Coming Soon' })}
        </p>
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 max-w-sm">
          {t('games.comingSoonHint', { defaultValue: 'Casino games will be available here shortly.' })}
        </p>
      </div>
    </div>
  );
};

export default Games;

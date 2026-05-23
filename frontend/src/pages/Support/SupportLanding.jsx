import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { iconBtn, surfaceElevated } from '../../styles/appTheme';

const SupportLanding = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const options = [
    {
      id: 'new',
      title: t('support.raiseHelpTicket'),
      subtitle: t('support.submitNewProblem'),
      path: '/support/new',
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4m8-8V8a2 2 0 012-2h4a2 2 0 012 2v0" />
        </svg>
      ),
      gradient: 'from-amber-500 to-orange-600',
      glow: 'shadow-amber-500/25',
      hoverBorder: 'hover:border-amber-500/60',
    },
    {
      id: 'status',
      title: t('support.checkPreviousStatus'),
      subtitle: t('support.seeStatusAndReply'),
      path: '/support/status',
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      gradient: 'from-emerald-500 to-teal-600',
      glow: 'shadow-emerald-500/25',
      hoverBorder: 'hover:border-emerald-500/60',
    },
  ];

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-gray-900 dark:bg-[#0a0a0b] dark:text-white px-3 sm:px-6 md:px-8 pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
      <div className="w-full max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 pt-4 pb-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            className={`min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0 touch-manipulation transition-all ${iconBtn}`}
            aria-label="Back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{t('support.helpDesk')}</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{t('support.chooseOptionBelow')}</p>
          </div>
        </div>

        {/* Option cards - vertical stacked, icon-on-top layout */}
        <div className="mt-10 space-y-5">
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => navigate(opt.path)}
              className={`w-full group relative overflow-hidden rounded-2xl ${surfaceElevated} py-6 px-5 sm:py-8 sm:px-6 text-left transition-all duration-300 ${opt.hoverBorder} hover:border-opacity-60 hover:bg-gray-50 dark:hover:bg-white/[0.06] active:scale-[0.98] cursor-pointer`}
            >
              {/* Subtle top accent line */}
              <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${opt.gradient} opacity-60`} />
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${opt.gradient} flex items-center justify-center text-white shadow-lg ${opt.glow} shrink-0`}
                >
                  {opt.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-base sm:text-lg text-gray-900 dark:text-white group-hover:text-amber-800 dark:group-hover:text-[#f3b61b] transition-colors">
                    {opt.title}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1 leading-relaxed">{opt.subtitle}</p>
                </div>
                <div className="hidden sm:flex w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 dark:bg-white/5 dark:border-white/10 items-center justify-center shrink-0 group-hover:bg-gray-200 dark:group-hover:bg-white/10 transition-colors">
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Footer hint */}
        <p className="mt-8 text-center text-xs text-gray-600">
          {t('support.responseWithin24h')}
        </p>
      </div>
    </div>
  );
};

export default SupportLanding;

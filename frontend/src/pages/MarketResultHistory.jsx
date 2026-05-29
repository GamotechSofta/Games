import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useRefreshOnMarketReset } from '../hooks/useRefreshOnMarketReset';
import useMarketResultHistory from '../hooks/useMarketResultHistory';
import MyBetsGameResultsPanel, { GameResultsLoadingSkeleton } from './bids/MyBetsGameResultsPanel';
import { backBtn, pageShell, textPrimary } from '../styles/appTheme';

const toDateKeyIST = (d) => {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    return '';
  }
};

const MarketResultHistory = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const todayKey = useMemo(() => toDateKeyIST(new Date()), []);

  useEffect(() => {
    const k = toDateKeyIST(selectedDate);
    if (k && k > todayKey) setSelectedDate(new Date());
  }, [selectedDate, todayKey]);

  const dateKey = useMemo(() => toDateKeyIST(selectedDate) || todayKey, [selectedDate, todayKey]);
  const { rows, loading: resultsLoading, refetch } = useMarketResultHistory(dateKey);

  useRefreshOnMarketReset(refetch);

  return (
    <div className={`${pageShell} px-4 max-md:pl-[max(1rem,env(safe-area-inset-left,0px))] max-md:pr-[max(1rem,env(safe-area-inset-right,0px))] sm:px-4 pt-3 pb-[calc(5rem+env(safe-area-inset-bottom,0px))]`}>
      <div className="w-full max-w-3xl md:max-w-6xl mx-auto flex flex-col gap-3">
        <div className="flex items-center gap-3 overflow-visible">
          <button
            type="button"
            onClick={() => navigate('/bids', { replace: true })}
            className={backBtn}
            aria-label={t('common.back')}
          >
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className={`text-base sm:text-lg font-extrabold tracking-wide ${textPrimary}`}>
            {t('bids.marketResultHistory')}
          </h1>
        </div>

        {resultsLoading ? (
          <GameResultsLoadingSkeleton count={8} />
        ) : (
          <MyBetsGameResultsPanel
            resultsDate={selectedDate}
            onResultsDateChange={setSelectedDate}
            resultsRows={rows}
            showDateControls
            showMobileDatePicker
            showDesktopDatePicker
          />
        )}
      </div>
    </div>
  );
};

export default MarketResultHistory;

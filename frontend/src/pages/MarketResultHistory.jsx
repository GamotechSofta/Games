import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../config/api';
import ResultDatePicker from '../components/ResultDatePicker';
import { useRefreshOnMarketReset } from '../hooks/useRefreshOnMarketReset';
import MyBetsGameResultsPanel from './bids/MyBetsGameResultsPanel';
import { iconBtn, textPrimary } from '../styles/appTheme';

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
  const [results, setResults] = useState([]);
  const [resultsLoading, setResultsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const todayKey = useMemo(() => toDateKeyIST(new Date()), []);

  useEffect(() => {
    const k = toDateKeyIST(selectedDate);
    if (k && k > todayKey) setSelectedDate(new Date());
  }, [selectedDate, todayKey]);

  const fetchResults = async () => {
    try {
      const dateKey = toDateKeyIST(selectedDate) || todayKey;
      const res = await fetch(`${API_BASE_URL}/markets/result-history?date=${encodeURIComponent(dateKey)}`);
      const data = await res.json();
      if (data?.success && Array.isArray(data?.data)) setResults(data.data);
      else setResults([]);
    } catch {
      setResults([]);
    } finally {
      setResultsLoading(false);
    }
  };

  useEffect(() => {
    setResultsLoading(true);
    fetchResults();
    const id = setInterval(fetchResults, 30000);
    return () => clearInterval(id);
  }, [selectedDate, todayKey]);

  useRefreshOnMarketReset(fetchResults);

  const rows = useMemo(() => {
    const list = Array.isArray(results) ? results : [];
    const mapped = list.map((x) => ({
      id: x?._id || `${x?.marketId || ''}-${x?.dateKey || ''}`,
      name: (x?.marketName || '').toString().trim().toUpperCase(),
      result: (x?.displayResult || '***-**-***').toString().trim(),
    }));
    mapped.sort((a, b) => a.name.localeCompare(b.name));
    return mapped.filter((x) => x.name);
  }, [results]);

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-gray-900 dark:bg-black dark:text-white px-3 sm:px-4 pt-3 pb-28">
      <div className="w-full max-w-3xl md:max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/bids', { replace: true })}
              className={`w-10 h-10 shrink-0 ${iconBtn}`}
              aria-label={t('common.back')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className={`text-lg sm:text-xl font-extrabold tracking-wide truncate ${textPrimary}`}>
              {t('bids.marketResultHistory')}
            </h1>
          </div>
          <div className="shrink-0 hidden sm:block">
            <ResultDatePicker
              value={selectedDate}
              onChange={setSelectedDate}
              maxDate={new Date()}
              label={t('bids.selectDate')}
              buttonClassName="px-4 py-2 rounded-full bg-white border border-gray-200 text-gray-900 font-bold text-sm shadow-sm hover:border-amber-400 dark:bg-[#202124] dark:border-white/10 dark:text-white dark:hover:border-[#d4af37]/40 transition-colors"
            />
          </div>
        </div>

        {resultsLoading ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-[#202124] h-14 skeleton-shimmer" />
            <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-[#202124] h-64 skeleton-shimmer" />
          </div>
        ) : (
          <MyBetsGameResultsPanel
            resultsDate={selectedDate}
            onResultsDateChange={setSelectedDate}
            resultsRows={rows}
            showMobileDatePicker
          />
        )}
      </div>
    </div>
  );
};

export default MarketResultHistory;

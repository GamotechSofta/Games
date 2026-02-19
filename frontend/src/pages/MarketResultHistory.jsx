import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../config/api';
import ResultDatePicker from '../components/ResultDatePicker';
import { useRefreshOnMarketReset } from '../hooks/useRefreshOnMarketReset';

const toDateKeyIST = (d) => {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d); // YYYY-MM-DD
  } catch {
    return '';
  }
};

const formatDateLabel = (d) => {
  try {
    return d.toLocaleDateString('en-GB'); // dd/mm/yyyy
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

  // Clamp future date to today
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
    } catch {
      // ignore
    } finally {
      setResultsLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    setResultsLoading(true);
    const run = async () => {
      await fetchResults();
    };
    run();
    const id = setInterval(run, 30000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [selectedDate, todayKey]);

  useRefreshOnMarketReset(fetchResults);

  const rows = useMemo(() => {
    const list = Array.isArray(results) ? results : [];
    const mapped = list.map((x) => ({
      id: x?._id || `${x?.marketId || ''}-${x?.dateKey || ''}`,
      name: (x?.marketName || '').toString().trim(),
      result: (x?.displayResult || '***-**-***').toString().trim(),
    }));
    mapped.sort((a, b) => a.name.localeCompare(b.name));
    return mapped.filter((x) => x.name);
  }, [results]);

  return (
    <div className="min-h-screen bg-black text-white px-3 sm:px-4 pt-3 pb-28">
      <div className="w-full max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            onClick={() => navigate('/bids', { replace: true })}
            className="w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white hover:bg-white/15 active:scale-95 transition"
            aria-label="Back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg sm:text-xl font-extrabold tracking-wide truncate">MARKET RESULT HISTORY</h1>
        </div>

        {/* Date row */}
        <div className="rounded-2xl bg-[#202124] border border-white/10 p-3 mb-4">
          <ResultDatePicker
            value={selectedDate}
            onChange={setSelectedDate}
            maxDate={new Date()}
            label={t('bids.selectDate')}
            buttonClassName="px-4 py-2 rounded-full bg-black/40 border border-white/10 text-white font-bold text-sm shadow-sm hover:border-[#d4af37]/40 transition-colors"
          />
        </div>

        {/* List */}
        <div className="space-y-3">
          {resultsLoading ? (
            <>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                <div key={i} className="rounded-2xl bg-[#202124] border border-white/10 px-5 py-4 flex items-center justify-between gap-4 skeleton-shimmer">
                  <div className="h-5 flex-1 max-w-[60%] rounded bg-white/10" />
                  <div className="h-6 w-20 rounded bg-white/10 shrink-0" />
                </div>
              ))}
            </>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[#202124] p-6 text-center text-gray-300">
              {t('bids.noMarketsFound')}
            </div>
          ) : (
            rows.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl bg-[#202124] border border-white/10 px-5 py-4 shadow-[0_10px_22px_rgba(0,0,0,0.35)] flex items-center justify-between gap-4"
              >
                <div className="font-extrabold tracking-wide text-white truncate">{r.name.toUpperCase()}</div>
                <div className="font-extrabold tracking-wide text-[#d4af37] shrink-0">{r.result}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default MarketResultHistory;


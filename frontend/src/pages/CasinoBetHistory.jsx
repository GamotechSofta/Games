import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getMyCasinoBetHistory } from '../api/bets';
import { backBtn } from '../styles/appTheme';
import { IconCasinoFilled } from '../components/dashboard/dashboardIcons';
import {
  HiOutlineRefresh,
  HiOutlineSearch,
  HiOutlineClipboardCopy,
  HiCheck,
  HiOutlineX,
} from 'react-icons/hi';
import {
  MdOutlineReceiptLong,
  MdOutlineArrowOutward,
  MdOutlineCallReceived,
} from 'react-icons/md';

const formatCurrency = (amt) => {
  const n = Number(amt);
  if (!Number.isFinite(n)) return '0';
  return n.toLocaleString('en-IN', {
    minimumFractionDigits: n % 1 !== 0 ? 2 : 0,
    maximumFractionDigits: 2,
  });
};

const formatFullDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
};

const formatFullTime = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '-';
  }
};

const getDateGroupKey = (dateStr) => {
  if (!dateStr) return 'Other';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    if (isToday) return 'Today';

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear();
    if (isYesterday) return 'Yesterday';

    return d.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'Other';
  }
};

export default function CasinoBetHistory({ embedded = false }) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({
    totalBet: 0,
    totalWin: 0,
    netPnL: 0,
    totalCount: 0,
    betCount: 0,
    winCount: 0,
  });

  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'win' | 'placed' | 'round'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTx, setSelectedTx] = useState(null);
  const [copyToast, setCopyToast] = useState('');

  const fetchHistory = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await getMyCasinoBetHistory({ days: 30, limit: 200, force: isManualRefresh });
      if (res?.success) {
        setHistory(Array.isArray(res.data) ? res.data : []);
        if (res.stats) {
          setStats(res.stats);
        }
      }
    } catch (e) {
      console.error('[CasinoBetHistory] fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory(false);
  }, [fetchHistory]);

  const copyToClipboard = (text, label = 'Copied') => {
    if (!text) return;
    try {
      navigator.clipboard?.writeText(String(text).trim());
      setCopyToast(label);
      setTimeout(() => setCopyToast(''), 2000);
    } catch (_) {}
  };

  const handleBack = () => {
    try {
      if (window?.history?.length > 1) {
        navigate(-1);
        return;
      }
    } catch (_) {}
    navigate('/bids');
  };

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      // Tab filter
      if (activeTab === 'win' && item.status !== 'win') return false;
      if (activeTab === 'placed' && item.status !== 'placed') return false;
      if (activeTab === 'round' && item.status !== 'round') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const name = (item.gameName || '').toLowerCase();
        const desc = (item.description || '').toLowerCase();
        const ref = (item.referenceId || '').toLowerCase();
        if (!name.includes(q) && !desc.includes(q) && !ref.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [history, activeTab, searchQuery]);

  const groupedByDate = useMemo(() => {
    const groups = [];
    const map = new Map();

    for (const item of filteredHistory) {
      const dateKey = getDateGroupKey(item.createdAt);
      if (!map.has(dateKey)) {
        const group = { dateKey, items: [] };
        map.set(dateKey, group);
        groups.push(group);
      }
      map.get(dateKey).items.push(item);
    }

    return groups;
  }, [filteredHistory]);

  const tabs = [
    { id: 'all', label: t('bids.casinoAll', 'All'), count: stats.totalCount },
    { id: 'placed', label: t('bids.casinoBets', 'Bets'), count: stats.betCount },
    { id: 'win', label: t('bids.casinoWins', 'Wins'), count: stats.winCount },
  ];

  return (
    <div className={embedded ? 'w-full' : 'w-full min-h-screen px-3 sm:px-4 md:px-6 py-3 md:py-5 max-w-5xl mx-auto'}>
      {/* Toast Notification */}
      {copyToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-black/90 text-white text-xs font-semibold shadow-2xl border border-white/10 animate-fade-in pointer-events-none">
          <HiCheck className="w-4 h-4 text-emerald-400" />
          <span>{copyToast}</span>
        </div>
      )}

      {/* Standalone Header (Mobile or direct page view) */}
      {!embedded && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={handleBack}
              className={backBtn}
              aria-label={t('common.back')}
            >
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white leading-tight flex items-center gap-2">
                <span className="text-purple-600 dark:text-purple-400">
                  {t('bids.casinoBetHistory', 'Casino Bet History')}
                </span>
              </h1>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
                {t('bids.casinoBetHistorySubtitle', 'Your live casino bets and winnings')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => fetchHistory(true)}
            disabled={refreshing || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1a1c] text-xs font-bold text-gray-700 dark:text-gray-200 shadow-sm hover:border-purple-400 dark:hover:border-purple-500/40 transition disabled:opacity-50"
            title="Refresh history"
          >
            <HiOutlineRefresh className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-purple-500' : ''}`} />
            <span className="hidden sm:inline">{t('common.refresh', 'Refresh')}</span>
          </button>
        </div>
      )}

      {/* Financial Summary Metric Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
        {/* Total Bet */}
        <div className="rounded-xl sm:rounded-2xl border border-red-200/80 dark:border-red-500/20 bg-gradient-to-br from-red-50/70 via-white to-red-100/40 dark:from-[#2a1010]/50 dark:via-[#1a1a1c] dark:to-[#201010]/40 p-2.5 sm:p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 mb-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">
              {t('bids.casinoTotalBet', 'Total Bet')}
            </span>
            <div className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-950/60 flex items-center justify-center text-red-600 dark:text-red-400">
              <MdOutlineArrowOutward className="w-3 h-3" />
            </div>
          </div>
          <div className="text-sm sm:text-lg md:text-xl font-extrabold text-red-600 dark:text-red-400 truncate">
            ₹{formatCurrency(stats.totalBet)}
          </div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
            {stats.betCount} {t('bids.casinoBets', 'bets')}
          </div>
        </div>

        {/* Total Won */}
        <div className="rounded-xl sm:rounded-2xl border border-emerald-200/80 dark:border-emerald-500/20 bg-gradient-to-br from-emerald-50/70 via-white to-emerald-100/40 dark:from-[#0f2a1a]/50 dark:via-[#1a1a1c] dark:to-[#102018]/40 p-2.5 sm:p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 mb-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">
              {t('bids.casinoTotalWon', 'Total Won')}
            </span>
            <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <MdOutlineCallReceived className="w-3 h-3" />
            </div>
          </div>
          <div className="text-sm sm:text-lg md:text-xl font-extrabold text-emerald-600 dark:text-emerald-400 truncate">
            ₹{formatCurrency(stats.totalWin)}
          </div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
            {stats.winCount} {t('bids.casinoWins', 'wins')}
          </div>
        </div>

        {/* Net P&L */}
        <div className={`rounded-xl sm:rounded-2xl border p-2.5 sm:p-3.5 shadow-sm ${
          stats.netPnL >= 0
            ? 'border-emerald-200/80 dark:border-emerald-500/20 bg-gradient-to-br from-emerald-50/50 via-white to-emerald-100/30 dark:from-[#0f2a1a]/40 dark:via-[#1a1a1c] dark:to-[#102018]/30'
            : 'border-purple-200/80 dark:border-purple-500/20 bg-gradient-to-br from-purple-50/50 via-white to-purple-100/30 dark:from-[#251035]/40 dark:via-[#1a1a1c] dark:to-[#1d102a]/30'
        }`}>
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 mb-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">
              {t('bids.casinoNetPnL', 'Net P&L')}
            </span>
            <div className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <IconCasinoFilled className="w-3 h-3" />
            </div>
          </div>
          <div className={`text-sm sm:text-lg md:text-xl font-extrabold truncate ${
            stats.netPnL > 0
              ? 'text-emerald-600 dark:text-emerald-400'
              : stats.netPnL < 0
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-gray-800 dark:text-white'
          }`}>
            {stats.netPnL > 0 ? `+₹${formatCurrency(stats.netPnL)}` : stats.netPnL < 0 ? `-₹${formatCurrency(Math.abs(stats.netPnL))}` : '₹0'}
          </div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
            {stats.totalCount} {t('bids.casinoTotalCount', 'rounds')}
          </div>
        </div>
      </div>

      {/* Toolbar: Filter Tabs + Search + Refresh */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 mb-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-gray-100/90 dark:bg-white/[0.06] border border-gray-200/80 dark:border-white/10 shrink-0">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  active
                    ? 'bg-white dark:bg-[#202124] text-purple-700 dark:text-purple-300 shadow-sm border border-purple-200/60 dark:border-purple-500/30'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  active
                    ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300'
                    : 'bg-gray-200/80 dark:bg-white/10 text-gray-600 dark:text-gray-400'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Refresh */}
        <div className="flex items-center gap-2 flex-1 sm:justify-end">
          <div className="relative flex-1 sm:max-w-xs">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('bids.casinoSearchPlaceholder', 'Search game (e.g. Chicken Road)...')}
              className="w-full pl-9 pr-7 py-1.5 rounded-xl text-xs bg-white dark:bg-[#1a1a1c] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white"
              >
                <HiOutlineX className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {embedded && (
            <button
              type="button"
              onClick={() => fetchHistory(true)}
              disabled={refreshing || loading}
              className="p-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1a1c] text-gray-700 dark:text-gray-200 shadow-sm hover:border-purple-400 transition disabled:opacity-50"
              title="Refresh"
            >
              <HiOutlineRefresh className={`w-4 h-4 ${refreshing ? 'animate-spin text-purple-500' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Content Feed */}
      {loading ? (
        <div className="space-y-2.5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-[#1a1a1c] p-3.5 flex items-center gap-3.5 skeleton-shimmer"
            >
              <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-white/10 shrink-0" />
              <div className="flex-1 space-y-1.5 min-w-0">
                <div className="h-4 w-32 rounded bg-gray-200 dark:bg-white/10" />
                <div className="h-3 w-48 rounded bg-gray-100 dark:bg-white/5" />
              </div>
              <div className="w-20 space-y-1.5 text-right shrink-0">
                <div className="h-4 w-16 ml-auto rounded bg-gray-200 dark:bg-white/10" />
                <div className="h-3 w-12 ml-auto rounded bg-gray-100 dark:bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="rounded-2xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-[#1a1a1c] py-12 px-6 text-center shadow-sm">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-purple-100 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <IconCasinoFilled className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            {t('bids.casinoNoHistory', 'No casino bets found')}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto mt-1 mb-4 leading-relaxed">
            {searchQuery
              ? 'No transactions match your search filter.'
              : t('bids.casinoNoHistoryHint', 'Play games from the Casino section to see your bets here.')}
          </p>
          <button
            type="button"
            onClick={() => navigate('/games')}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md transition"
          >
            {t('markets.casinoGames', 'Play Casino Games')}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByDate.map((group) => (
            <div key={group.dateKey} className="space-y-2">
              <div className="sticky top-0 z-10 py-1 px-1 bg-[#f5f5f7]/90 dark:bg-[#141415]/90 backdrop-blur-sm">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {group.dateKey}
                </span>
              </div>

              <div className="space-y-2">
                {group.items.map((item) => {
                  const isWin = item.status === 'win';
                  const isBet = item.status === 'placed';
                  const isRound = item.status === 'round';

                  return (
                    <div
                      key={item._id || item.id}
                      onClick={() => setSelectedTx(item)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setSelectedTx(item);
                      }}
                      className="group rounded-2xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-[#1a1a1c] hover:border-purple-400/80 dark:hover:border-purple-500/40 p-3 sm:p-3.5 flex items-center justify-between gap-3 shadow-sm hover:shadow transition cursor-pointer"
                    >
                      {/* Left: Icon & Game Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl shrink-0 flex items-center justify-center border shadow-sm ${
                            isWin
                              ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 border-emerald-400/50 text-white'
                              : isBet
                                ? 'bg-gradient-to-br from-purple-600 to-indigo-700 border-purple-400/50 text-white'
                                : 'bg-gradient-to-br from-gray-500 to-gray-700 border-gray-400/50 text-white'
                          }`}
                        >
                          {isWin ? (
                            <MdOutlineCallReceived className="w-5 h-5" />
                          ) : isBet ? (
                            <MdOutlineArrowOutward className="w-5 h-5" />
                          ) : (
                            <IconCasinoFilled className="w-5 h-5" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm sm:text-[15px] font-bold text-gray-900 dark:text-white truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition">
                              {item.gameName}
                            </h4>
                            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300">
                              {item.provider || 'CASINO'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                            <span>{formatFullTime(item.createdAt)}</span>
                            <span>•</span>
                            <span className="font-mono text-[10px] truncate max-w-[130px] sm:max-w-[180px]">
                              {item.referenceId || '-'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Amount & Badge */}
                      <div className="text-right shrink-0 flex flex-col items-end">
                        <div
                          className={`text-sm sm:text-base font-extrabold whitespace-nowrap ${
                            isWin
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : isBet
                                ? 'text-gray-900 dark:text-white'
                                : 'text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {isWin ? `+₹${formatCurrency(item.amount)}` : isBet ? `-₹${formatCurrency(item.amount)}` : '₹0'}
                        </div>

                        <span
                          className={`mt-0.5 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                            isWin
                              ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
                              : isBet
                                ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30'
                                : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {item.statusLabel || (isWin ? 'WON' : isBet ? 'BET' : 'ROUND')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Transaction Receipt Modal */}
      {selectedTx && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedTx(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl sm:rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1a1c] p-5 sm:p-6 shadow-2xl space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <MdOutlineReceiptLong className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">
                    {t('bids.casinoBetDetails', 'Casino Bet Details')}
                  </h3>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    {formatFullDate(selectedTx.createdAt)} • {formatFullTime(selectedTx.createdAt)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="w-7 h-7 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white transition"
              >
                <HiOutlineX className="w-4 h-4" />
              </button>
            </div>

            {/* Amount Banner */}
            <div
              className={`rounded-2xl p-4 text-center border ${
                selectedTx.status === 'win'
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-500/30'
                  : 'bg-purple-50/80 dark:bg-purple-950/40 border-purple-200 dark:border-purple-500/30'
              }`}
            >
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {selectedTx.status === 'win' ? 'Winnings Credited' : 'Bet Placed'}
              </span>
              <div
                className={`text-2xl font-extrabold mt-0.5 ${
                  selectedTx.status === 'win'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-gray-900 dark:text-white'
                }`}
              >
                {selectedTx.status === 'win'
                  ? `+₹${formatCurrency(selectedTx.amount)}`
                  : `₹${formatCurrency(selectedTx.amount)}`}
              </div>
              <span
                className={`inline-block mt-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                  selectedTx.status === 'win'
                    ? 'bg-emerald-200/80 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200'
                    : 'bg-purple-200/80 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
                }`}
              >
                {selectedTx.statusLabel || (selectedTx.status === 'win' ? 'WON' : 'BET')}
              </span>
            </div>

            {/* Details Ledger */}
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-white/5">
                <span className="text-gray-500 dark:text-gray-400">Game Name</span>
                <span className="font-bold text-gray-900 dark:text-white">{selectedTx.gameName}</span>
              </div>

              {selectedTx.provider && (
                <div className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-white/5">
                  <span className="text-gray-500 dark:text-gray-400">Provider</span>
                  <span className="font-bold uppercase text-gray-900 dark:text-white">
                    {selectedTx.provider}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-white/5">
                <span className="text-gray-500 dark:text-gray-400">Transaction Type</span>
                <span className="font-bold uppercase text-gray-900 dark:text-white">
                  {selectedTx.type === 'credit' ? 'Credit' : 'Debit'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-white/5">
                <span className="text-gray-500 dark:text-gray-400">Date & Time</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatFullDate(selectedTx.createdAt)} {formatFullTime(selectedTx.createdAt)}
                </span>
              </div>

              {selectedTx.referenceId && (
                <div className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-white/5">
                  <span className="text-gray-500 dark:text-gray-400">Reference ID</span>
                  <div className="flex items-center gap-1.5 max-w-[200px]">
                    <span className="font-mono text-[10px] text-gray-900 dark:text-white truncate">
                      {selectedTx.referenceId}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(selectedTx.referenceId, 'Reference ID copied')}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 hover:text-purple-600 transition"
                      title="Copy reference ID"
                    >
                      <HiOutlineClipboardCopy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {selectedTx.description && (
                <div className="py-1.5">
                  <span className="text-gray-500 dark:text-gray-400 block mb-1">Description</span>
                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-white/[0.04] text-[11px] text-gray-700 dark:text-gray-300 font-mono break-all leading-relaxed">
                    {selectedTx.description}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="w-full py-2.5 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-900 dark:text-white font-bold text-xs transition"
              >
                {t('common.close', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

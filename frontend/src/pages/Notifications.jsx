import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../config/api';
import { markNotificationsSeen, getNotificationsClearedAt, setNotificationsClearedAt, NOTIFICATIONS_CLEARED_AT_KEY } from '../utils/notificationCount';

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

/** Relative time for list (e.g. "Just now", "2h ago") */
const formatNotificationTime = (dateStr, t) => {
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '';
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return t('notifications.justNow');
    if (diffMins < 60) return t('notifications.minutesAgo', { count: diffMins });
    if (diffHours < 24) return t('notifications.hoursAgo', { count: diffHours });
    if (diffDays < 7) return t('notifications.daysAgo', { count: diffDays });
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

/** Section label for grouping: Today, Yesterday, This week, Older */
const getDateSection = (dateStr, t) => {
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return t('notifications.older');
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const t_time = d.getTime();
    if (t_time >= todayStart.getTime()) return t('notifications.today');
    if (t_time >= yesterdayStart.getTime()) return t('notifications.yesterday');
    if (t_time >= weekStart.getTime()) return t('notifications.thisWeek');
    return t('notifications.older');
  } catch {
    return t('notifications.older');
  }
};

/** Full date + time for display (e.g. "14 Feb 2025, 3:45 pm") */
const formatFullDate = (dateStr) => {
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

const Notifications = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'payment' | 'result' | 'support'
  const [items, setItems] = useState([]);
  const [toast, setToast] = useState('');
  const [clearedAt, setClearedAt] = useState(() => getNotificationsClearedAt() || null);

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);
  const userId = user?.id || user?._id;

  const fetchAll = useCallback(async (showLoading = true) => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (showLoading) setLoading(true);
    else setRefreshing(true);
    try {
      const now = new Date();
      const todayKey = toDateKeyIST(now);
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayKey = toDateKeyIST(yesterday);

      const [depRes, withRes, ticketsRes, betsRes, resultTodayRes, resultYesterdayRes] = await Promise.all([
        fetch(`${API_BASE_URL}/payments/my-deposits?userId=${userId}`),
        fetch(`${API_BASE_URL}/payments/my-withdrawals?userId=${userId}`),
        fetch(`${API_BASE_URL}/help-desk/my-tickets?userId=${encodeURIComponent(userId)}`),
        fetch(`${API_BASE_URL}/bets/my-history?userId=${encodeURIComponent(userId)}`),
        fetch(`${API_BASE_URL}/markets/result-history?date=${encodeURIComponent(todayKey)}`),
        fetch(`${API_BASE_URL}/markets/result-history?date=${encodeURIComponent(yesterdayKey)}`),
      ]);

      const depData = await depRes.json();
      const withData = await withRes.json();
      const ticketsData = await ticketsRes.json();
      const betsData = await betsRes.json();
      const resultTodayData = await resultTodayRes.json();
      const resultYesterdayData = await resultYesterdayRes.json();

      // Normalize market id (backend may send object or string)
      const toMarketId = (v) => (v == null ? '' : String(v && typeof v === 'object' && v._id != null ? v._id : v));

      // Only show result notifications for markets the user has bet on (main markets from result-history)
      const betMarketIds = new Set(
        (Array.isArray(betsData?.data) ? betsData.data : [])
          .map((b) => toMarketId(b.marketId))
          .filter(Boolean)
      );

      const list = [];

      // Payment – Add fund (use real adminRemarks when present)
      (depData?.data || []).slice(0, 25).forEach((d) => {
        const status = (d.status || '').toLowerCase();
        const amount = `₹${Number(d.amount || 0).toLocaleString('en-IN')}`;
        const title = status === 'approved' ? `Add fund ${amount} approved` : status === 'rejected' ? `Add fund ${amount} rejected` : `Add fund ${amount} pending`;
        const msg = (d.adminRemarks && String(d.adminRemarks).trim()) || (d.upiTransactionId ? `UTR: ${d.upiTransactionId}` : 'View Add Fund History for details.');
        list.push({
          id: `dep-${d._id}`,
          type: 'payment',
          subtype: 'deposit',
          title,
          message: msg,
          time: d.processedAt || d.updatedAt || d.createdAt,
          status,
          link: '/funds?tab=add-fund-history',
        });
      });

      // Payment – Withdrawal (use real adminRemarks when present)
      (withData?.data || []).slice(0, 25).forEach((w) => {
        const status = (w.status || '').toLowerCase();
        const amount = `₹${Number(w.amount || 0).toLocaleString('en-IN')}`;
        const title = status === 'approved' ? `Withdrawal ${amount} approved` : status === 'rejected' ? `Withdrawal ${amount} rejected` : `Withdrawal ${amount} pending`;
        const msg = (w.adminRemarks && String(w.adminRemarks).trim()) || 'View Withdraw Fund History for details.';
        list.push({
          id: `with-${w._id}`,
          type: 'payment',
          subtype: 'withdrawal',
          title,
          message: msg,
          time: w.processedAt || w.updatedAt || w.createdAt,
          status,
          link: '/funds?tab=withdraw-fund-history',
        });
      });

      // Support – real subject, status, and reply preview
      const statusLabel = (s) => ({ open: 'Open', 'in-progress': 'In progress', resolved: 'Resolved', closed: 'Closed' }[s] || s);
      (ticketsData?.data || []).slice(0, 20).forEach((t) => {
        const hasReply = !!t.adminResponse;
        const subject = (t.subject || 'Support request').trim();
        const title = hasReply ? `Reply: ${subject}` : `Ticket: ${subject}`;
        const statusText = statusLabel(t.status) || t.status;
        const msg = hasReply
          ? (t.adminResponse || '').toString().trim().slice(0, 120) + ((t.adminResponse || '').length > 120 ? '…' : '')
          : `Status: ${statusText}. We'll reply within 24 hours.`;
        list.push({
          id: `ticket-${t._id}`,
          type: 'support',
          subtype: 'ticket',
          title,
          message: msg,
          time: t.updatedAt || t.createdAt,
          status: t.status,
          link: '/support/status',
        });
      });

      // Market results – only for main markets user has bet on (today and yesterday). Use live API data.
      const resultArray = (data) => (Array.isArray(data?.data) ? data.data : []);

      const addResults = (resultData, dateKey) => {
        const dateLabel = (() => {
          try {
            const [y, m, d] = dateKey.split('-');
            const dt = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
            return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
          } catch {
            return dateKey;
          }
        })();
        const timeForSort = new Date(`${dateKey}T23:59:59+05:30`).toISOString();
        resultArray(resultData).forEach((r) => {
          const marketIdStr = toMarketId(r.marketId);
          if (!marketIdStr || !betMarketIds.has(marketIdStr)) return;
          const name = (r.marketName || '').toString().trim();
          const result = (r.displayResult || '***-**-***').toString().trim();
          if (!name) return;
          list.push({
            id: `result-${dateKey}-${marketIdStr}-${name}`,
            type: 'result',
            subtype: 'market',
            title: result === '***-**-***' ? 'Market result pending' : 'Market result declared',
            message: `${dateLabel} • ${name} — ${result === '***-**-***' ? 'Result not yet declared' : `Result: ${result}`}`,
            time: r.updatedAt || r.createdAt || timeForSort,
            dateKey,
            link: '/market-result-history',
          });
        });
      };
      addResults(resultTodayData, todayKey);
      addResults(resultYesterdayData, yesterdayKey);

      // Sort: newest first (by time descending)
      list.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
      setItems(list);
    } catch (err) {
      console.error('Notifications fetch error:', err);
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  const handleRefresh = () => {
    fetchAll(false);
  };

  const handleClearAll = () => {
    const now = Date.now();
    setClearedAt(now);
    setNotificationsClearedAt(now);
    markNotificationsSeen();
    setToast(t('notifications.notificationsCleared'));
    setTimeout(() => setToast(''), 2000);
  };

  useEffect(() => {
    fetchAll(true);
  }, [fetchAll]);

  // Mark notifications as seen when user opens this screen (hide badge)
  useEffect(() => {
    markNotificationsSeen();
  }, []);

  // Auto-refresh every 30s so market results and list stay dynamic
  useEffect(() => {
    const id = setInterval(() => fetchAll(false), 30000);
    return () => clearInterval(id);
  }, [fetchAll]);

  // Sync cleared state from other tabs (e.g. clear on mobile → desktop view updates)
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === NOTIFICATIONS_CLEARED_AT_KEY) {
        const v = getNotificationsClearedAt();
        setClearedAt(v || null);
      }
    };
    const onCleared = () => {
      const v = getNotificationsClearedAt();
      setClearedAt(v || null);
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('notificationsCleared', onCleared);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('notificationsCleared', onCleared);
    };
  }, []);

  // For clear filter: result items use synthetic time (end of day), so use start of day so they get hidden on Clear all
  const getEffectiveTimeForClear = (item) => {
    if (item.type === 'result' && item.dateKey) {
      try {
        return new Date(`${item.dateKey}T00:00:00+05:30`).getTime();
      } catch {
        return new Date(item.time || 0).getTime();
      }
    }
    return new Date(item.time || 0).getTime();
  };

  const filtered = useMemo(() => {
    let list = filter === 'all' ? items : items.filter((i) => i.type === filter);
    const threshold = clearedAt ?? getNotificationsClearedAt();
    if (threshold != null && threshold > 0) {
      list = list.filter((i) => getEffectiveTimeForClear(i) > threshold);
    }
    return list.slice().sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
  }, [items, filter, clearedAt]);

  /** Group by date section for clear sections: Today, Yesterday, This week, Older */
  const sections = useMemo(() => {
    const order = [t('notifications.today'), t('notifications.yesterday'), t('notifications.thisWeek'), t('notifications.older')];
    const map = new Map();
    order.forEach((s) => map.set(s, []));
    filtered.forEach((item) => {
      const section = getDateSection(item.time, t);
      if (!map.has(section)) map.set(section, []);
      map.get(section).push(item);
    });
    return order.map((key) => ({ label: key, items: map.get(key) || [] })).filter((s) => s.items.length > 0);
  }, [filtered, t]);

  const handleBack = () => {
    try {
      const prev = sessionStorage.getItem('prevPathname');
      if (prev && prev !== '/notifications') {
        navigate(prev);
        return;
      }
    } catch (_) {}
    navigate('/');
  };

  const typeLabel = (type) => {
    const map = { payment: t('notifications.payment'), result: t('notifications.result'), support: t('notifications.support') };
    return map[type] || type;
  };

  const typeColor = (type) => {
    const map = {
      payment: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
      result: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
      support: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
    };
    return map[type] || 'bg-gray-500/20 text-gray-400 border-gray-500/40';
  };

  return (
    <div className="min-h-screen bg-black text-white px-4 md:px-8 lg:px-10 xl:px-12 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] md:pb-8 lg:pb-10">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 w-full max-w-sm md:max-w-md">
          <div className="rounded-xl bg-[#d4af37]/90 text-black px-4 py-3 text-sm font-semibold text-center shadow-lg">
            {toast}
          </div>
        </div>
      )}
      <div className="max-w-lg md:max-w-3xl lg:max-w-4xl xl:max-w-5xl mx-auto pt-4 md:pt-8 lg:pt-10">
        {/* Desktop: full-height card with scrollable list; mobile: single flow */}
        <div className="md:bg-[#0d0d0d] md:rounded-2xl md:border md:border-white/10 md:shadow-xl md:px-6 lg:px-8 xl:px-10 md:py-6 lg:py-8 md:min-h-[calc(100vh-6rem)] md:flex md:flex-col md:overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 mb-6 md:mb-6 md:shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={handleBack}
                className="min-w-[44px] min-h-[44px] md:min-w-[40px] md:min-h-[40px] rounded-full bg-white/10 flex items-center justify-center shrink-0 touch-manipulation hover:bg-white/15 transition-colors"
                aria-label="Back"
              >
                <svg className="w-5 h-5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="min-w-0">
                <h1 className="text-lg md:text-xl lg:text-2xl xl:text-3xl font-bold text-white">{t('notifications.title')}</h1>
                <p className="text-xs md:text-sm lg:text-base text-gray-500">{t('notifications.subtitle')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {filtered.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="min-h-[44px] md:min-h-[40px] px-3 md:px-4 rounded-full bg-white/10 text-gray-300 hover:bg-white/15 hover:text-white text-xs md:text-sm font-semibold touch-manipulation transition-colors"
                >
                  {t('notifications.clearAll')}
                </button>
              )}
              <button
                type="button"
                onClick={handleRefresh}
                disabled={loading || refreshing}
                className="min-w-[44px] min-h-[44px] md:min-w-[40px] md:min-h-[40px] rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/15 disabled:opacity-50 touch-manipulation transition-colors"
                aria-label={t('common.refresh')}
              >
                <svg
                  className={`w-5 h-5 md:w-4 md:h-4 ${refreshing ? 'animate-spin' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex flex-wrap md:flex-nowrap gap-2 overflow-x-auto scrollbar-hidden pb-2 mb-4 md:mb-4 md:shrink-0">
            {['all', 'payment', 'result', 'support'].map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`shrink-0 px-4 py-2 md:px-5 md:py-2.5 rounded-full text-sm md:text-base font-semibold transition-colors ${
                  filter === key
                    ? 'bg-[#d4af37] text-black'
                    : 'bg-[#1a1a1a] text-gray-400 border border-white/10 hover:border-[#d4af37]/40'
                }`}
              >
                {key === 'all' ? t('common.all') : typeLabel(key)}
              </button>
            ))}
          </div>

          {/* List — desktop: scrollable area; mobile: normal flow */}
          <div className="md:flex-1 md:min-h-0 md:overflow-y-auto md:pr-1">
          {loading ? (
            <div className="space-y-3 md:space-y-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="rounded-2xl bg-[#1a1a1a] border border-white/10 p-4 md:p-5 skeleton-shimmer">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <div className="h-4 w-28 rounded bg-white/10" />
                    <div className="h-4 w-16 rounded bg-white/10" />
                  </div>
                  <div className="h-3 w-full rounded bg-white/10" />
                  <div className="h-3 w-3/4 rounded bg-white/10 mt-2" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl bg-[#1a1a1a] border border-white/10 p-8 md:p-12 text-center">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 md:mb-5">
                <svg className="w-8 h-8 md:w-10 md:h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <p className="text-gray-400 text-sm md:text-base">{t('notifications.noNotifications')}</p>
              <p className="text-gray-500 text-xs md:text-sm mt-1">{t('notifications.noNotificationsDesc')}</p>
            </div>
          ) : (
            <div className="space-y-6 md:space-y-8">
              {sections.map((section) => (
                <div key={section.label}>
                  <h2 className="text-xs md:text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 md:mb-4 px-1">
                    {section.label}
                  </h2>
                  <div className="space-y-3 md:space-y-4">
                    {section.items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => item.link && navigate(item.link)}
                        className="w-full text-left rounded-2xl bg-[#1a1a1a] border border-white/10 p-4 md:p-5 hover:border-[#d4af37]/30 hover:bg-[#1f1f1f] active:scale-[0.99] transition-all cursor-pointer"
                      >
                        <div className="flex justify-between items-start gap-2 mb-1.5 md:mb-2">
                          <span className={`shrink-0 px-2.5 py-1 md:px-3 md:py-1.5 rounded-lg text-[10px] md:text-xs font-semibold uppercase tracking-wide border ${typeColor(item.type)}`}>
                            {typeLabel(item.type)}
                          </span>
                          <span className="text-xs md:text-sm text-gray-500 shrink-0 text-right">
                            {getDateSection(item.time, t) === t('notifications.older') ? formatFullDate(item.time) : formatNotificationTime(item.time, t)}
                          </span>
                        </div>
                        <p className="font-semibold text-white text-sm md:text-base leading-snug">{item.title}</p>
                        <p className="text-gray-400 text-xs md:text-sm mt-1 line-clamp-3">{item.message}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notifications;

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useRefreshOnMarketReset } from '../hooks/useRefreshOnMarketReset';
import useMyBetsData from '../hooks/useMyBetsData';
import { getBidOptionLabel, getBidOptionKey, BID_OPTION_FILTER_ORDER } from '../utils/betTypeLabels';
import { backBtn } from '../styles/appTheme';
import {
  betHistoryContentPanel,
  betHistoryCopyToast,
  betHistoryEmpty,
  betHistoryFilterBtn,
  betHistoryFilterOption,
  betHistoryIndexLabel,
  betHistoryLoadMoreBtn,
  betHistoryModalHeader,
  betHistoryPageWrap,
  betHistoryPrimaryBtn,
  betHistorySectionTitle,
  betHistoryTableShell,
  betHistoryThead,
  betHistoryTh,
  getBetCardClasses,
  getBetStatusDisplay,
  getBetTableRowClass,
  getSessionBadgeClasses,
  textMuted,
  textPrimary,
} from './bids/betHistoryTheme';
import BetHistoryStatusTabs from '../components/BetHistoryStatusTabs';
import { matchesBetStatusTabFilter } from '../utils/betStatusFilter';
import {
  evaluateBet,
  inferBetKind,
  isBetInMarketScope,
  isMarketInScope,
  normalizeMarketName,
} from '../utils/betEvaluation';

const BETS_DISPLAY_PAGE = 40;

const safeParse = (raw, fallback) => {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const formatTxnTime = (iso) => {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '-';
    const date = d.toLocaleDateString('en-GB').replace(/\//g, '-');
    const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    return `${date} ${time}`;
  } catch {
    return '-';
  }
};

/** Format scheduled date for display (e.g. "17/02/2026"). Returns null if not scheduled. */
const formatScheduledDate = (scheduledDate) => {
  if (!scheduledDate) return null;
  try {
    const d = typeof scheduledDate === 'string' ? new Date(scheduledDate) : scheduledDate;
    if (Number.isNaN(d?.getTime())) return null;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/');
  } catch {
    return null;
  }
};

const copyToClipboard = (text, onSuccess) => {
  const s = String(text || '').trim();
  if (!s) return;
  navigator.clipboard?.writeText(s).then(() => onSuccess?.()).catch(() => {});
};

const renderBetNumber = (val) => {
  const s = (val ?? '').toString().trim();
  if (/^\d{2}$/.test(s)) {
    return (
      <span className="inline-flex items-center justify-center gap-2">
        <span>{s[0]}</span>
        <span>{s[1]}</span>
      </span>
    );
  }
  return s || '-';
};

const HISTORY_SCOPE_TABS = [
  {
    scope: 'all',
    path: '/bet-history',
    labelKey: 'common.all',
    ariaLabelKey: 'bids.betHistory',
    activeClass:
      'border-red-600 bg-red-50 text-red-800 dark:bg-red-500/15 dark:text-red-200 shadow-[0_0_0_1px_rgba(220,38,38,0.2)]',
    idleClass:
      'border-gray-200 bg-white text-gray-700 hover:border-red-300 dark:border-white/15 dark:bg-[#202124] dark:text-gray-300 dark:hover:border-red-500/40',
  },
  {
    scope: 'starline',
    path: '/starline-bet-history',
    labelKey: 'markets.starline',
    ariaLabelKey: 'bids.starlineBetHistory',
    activeClass:
      'border-red-500 bg-red-500/12 text-red-800 dark:bg-red-500/18 dark:text-red-200 shadow-[0_0_0_1px_rgba(239,68,68,0.35)]',
    idleClass:
      'border-gray-200 bg-white text-gray-700 hover:border-red-400/50 dark:border-white/15 dark:bg-[#202124] dark:text-gray-300 dark:hover:border-red-400/40',
  },
  {
    scope: 'king',
    path: '/king-bazaar-bet-history',
    labelKey: 'markets.kingBazaar',
    ariaLabelKey: 'bids.kingBazaarBetHistory',
    activeClass:
      'border-blue-500 bg-blue-500/12 text-blue-800 dark:bg-blue-500/18 dark:text-blue-200 shadow-[0_0_0_1px_rgba(59,130,246,0.35)]',
    idleClass:
      'border-gray-200 bg-white text-gray-700 hover:border-blue-400/50 dark:border-white/15 dark:bg-[#202124] dark:text-gray-300 dark:hover:border-blue-400/40',
  },
];

function BetHistoryScopeTabs({ activeScope, onNavigate }) {
  const { t } = useTranslation();

  return (
    <div
      className="mb-4 flex gap-2 overflow-x-auto scrollbar-hidden pb-0.5"
      role="tablist"
      aria-label={t('bids.betHistory')}
    >
      {HISTORY_SCOPE_TABS.map((tab) => {
        const isActive =
          tab.scope === activeScope ||
          (tab.scope === 'starline' && activeScope === 'startline');
        return (
          <button
            key={tab.scope}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => {
              if (!isActive) onNavigate(tab.path);
            }}
            title={t(tab.ariaLabelKey || tab.labelKey)}
            className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-bold uppercase tracking-wide transition-colors touch-manipulation sm:px-4 sm:text-sm ${
              isActive ? tab.activeClass : tab.idleClass
            }`}
          >
            {t(tab.labelKey)}
          </button>
        );
      })}
    </div>
  );
}

const BetHistory = ({ pageTitle, marketScope = null } = {}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const displayTitle = pageTitle ?? t('bids.betHistory');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [statusTabFilter, setStatusTabFilter] = useState('all'); // 'all' | 'won' | 'lost' | 'cancelled'
  const [selectedSessions, setSelectedSessions] = useState([]); // ['OPEN','CLOSE']
  const [selectedStatuses, setSelectedStatuses] = useState([]); // ['Win','Loose','Pending','Cancelled']
  const [selectedMarkets, setSelectedMarkets] = useState([]); // normalized market keys
  const [selectedBidOptions, setSelectedBidOptions] = useState([]); // bid option keys
  const {
    bets: historyBets,
    ratesMap,
    markets,
    loading: betsLoading,
    invalidate: invalidateBetsData,
    loadMore,
    hasMore,
    isFetching,
  } = useMyBetsData({ fetchAll: true });
  const [visibleCount, setVisibleCount] = useState(BETS_DISPLAY_PAGE);
  const [copyToast, setCopyToast] = useState('');

  useEffect(() => {
    invalidateBetsData();
  }, [invalidateBetsData]);

  // Scope behavior:
  // - default (null/empty): ALL markets (main + starline + king)
  // - "starline"/"startline": only starline/startline markets
  // - "king": only king bazaar markets
  const scopeRaw = (marketScope || '').toString().trim().toLowerCase();
  const scope = scopeRaw || 'all';
  const historySubtitleKey =
    scope === 'starline' || scope === 'startline'
      ? 'bids.starlineBetHistorySubtitle'
      : scope === 'king'
        ? 'bids.kingBazaarBetHistorySubtitle'
        : 'bids.betHistorySubtitle';
  const inScope = (bet) => isBetInMarketScope(bet, scope);

  const { userId, bets } = useMemo(() => {
    const u = safeParse(localStorage.getItem('user') || 'null', null);
    const uid = u?._id || u?.id || u?.userId || u?.userid || u?.user_id || u?.uid || null;
    
    const scoped = (historyBets || []).filter((bet) => inScope(bet));

    return { userId: uid, bets: scoped };
  }, [scope, historyBets]);

  const flat = useMemo(() => {
    // Convert API bets to the expected format for the UI
    return (bets || []).map((bet) => ({
      bet,
      betId: bet._id,
      marketTitle: bet?.marketId?.marketName || 'MARKET',
      betNumber: bet.betNumber,
      amount: bet.amount,
      session: (bet.betOn || '').toUpperCase(),
      betType: bet.betType,
      status: bet.status,
      createdAt: bet.createdAt,
      marketData: bet.marketId,
    }));
  }, [bets]);

  useRefreshOnMarketReset(() => invalidateBetsData());

  useEffect(() => {
    setVisibleCount(BETS_DISPLAY_PAGE);
  }, [statusTabFilter, selectedSessions, selectedStatuses, selectedMarkets, selectedBidOptions, scope]);

  const marketByName = useMemo(() => {
    const map = new Map();
    for (const m of markets || []) {
      const key = normalizeMarketName(m?.marketName);
      map.set(key, m);
    }
    return map;
  }, [markets]);

  const marketOptions = useMemo(() => {
    // Get markets from API with their marketType
    const fromApi = (markets || []).map((m) => ({
      name: (m?.marketName || '').toString().trim(),
      type: m?.marketType || null,
    })).filter((x) => x.name);
    
    // Get markets from history
    const fromHistory = (bets || [])
      .map((bet) => ({
        name: (bet?.marketId?.marketName || '').toString().trim(),
        type: bet?.marketId?.marketType || null
      }))
      .filter((x) => x.name);
    
    // Merge and deduplicate
    const merged = [...fromApi, ...fromHistory];
    const uniqueMap = new Map();
    for (const item of merged) {
      const key = normalizeMarketName(item.name);
      if (!uniqueMap.has(key) || (item.type && !uniqueMap.get(key).type)) {
        uniqueMap.set(key, item);
      }
    }
    
    // Filter by scope using marketType when available
    const filtered = Array.from(uniqueMap.values()).filter((item) => {
      if (scope === 'all') return true;
      return isMarketInScope(item.name, item.type, scope);
    });
    
    filtered.sort((a, b) => a.name.localeCompare(b.name));
    return filtered.map((item) => ({ label: item.name, key: normalizeMarketName(item.name) }));
  }, [markets, bets, scope]);

  const enriched = useMemo(() => flat.map((item) => {
      const { bet, betId, marketTitle, betNumber, amount, session, betType, status, createdAt, marketData } = item;
      const m = marketByName.get(normalizeMarketName(marketTitle)) || marketData;

      // If bet is already settled (won/lost/cancelled), use that status
      if (status === 'won' || status === 'lost' || status === 'cancelled') {
        const verdict = {
          state: status,
          payout: bet.payout || 0,
          kind: inferBetKind(betNumber),
        };
        const bidOptionKey = getBidOptionKey(betType, betNumber);
        return { 
          bet, 
          betId, 
          points: amount, 
          session, 
          marketTitle, 
          betNumber, 
          betType,
          bidOptionKey,
          gameType: getBidOptionLabel(betType, betNumber, t),
          status,
          createdAt,
          verdict,
        };
      }
      
      // Otherwise evaluate bet status
      const computed = evaluateBet({
        market: m,
        betNumberRaw: betNumber,
        amount,
        session,
        ratesMap,
      });

      const bidOptionKey = getBidOptionKey(betType, betNumber);
      return {
        bet,
        betId,
        points: amount,
        session,
        marketTitle,
        betNumber,
        betType,
        bidOptionKey,
        gameType: getBidOptionLabel(betType, betNumber, t),
        status,
        createdAt,
        verdict: computed,
      };
    }), [flat, marketByName, ratesMap, t]);

  const filtered = useMemo(() => {
    return (enriched || []).filter((row) => {
      if (!matchesBetStatusTabFilter(row.verdict?.state, statusTabFilter)) return false;

      if (selectedSessions.length > 0 && !selectedSessions.includes(row.session)) return false;

      if (selectedMarkets.length > 0) {
        const k = normalizeMarketName(row.marketTitle);
        if (!selectedMarkets.includes(k)) return false;
      }

      if (selectedStatuses.length > 0) {
        const st =
          row.verdict.state === 'won' ? 'Win'
          : row.verdict.state === 'lost' ? 'Loose'
          : row.verdict.state === 'cancelled' ? 'Cancelled'
          : 'Pending';
        if (!selectedStatuses.includes(st)) return false;
      }

      if (selectedBidOptions.length > 0 && !selectedBidOptions.includes(row.bidOptionKey)) {
        return false;
      }

      return true;
    });
  }, [enriched, statusTabFilter, selectedMarkets, selectedSessions, selectedStatuses, selectedBidOptions]);

  const bidOptionFilterOptions = useMemo(() => {
    const keys = new Set((enriched || []).map((row) => row.bidOptionKey).filter(Boolean));
    return BID_OPTION_FILTER_ORDER
      .filter((k) => keys.has(k))
      .map((k) => {
        const sample = (enriched || []).find((row) => row.bidOptionKey === k);
        return {
          key: k,
          label: sample?.gameType || k,
        };
      });
  }, [enriched]);

  // One card per bet, newest first (no grouping by market)
  const allBetsNewestFirst = useMemo(() => {
    return [...(filtered || [])].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [filtered]);

  const visibleBets = useMemo(
    () => allBetsNewestFirst.slice(0, visibleCount),
    [allBetsNewestFirst, visibleCount],
  );

  const canShowMore = visibleCount < allBetsNewestFirst.length || hasMore;

  const handleShowMore = () => {
    if (visibleCount < allBetsNewestFirst.length) {
      setVisibleCount((c) => c + BETS_DISPLAY_PAGE);
      return;
    }
    if (hasMore && !isFetching) {
      loadMore();
      setVisibleCount((c) => c + BETS_DISPLAY_PAGE);
    }
  };

  // Draft state for modal
  const [draftSessions, setDraftSessions] = useState([]);
  const [draftStatuses, setDraftStatuses] = useState([]);
  const [draftMarkets, setDraftMarkets] = useState([]);
  const [draftBidOptions, setDraftBidOptions] = useState([]);

  useEffect(() => {
    if (!isFilterOpen) return;
    setDraftSessions(selectedSessions);
    setDraftStatuses(selectedStatuses);
    setDraftMarkets(selectedMarkets);
    setDraftBidOptions(selectedBidOptions);
  }, [isFilterOpen, selectedMarkets, selectedSessions, selectedStatuses, selectedBidOptions]);

  const toggleDraft = (arr, value, setArr) => {
    setArr((prev) => (prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]));
  };

  return (
    <div className={`${betHistoryPageWrap} px-4 max-md:pl-[max(1rem,env(safe-area-inset-left,0px))] max-md:pr-[max(1rem,env(safe-area-inset-right,0px))] sm:px-4`}>
      <div className="w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto">
        {/* Header row */}
        <div className="flex items-center justify-between gap-2 sm:gap-3 mb-3 sm:mb-4 overflow-visible">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink">
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
            <div className="min-w-0">
              <h1 className={`text-lg sm:text-2xl font-extrabold truncate ${textPrimary}`}>
                {displayTitle}
              </h1>
              <p className={`text-[11px] sm:text-xs mt-0.5 truncate ${textMuted}`}>{t(historySubtitleKey)}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 max-w-[58%] sm:max-w-[65%] justify-end">
            <BetHistoryStatusTabs
              activeFilter={statusTabFilter}
              onChange={setStatusTabFilter}
            />
            <button
              type="button"
              onClick={() => setIsFilterOpen(true)}
              className={betHistoryFilterBtn}
              aria-label={t('bids.filterBy')}
              title={t('bids.filterBy')}
            >
              <span className="whitespace-nowrap">{t('bids.filterBy')}</span>
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18l-7 8v6l-4 2v-8L3 4z" />
              </svg>
            </button>
          </div>
        </div>

        <BetHistoryScopeTabs
          activeScope={scope}
          onNavigate={(path) => navigate(path)}
        />

        {/* Bet ID copied toast */}
        {copyToast && (
          <div className={betHistoryCopyToast}>
            {copyToast}
          </div>
        )}

        {/* One card per bet, newest first (no market grouping) */}
        <div className={`${betHistoryContentPanel} p-3 sm:p-4 space-y-4`}>
          {betsLoading ? (
            <div className="grid grid-cols-2 gap-3 overflow-x-hidden">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#202124] p-3 space-y-2 skeleton-shimmer">
                  <div className="flex justify-between gap-1">
                    <div className="h-3 w-8 rounded bg-white/10" />
                    <div className="h-4 w-12 rounded bg-white/10" />
                  </div>
                  <div className="h-3 w-3/4 rounded bg-white/10" />
                  <div className="h-3 w-full rounded bg-white/10" />
                  <div className="h-3 w-2/3 rounded bg-white/10" />
                  <div className="h-3 w-1/2 rounded bg-white/10" />
                  <div className="h-3 w-full rounded bg-white/10" />
                </div>
              ))}
            </div>
          ) : !userId ? (
            <div className={betHistoryEmpty}>
              {t('bids.loginToSeeHistory')}
            </div>
          ) : allBetsNewestFirst.length === 0 ? (
            <div className={betHistoryEmpty}>
              {t('bids.noBetsFound')}
            </div>
          ) : (
            <>
              {/* Mobile: 2x2 grid, each bet = one card */}
              <div className="md:hidden grid grid-cols-2 gap-3 overflow-x-hidden">
                {visibleBets.map((row, idx) => {
                  const { betId, points, session, betNumber, verdict, createdAt, marketTitle, gameType } = row;
                  const isScheduled = row.bet?.scheduledDate || row.bet?.isScheduled;
                  const scheduledDateStr = formatScheduledDate(row.bet?.scheduledDate);
                  const betValue = betNumber != null ? renderBetNumber(betNumber) : '-';
                  const status = getBetStatusDisplay(t, verdict);
                  return (
                    <div
                      key={betId}
                      className={getBetCardClasses(verdict?.state)}
                    >
                      {verdict?.state === 'cancelled' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-red-100/50 dark:bg-black/50 z-10 pointer-events-none">
                          <svg className="w-12 h-12 text-red-600 dark:text-red-400 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        </div>
                      )}
                      <div className="flex justify-between items-center gap-1 flex-wrap">
                        <span className={`${betHistoryIndexLabel} shrink-0`}>#{idx + 1}</span>
                        {session ? <span className={getSessionBadgeClasses(session)}>{session}</span> : null}
                      </div>
                      <div className="flex justify-between items-center gap-1 text-[10px]">
                        <span className="text-gray-500 dark:text-gray-400 shrink-0">{t('bids.betIdLabel')}</span>
                        <span className="flex items-center gap-1 min-w-0">
                          <span className="font-mono text-gray-700 dark:text-gray-300 truncate" title={betId}>{String(betId || '').slice(-8)}</span>
                          <button type="button" onClick={(e) => { e.stopPropagation(); copyToClipboard(betId, () => { setCopyToast(t('bids.betIdCopied')); setTimeout(() => setCopyToast(''), 2000); }); }} className="shrink-0 p-0.5 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors" title={t('bids.copyBetId')} aria-label={t('bids.copyBetId')}>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                          </button>
                        </span>
                      </div>
                      {isScheduled && (
                        <div className="text-[9px] font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded px-1.5 py-0.5 inline-block shrink-0">
                          {t('bids.scheduledBet')}{scheduledDateStr ? ` · ${scheduledDateStr}` : ''}
                        </div>
                      )}
                      <p className="text-[10px] text-gray-600 dark:text-gray-400 truncate" title={marketTitle}>{marketTitle?.toUpperCase() || 'MARKET'}</p>
                      <div className="flex justify-between gap-1 text-xs">
                        <span className="text-gray-500 dark:text-gray-400 shrink-0">{t('bids.gameLabel')}</span>
                        <span className="text-gray-900 dark:text-white font-medium truncate">{gameType}</span>
                      </div>
                      <div className="flex justify-between gap-1 text-xs">
                        <span className="text-gray-500 dark:text-gray-400 shrink-0">{t('bids.betLabel')}</span>
                        <span className="text-gray-900 dark:text-white font-bold truncate">{betValue}</span>
                      </div>
                      <div className="flex justify-between gap-1 text-xs">
                        <span className="text-gray-500 dark:text-gray-400 shrink-0">{t('bids.pointsLabel')}</span>
                        <span className="text-gray-900 dark:text-white font-semibold">{points}</span>
                      </div>
                      <div className="flex justify-between gap-1 text-xs items-center min-w-0">
                        <span className="text-gray-500 dark:text-gray-400 shrink-0">{t('bids.statusLabel')}</span>
                        <span className={`${status.className} truncate text-[10px]`}>{status.text}{verdict?.state === 'won' && verdict?.payout > 0 ? ` ₹${Number(verdict.payout).toLocaleString('en-IN')}` : ''}</span>
                      </div>
                      <div className="flex justify-between gap-1 text-[10px]">
                        <span className="text-gray-500 dark:text-gray-400 shrink-0">{t('bids.timeLabel')}</span>
                        <span className="text-gray-600 dark:text-gray-300 truncate">{formatTxnTime(createdAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop: table, one row per bet */}
              <div className={`hidden md:block overflow-x-auto ${betHistoryTableShell}`}>
                <table className="w-full min-w-[640px] lg:min-w-[720px] border-collapse text-sm lg:text-base">
                  <thead>
                    <tr className={betHistoryThead}>
                      <th className={betHistoryTh}>#</th>
                      <th className={betHistoryTh}>{t('bids.betIdLabel')}</th>
                      <th className={betHistoryTh}>{t('bids.market')}</th>
                      <th className={betHistoryTh}>{t('bids.gameTypeLabel')}</th>
                      <th className={betHistoryTh}>{t('bids.betNumberLabel')}</th>
                      <th className={`${betHistoryTh} text-center`}>{t('bids.sessionLabel')}</th>
                      <th className={`${betHistoryTh} text-right`}>{t('bids.pointsLabel')}</th>
                      <th className={`${betHistoryTh} text-center`}>{t('bids.statusLabel')}</th>
                      <th className={betHistoryTh}>{t('bids.dateTimeLabel')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleBets.map((row, idx) => {
                      const { betId, points, session, betNumber, verdict, createdAt, marketTitle, gameType } = row;
                      const isScheduled = row.bet?.scheduledDate || row.bet?.isScheduled;
                      const scheduledDateStr = formatScheduledDate(row.bet?.scheduledDate);
                      const betValue = betNumber != null ? renderBetNumber(betNumber) : '-';
                      const status = getBetStatusDisplay(t, verdict);
                      return (
                        <tr
                          key={betId}
                          className={`border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors ${getBetTableRowClass(row.verdict?.state)}`}
                        >
                          <td className="py-3 px-3 lg:py-4 lg:px-4 text-gray-500 dark:text-gray-400 font-semibold text-sm">{idx + 1}</td>
                          <td className="py-3 px-3 lg:py-4 lg:px-4">
                            <span className="flex items-center gap-1.5">
                              <span className="font-mono text-gray-600 dark:text-gray-300 text-xs" title={betId}>{String(betId || '').slice(-8)}</span>
                              <button type="button" onClick={() => { copyToClipboard(betId, () => { setCopyToast(t('bids.betIdCopied')); setTimeout(() => setCopyToast(''), 2000); }); }} className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors" title={t('bids.copyBetId')} aria-label={t('bids.copyBetId')}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                              </button>
                            </span>
                          </td>
                          <td className="py-3 px-3 lg:py-4 lg:px-4 text-gray-900 dark:text-white text-sm font-medium truncate max-w-[120px]" title={marketTitle}>
                            <span className="block truncate">{marketTitle?.toUpperCase() || '—'}</span>
                            {isScheduled && (
                              <span className="inline-block mt-1 text-[10px] font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded px-1.5 py-0.5">
                                {t('bids.scheduledBet')}{scheduledDateStr ? ` · ${scheduledDateStr}` : ''}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 lg:py-4 lg:px-4 text-gray-900 dark:text-white text-sm font-medium">{gameType}</td>
                          <td className="py-3 px-3 lg:py-4 lg:px-4 text-gray-900 dark:text-white font-semibold">{betValue}</td>
                          <td className="py-3 px-3 lg:py-4 lg:px-4 text-center">
                            {session ? (
                              <span className={getSessionBadgeClasses(session, { rounded: true })}>{session}</span>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                          <td className="py-3 px-3 lg:py-4 lg:px-4 text-right text-gray-900 dark:text-white font-semibold">{points}</td>
                          <td className="py-3 px-3 lg:py-4 lg:px-4 text-center">
                            <span className={status.className}>{status.text}</span>
                            {verdict?.state === 'won' && verdict?.payout != null && verdict.payout > 0 && (
                              <div className="text-[#43b36a] text-xs mt-0.5">₹{Number(verdict.payout).toLocaleString('en-IN')}</div>
                            )}
                          </td>
                          <td className="py-3 px-3 lg:py-4 lg:px-4 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">{formatTxnTime(createdAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {canShowMore ? (
                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={handleShowMore}
                    disabled={isFetching}
                    className={betHistoryLoadMoreBtn}
                  >
                    {isFetching ? t('common.loading') : t('bids.loadMoreBets', { defaultValue: 'Load more bets' })}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      {/* Filter modal (as per screenshot) */}
      {isFilterOpen ? (
        <div className="fixed inset-0 z-[999] flex items-center justify-center px-3 sm:px-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close filter"
            onClick={() => setIsFilterOpen(false)}
          />

          <div className="relative w-full max-w-md rounded-[28px] overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.65)] border border-gray-200 dark:border-white/10 bg-white dark:bg-[#202124]">
            <div className={betHistoryModalHeader}>
              {t('bids.filterType')}
            </div>

            <div className="bg-white dark:bg-[#202124] text-gray-900 dark:text-white">
              <div className="px-5 py-4 max-h-[70vh] overflow-y-auto">
                <div className={betHistorySectionTitle}>{t('bids.byGameType')}</div>
                <div className="flex items-center justify-around gap-6 pb-4">
                  <label className="flex items-center gap-3 text-base sm:text-lg">
                    <input
                      type="checkbox"
                      className="w-6 h-6 accent-red-600"
                      checked={draftSessions.includes('OPEN')}
                      onChange={() => toggleDraft(draftSessions, 'OPEN', setDraftSessions)}
                    />
                    {t('bids.session.open')}
                  </label>
                  <label className="flex items-center gap-3 text-base sm:text-lg">
                    <input
                      type="checkbox"
                      className="w-6 h-6 accent-red-600"
                      checked={draftSessions.includes('CLOSE')}
                      onChange={() => toggleDraft(draftSessions, 'CLOSE', setDraftSessions)}
                    />
                    {t('bids.session.close')}
                  </label>
                </div>

                <div className="h-px bg-gray-200 dark:bg-white/10 my-3" />

                <div className={betHistorySectionTitle}>{t('bids.byWinningStatus')}</div>
                <div className="grid grid-cols-2 gap-3 pb-4">
                  {['Win', 'Loose', 'Pending', 'Cancelled'].map((s) => (
                    <label key={s} className="flex items-center gap-3 text-base sm:text-lg">
                      <input
                        type="checkbox"
                        className="w-6 h-6 accent-red-600"
                        checked={draftStatuses.includes(s)}
                        onChange={() => toggleDraft(draftStatuses, s, setDraftStatuses)}
                      />
                      {s}
                    </label>
                  ))}
                </div>

                {bidOptionFilterOptions.length > 0 ? (
                  <>
                    <div className="h-px bg-gray-200 dark:bg-white/10 my-3" />
                    <div className={betHistorySectionTitle}>{t('bids.byBidOption')}</div>
                    <div className="space-y-3 pb-4">
                      {bidOptionFilterOptions.map((opt) => (
                        <label
                          key={opt.key}
                          className={betHistoryFilterOption}
                        >
                          <input
                            type="checkbox"
                            className="w-6 h-6 accent-red-600"
                            checked={draftBidOptions.includes(opt.key)}
                            onChange={() => toggleDraft(draftBidOptions, opt.key, setDraftBidOptions)}
                          />
                          <span className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </>
                ) : null}

                <div className="h-px bg-gray-200 dark:bg-white/10 my-3" />

                <div className={betHistorySectionTitle}>{t('bids.byGames')}</div>
                <div className="space-y-3 pb-2">
                  {marketOptions.map((name) => (
                    <label
                      key={name.key}
                      className={`${betHistoryFilterOption} py-4`}
                    >
                      <input
                        type="checkbox"
                        className="w-6 h-6 accent-red-600"
                        checked={draftMarkets.includes(name.key)}
                        onChange={() => toggleDraft(draftMarkets, name.key, setDraftMarkets)}
                      />
                      <span className="text-sm sm:text-base font-semibold tracking-wide text-gray-900 dark:text-white">
                        {name.label.toUpperCase()}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="px-5 pb-5 pt-3">
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setIsFilterOpen(false)}
                    className="rounded-full bg-gray-100 dark:bg-black border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white font-bold py-4 text-base sm:text-lg shadow-md active:scale-[0.99] hover:border-gray-400 dark:hover:border-white/30 transition-colors"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSessions(draftSessions);
                      setSelectedStatuses(draftStatuses);
                      setSelectedMarkets(draftMarkets);
                      setSelectedBidOptions(draftBidOptions);
                      setIsFilterOpen(false);
                    }}
                    className={`py-4 text-base sm:text-lg ${betHistoryPrimaryBtn}`}
                  >
                    {t('bids.applyFilter')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
};

export default BetHistory;


import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cancelBet, updateUserBalance } from '../api/bets';
import useMyBetsData from '../hooks/useMyBetsData';
import useMarketResultHistory from '../hooks/useMarketResultHistory';
import ResultDatePicker from '../components/ResultDatePicker';
import ResponsiveSidebarLayout from '../components/ResponsiveSidebarLayout';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useRefreshOnMarketReset } from '../hooks/useRefreshOnMarketReset';
import MyBetsSidebar from './bids/MyBetsSidebar';
import MyBetsBetHistoryPanel from './bids/MyBetsBetHistoryPanel';
import MyBetsGameResultsPanel, { GameResultsLoadingSkeleton } from './bids/MyBetsGameResultsPanel';
import { getBidOptionLabel } from '../utils/betTypeLabels';
import { backBtn } from '../styles/appTheme';
import BetHistoryStatusTabs from '../components/BetHistoryStatusTabs';
import { matchesBetStatusTabFilter } from '../utils/betStatusFilter';
import {
  canCancelBet,
  evaluateBet,
  inferBetKind,
  isKingBazaarMarketName,
  isStarlineMarketName,
  normalizeMarketName,
} from '../utils/betEvaluation';

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

const Bids = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const myBetsSubPaths = ['/bids', '/bet-history', '/market-result-history', '/starline-bet-history', '/king-bazaar-bet-history'];
  const handleBack = () => {
    // Desktop: always go Home.
    try {
      if (window?.matchMedia?.('(min-width: 768px)')?.matches) {
        navigate('/');
        return;
      }
    } catch (_) {}

    // Mobile: go to previous page, but never to another My Bets sub-page.
    try {
      const prev = sessionStorage.getItem('prevPathname');
      if (prev && !myBetsSubPaths.includes(prev)) {
        navigate(prev);
        return;
      }
    } catch (_) {}
    navigate('/');
  };

  const items = useMemo(() => ([
    {
      key: 'bet-history',
      title: t('bids.betHistory'),
      navLabel: t('bids.navBetHistory'),
      subtitle: t('bids.betHistorySubtitle'),
      theme: 'gold',
      color: '#d4af37',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      key: 'starline-bet-history',
      title: t('bids.starlineBetHistory'),
      navLabel: t('bids.navStarline'),
      subtitle: t('bids.starlineBetHistorySubtitle'),
      theme: 'red',
      color: '#ef4444',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      key: 'king-bazaar-bet-history',
      title: t('bids.kingBazaarBetHistory'),
      navLabel: t('bids.navKingBazaar'),
      subtitle: t('bids.kingBazaarBetHistorySubtitle'),
      theme: 'blue',
      color: '#3b82f6',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l3.5 7L12 3l3.5 7L19 3v18l-3.5-7L12 21l-3.5-7L5 21V3z" />
        </svg>
      ),
    },
    {
      key: 'game-results',
      title: t('bids.gameResults'),
      navLabel: t('bids.navMarketResults'),
      subtitle: t('bids.gameResultsSubtitle'),
      theme: 'green',
      color: '#22c55e',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
  ]), [t]);

  const TAB_TO_TITLE = useMemo(() => ({
    'bet-history': t('bids.betHistory'),
    'game-results': t('bids.gameResults'),
    'starline-bet-history': t('bids.starlineBetHistory'),
    'king-bazaar-bet-history': t('bids.kingBazaarBetHistory'),
  }), [t, i18n.language]);
  const TITLE_TO_TAB = useMemo(() => ({
    [t('bids.betHistory')]: 'bet-history',
    [t('bids.gameResults')]: 'game-results',
    [t('bids.starlineBetHistory')]: 'starline-bet-history',
    [t('bids.kingBazaarBetHistory')]: 'king-bazaar-bet-history',
  }), [t, i18n.language]);

  const tabParam = (searchParams.get('tab') || '').toString();
  const initialTitle = TAB_TO_TITLE[tabParam] || (items[0]?.title || t('bids.betHistory'));
  const [activeTitle, setActiveTitle] = useState(initialTitle);
  const activeItem = items.find((i) => i.title === activeTitle) || items[0];
  const isBetHistoryPanel = activeTitle === t('bids.betHistory');
  const isStarlineBetHistoryPanel = activeTitle === t('bids.starlineBetHistory');
  const isKingBazaarBetHistoryPanel = activeTitle === t('bids.kingBazaarBetHistory');
  const isGameResultsPanel = activeTitle === t('bids.gameResults');
  const rightPanelTitle = activeTitle === t('bids.gameResults') ? t('bids.marketResultHistory') : activeTitle;
  const historyScope = isStarlineBetHistoryPanel ? 'starline' : isKingBazaarBetHistoryPanel ? 'king' : 'main';
  const isAnyHistoryPanel = isBetHistoryPanel || isStarlineBetHistoryPanel || isKingBazaarBetHistoryPanel;

  // Desktop Bet History filters (desktop panel inside My Bets)
  const [isDesktopFilterOpen, setIsDesktopFilterOpen] = useState(false);
  const [statusTabFilter, setStatusTabFilter] = useState('all'); // 'all' | 'won' | 'lost' | 'cancelled'
  const [selectedSessions, setSelectedSessions] = useState([]); // ['OPEN','CLOSE']
  const [selectedStatuses, setSelectedStatuses] = useState([]); // ['Win','Loose','Pending']
  const [selectedMarkets, setSelectedMarkets] = useState([]); // normalized market keys
  const [draftSessions, setDraftSessions] = useState([]);
  const [draftStatuses, setDraftStatuses] = useState([]);
  const [draftMarkets, setDraftMarkets] = useState([]);

  const {
    bets: apiBets,
    ratesMap,
    markets,
    loading: betsLoading,
    invalidate: invalidateBetsData,
    refetch: refetchBetsData,
  } = useMyBetsData();
  const [cancellingBetId, setCancellingBetId] = useState(null);
  const [cancelMessage, setCancelMessage] = useState({ type: '', text: '' });
  const [confirmCancelBetId, setConfirmCancelBetId] = useState(null);

  // Keep selected desktop panel on refresh (via ?tab=...) and sync activeTitle when language changes
  useEffect(() => {
    const title = TAB_TO_TITLE[tabParam];
    if (title) setActiveTitle(title);
  }, [tabParam, TAB_TO_TITLE]);

  // Write the tab param whenever selection changes
  useEffect(() => {
    const nextTab = TITLE_TO_TAB[activeTitle] || 'bet-history';
    if (searchParams.get('tab') === nextTab) return;
    const next = new URLSearchParams(searchParams);
    next.set('tab', nextTab);
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTitle]);

  const { isDesktop } = useBreakpoint();

  const handleItemClick = (item) => {
    if (isDesktop) {
      setActiveTitle(item?.title ?? activeTitle);
      return;
    }
    if (item?.title === t('bids.betHistory')) {
      navigate('/bet-history');
      return;
    }
    if (item?.title === t('bids.gameResults')) {
      navigate('/market-result-history');
      return;
    }
    if (item?.title === t('bids.starlineBetHistory')) {
      navigate('/starline-bet-history');
      return;
    }
    if (item?.title === t('bids.kingBazaarBetHistory')) {
      navigate('/king-bazaar-bet-history');
      return;
    }
    setActiveTitle(item?.title ?? activeTitle);
  };

  const desktopBetHistory = useMemo(() => {
    const u = safeParse(localStorage.getItem('user') || 'null', null);
    const uid = u?._id || u?.id || u?.userId || u?.userid || u?.user_id || u?.uid || null;
    return { uid, items: apiBets };
  }, [apiBets]);

  const toDateKeyIST = (d) => {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(d || new Date());
    } catch {
      return '';
    }
  };

  const todayKey = useMemo(() => toDateKeyIST(new Date()), []);

  const [resultsDate, setResultsDate] = useState(() => new Date());
  const resultsDateKey = useMemo(() => toDateKeyIST(resultsDate), [resultsDate]);
  const {
    rows: resultsRows,
    loading: resultsLoading,
  } = useMarketResultHistory(resultsDateKey, { enabled: isGameResultsPanel });

  useRefreshOnMarketReset(refetchBetsData);

  const handleCancelBetClick = (betId) => {
    if (!betId) return;
    setConfirmCancelBetId(betId);
  };

  const handleCancelBetConfirm = async (id) => {
    const betId = id ?? confirmCancelBetId;
    setConfirmCancelBetId(null);
    if (!betId) return;
    await handleCancelBet(typeof betId === 'string' ? betId : (betId?._id ?? betId?.$oid ?? String(betId)));
  };

  const handleCancelBet = async (betIdParam) => {
    const betId = typeof betIdParam === 'string' ? betIdParam : (betIdParam?._id ?? betIdParam?.$oid ?? String(betIdParam || ''));
    if (!betId) return;

    setCancellingBetId(betId);
    setCancelMessage({ type: '', text: '' });

    try {
      const result = await cancelBet(betId);
      
      if (result.success) {
        // Update user balance
        if (result.data?.newBalance != null) {
          updateUserBalance(result.data.newBalance);
        }
        
        // Show success message
        setCancelMessage({
          type: 'success',
          text: t('bids.cancelBetSuccess', { amount: result.data?.refundedAmount || 0 })
        });
        
        invalidateBetsData();
        
        // Clear message after 5 seconds
        setTimeout(() => {
          setCancelMessage({ type: '', text: '' });
        }, 5000);
      } else {
        // Show error message
        setCancelMessage({
          type: 'error',
          text: result.message || t('bids.cancelBetFailed')
        });
        
        setTimeout(() => {
          setCancelMessage({ type: '', text: '' });
        }, 5000);
      }
    } catch (error) {
      setCancelMessage({
        type: 'error',
        text: error.message || t('bids.cancelBetFailed')
      });
      
      setTimeout(() => {
        setCancelMessage({ type: '', text: '' });
      }, 5000);
    } finally {
      setCancellingBetId(null);
    }
  };

  const marketByName = useMemo(() => {
    const map = new Map();
    for (const m of markets || []) {
      map.set(normalizeMarketName(m?.marketName), m);
    }
    return map;
  }, [markets]);

  useEffect(() => {
    const k = toDateKeyIST(resultsDate);
    if (k && k > todayKey) setResultsDate(new Date());
  }, [resultsDate, todayKey]);

  const desktopRows = useMemo(() => {
    return (desktopBetHistory.items || []).map((bet) => {
      const betValue = bet?.betNumber != null ? renderBetNumber(bet.betNumber) : '-';
      const gameType = getBidOptionLabel(bet.betType, bet.betNumber, t);
      const points = Number(bet?.amount || 0) || 0;
      const session = (bet?.betOn || '').toString().trim().toUpperCase();
      const market = (bet?.marketId?.marketName || '').toString().trim() || 'MARKET';
      const marketKey = normalizeMarketName(market);
      const m =
        bet.marketId && typeof bet.marketId === 'object' ? bet.marketId : marketByName.get(marketKey);
      
      // If bet is already settled, use that status
      let verdict;
      if (bet.status === 'won' || bet.status === 'lost' || bet.status === 'cancelled') {
        verdict = {
          state: bet.status,
          payout: bet.payout || 0,
          kind: inferBetKind(bet.betNumber),
        };
      } else {
        verdict = evaluateBet({
          market: m,
          betNumberRaw: bet.betNumber,
          amount: points,
          session,
          ratesMap,
        });
      }
      
      const statusLabel = verdict.state === 'won' ? t('bids.status.win')
        : verdict.state === 'lost' ? t('bids.status.lost')
        : verdict.state === 'cancelled' ? t('bids.status.cancelled')
        : t('bids.status.pending');
      const marketType = m?.marketType || null;
      
      return { 
        bet,
        betId: bet._id,
        betValue, 
        gameType, 
        points, 
        session, 
        market, 
        marketKey, 
        verdict, 
        statusLabel, 
        marketType,
        createdAt: bet.createdAt,
        canCancel: bet.status === 'pending' ? canCancelBet(bet, t) : { canCancel: false, reason: '' },
      };
    });
  }, [desktopBetHistory.items, marketByName, ratesMap]);

  const marketOptions = useMemo(() => {
    // Get markets from API with their marketType
    const fromApi = (markets || []).map((m) => ({
      name: (m?.marketName || '').toString().trim(),
      type: m?.marketType || null,
    })).filter((x) => x.name);
    
    // Get markets from history (name only, no type)
    const fromHistory = (desktopBetHistory.items || [])
      .map((x) => ({ name: (x?.marketTitle || '').toString().trim(), type: null }))
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
    
    // Filter by history scope
    const filtered = Array.from(uniqueMap.values()).filter((item) => {
      if (!isAnyHistoryPanel) return true;
      const isStar = item.type === 'startline' || (item.type == null && isStarlineMarketName(item.name));
      const isKing = item.type === 'king' || (item.type == null && isKingBazaarMarketName(item.name));
      if (historyScope === 'starline') return isStar;
      if (historyScope === 'king') return isKing;
      return !isStar && !isKing;
    });
    
    filtered.sort((a, b) => a.name.localeCompare(b.name));
    return filtered.map((item) => ({ label: item.name, key: normalizeMarketName(item.name) }));
  }, [markets, desktopBetHistory.items, isAnyHistoryPanel, historyScope]);

  const filteredDesktopRows = useMemo(() => {
    const effectiveSelectedMarkets = isAnyHistoryPanel
      ? (historyScope === 'starline'
          ? (selectedMarkets || []).filter((k) => isStarlineMarketName(k))
          : historyScope === 'king'
            ? (selectedMarkets || []).filter((k) => isKingBazaarMarketName(k))
            : (selectedMarkets || []).filter((k) => !isStarlineMarketName(k) && !isKingBazaarMarketName(k)))
      : selectedMarkets;
    const rows = (desktopRows || []).filter((row) => {
      if (isAnyHistoryPanel) {
        const isStar = row.marketType === 'startline' || (row.marketType == null && isStarlineMarketName(row.market));
        const isKing = row.marketType === 'king' || (row.marketType == null && isKingBazaarMarketName(row.market));
        if (historyScope === 'starline' && !isStar) return false;
        if (historyScope === 'king' && !isKing) return false;
        if (historyScope === 'main' && (isStar || isKing)) return false;
      }
      if (!matchesBetStatusTabFilter(row.verdict?.state, statusTabFilter)) return false;
      if (selectedSessions.length > 0 && !selectedSessions.includes(row.session)) return false;
      if (effectiveSelectedMarkets.length > 0 && !effectiveSelectedMarkets.includes(row.marketKey)) return false;
      if (selectedStatuses.length > 0) {
        const statusMap = { 
          [t('bids.status.win')]: t('bids.status.win'), 
          [t('bids.status.lost')]: t('bids.status.lost'), 
          [t('bids.status.pending')]: t('bids.status.pending'), 
          [t('bids.status.cancelled')]: t('bids.status.cancelled') 
        };
        const mappedStatus = statusMap[row.statusLabel] || row.statusLabel;
        if (!selectedStatuses.includes(mappedStatus)) return false;
      }
      return true;
    });
    return rows;
  }, [desktopRows, statusTabFilter, selectedMarkets, selectedSessions, selectedStatuses, isAnyHistoryPanel, historyScope]);

  // Group desktop bet history by market (sorted) for table layout
  const groupedDesktopByMarket = useMemo(() => {
    const sessionOrder = (s) => {
      const u = (s || '').toString().trim().toUpperCase();
      if (u === 'OPEN') return 0;
      if (u === 'CLOSE') return 1;
      return 2;
    };
    const map = new Map();
    for (const row of filteredDesktopRows || []) {
      const key = row.marketKey;
      const title = (row.market || '').toString().trim() || 'MARKET';
      if (!map.has(key)) map.set(key, { marketKey: key, marketTitle: title, bets: [] });
      map.get(key).bets.push(row);
    }
    for (const g of map.values()) {
      g.bets.sort((a, b) => {
        const bySession = sessionOrder(a.session) - sessionOrder(b.session);
        if (bySession !== 0) return bySession;
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      });
    }
    return Array.from(map.values()).sort((a, b) => a.marketTitle.localeCompare(b.marketTitle, undefined, { sensitivity: 'base' }));
  }, [filteredDesktopRows]);

  useEffect(() => {
    if (!isDesktopFilterOpen) return;
    setDraftSessions(selectedSessions);
    setDraftStatuses(selectedStatuses);
    setDraftMarkets(selectedMarkets);
  }, [isDesktopFilterOpen, selectedMarkets, selectedSessions, selectedStatuses]);

  const toggleDraft = (arr, value, setArr) => {
    setArr((prev) => (prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]));
  };

  const activeTheme = activeItem?.theme || 'gold';

  return (
    <div
      className="w-full text-gray-900 pt-3 max-md:overflow-x-visible max-md:overflow-y-hidden max-md:overscroll-none max-md:pb-0 max-md:pl-[max(1rem,env(safe-area-inset-left,0px))] max-md:pr-[max(1rem,env(safe-area-inset-right,0px))] dark:text-white md:pt-4 md:pb-6 px-4 sm:px-4 md:px-4"
    >
      <style>{`
        .hide-scrollbar {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }
      `}</style>
      <div className="w-full max-w-full md:max-w-none md:mx-0 max-md:flex max-md:flex-col max-md:min-h-0">
        <div className="mb-2 shrink-0 md:mb-4 md:grid md:grid-cols-[11rem_1fr] md:items-stretch md:gap-4">
          {/* Page header */}
          <div className="flex items-center gap-3 px-1 py-2 md:mb-0">
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
              <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white leading-tight">
                <span className="text-[#d4af37] dark:text-amber-400">{t('bids.myBets')}</span>
              </h1>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">{t('bids.myBetsSubtitle')}</p>
            </div>
          </div>

          {/* Desktop panel toolbar */}
          <div className="hidden md:flex items-center justify-between gap-3 rounded-xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-[#1a1a1c] px-4 py-2.5 shadow-sm">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`w-1 h-8 rounded-full shrink-0 ${
                  activeTheme === 'green'
                    ? 'bg-emerald-500'
                    : activeTheme === 'red'
                      ? 'bg-red-500'
                      : activeTheme === 'blue'
                        ? 'bg-blue-500'
                        : 'bg-[#d4af37]'
                }`}
                aria-hidden
              />
              <span className="text-lg font-extrabold text-gray-900 dark:text-white truncate">{rightPanelTitle}</span>
            </div>
            {isGameResultsPanel ? (
              <div className="shrink-0">
                <ResultDatePicker
                  value={resultsDate}
                  onChange={setResultsDate}
                  maxDate={new Date()}
                  label={t('bids.selectDate')}
                  buttonClassName="px-4 py-2 rounded-xl bg-amber-50 border border-amber-300/60 text-amber-900 font-bold text-sm hover:border-[#d4af37] dark:bg-amber-950/40 dark:border-amber-500/40 dark:text-amber-200 dark:hover:border-amber-400 transition-colors"
                />
              </div>
            ) : isAnyHistoryPanel ? (
              <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-end min-w-0 ml-2">
                <BetHistoryStatusTabs
                  activeFilter={statusTabFilter}
                  onChange={setStatusTabFilter}
                  size="md"
                />
                <button
                  type="button"
                  onClick={() => setIsDesktopFilterOpen(true)}
                  className="shrink-0 px-4 py-2 rounded-xl bg-[#d4af37] border border-[#c9a227] text-black font-bold text-sm shadow-[0_0_12px_rgba(212,175,55,0.25)] hover:brightness-105 transition"
                  aria-label={t('bids.filterBy')}
                  title={t('bids.filterBy')}
                >
                  {t('bids.filterBy')}
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <ResponsiveSidebarLayout
          sidebarSize="narrow"
          className="max-md:min-h-0 max-md:flex-1"
          sidebar={
            <MyBetsSidebar
              items={items}
              activeTitle={activeTitle}
              onItemClick={handleItemClick}
            />
          }
          content={isDesktop ? (
          <main
            className={
              (isAnyHistoryPanel || isGameResultsPanel)
                ? 'bg-transparent border-0 shadow-none p-0'
                : 'p-6'
            }
          >
            {(isAnyHistoryPanel || isGameResultsPanel) ? null : (
              <div className="flex items-center justify-center gap-4">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-black shadow-[0_10px_20px_rgba(0,0,0,0.35)]"
                  style={{ backgroundColor: activeItem?.color || '#f3b61b' }}
                >
                  {activeItem?.iconUrl ? (
                    <img src={activeItem.iconUrl} alt={activeItem.title} className="w-7 h-7 object-contain" />
                  ) : (
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
                      <circle cx="12" cy="12" r="8" />
                    </svg>
                  )}
                </div>
                <div className="min-w-0 text-center">
                  <div className="text-xl font-bold text-gray-900 dark:text-white truncate">{activeItem?.title}</div>
                  <div className="text-sm text-gray-400">{activeItem?.subtitle}</div>
                </div>
              </div>
            )}

            {isAnyHistoryPanel ? (
              betsLoading ? (
                <div className="mt-0 max-h-[calc(100vh-220px)] overflow-hidden">
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                      <div key={i} className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#202124] p-3 space-y-2 skeleton-shimmer">
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
                </div>
              ) : (
                <MyBetsBetHistoryPanel
                  desktopBetHistoryUid={desktopBetHistory.uid}
                  groupedDesktopByMarket={groupedDesktopByMarket}
                  cancelMessage={cancelMessage}
                  onCancelBetClick={handleCancelBetClick}
                  cancellingBetId={cancellingBetId}
                  formatTxnTime={formatTxnTime}
                />
              )
            ) : activeTitle === t('bids.gameResults') ? (
              resultsLoading ? (
                <GameResultsLoadingSkeleton count={10} />
              ) : (
                <MyBetsGameResultsPanel
                  resultsDate={resultsDate}
                  onResultsDateChange={setResultsDate}
                  resultsRows={resultsRows}
                  showDateControls={false}
                />
              )
            ) : (
              <div className="mt-6 text-gray-300 text-sm">
                {t('bids.selectItemFromLeftMenu')}
              </div>
            )}
          </main>
          ) : null}
        />
      </div>

      {/* Cancel bet confirmation (mobile + desktop) */}
      {confirmCancelBetId && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-sm rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1a1c] shadow-2xl p-5 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Cancel bet?</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Are you sure you want to cancel this bet? The amount will be refunded to your wallet.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmCancelBetId(null)}
                className="flex-1 py-3 rounded-xl border border-white/20 text-gray-900 dark:text-white font-semibold hover:bg-white/10 transition-colors"
              >
                No, keep bet
              </button>
              <button
                type="button"
                onClick={() => handleCancelBetConfirm(confirmCancelBetId)}
                className="flex-1 py-3 rounded-xl bg-amber-500 text-black font-bold hover:bg-amber-400 transition-colors"
              >
                Yes, cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Bet History Filter modal */}
      {isDesktopFilterOpen ? (
        <div className="fixed inset-0 z-[999] hidden md:flex items-center justify-center px-3 sm:px-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close filter"
            onClick={() => setIsDesktopFilterOpen(false)}
          />

          <div className="relative w-full max-w-md rounded-[28px] overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.65)] border border-amber-200/50 dark:border-amber-500/20 bg-white dark:bg-[#1a1a1c]">
            <div className="bg-gradient-to-r from-[#d4af37] to-amber-600 text-black text-center py-4 text-xl font-extrabold border-b border-amber-700/20">
              {t('bids.filterBy')}
            </div>

            <div className="bg-white dark:bg-[#1a1a1c] text-gray-900 dark:text-white">
              <div className="px-5 py-4 max-h-[70vh] overflow-y-auto">
                <div className="text-lg font-bold text-[#d4af37] mb-3">By Game Type</div>
                <div className="flex items-center justify-around gap-6 pb-4">
                  <label className="flex items-center gap-3 text-base sm:text-lg">
                    <input
                      type="checkbox"
                      className="w-6 h-6 accent-[#d4af37]"
                      checked={draftSessions.includes('OPEN')}
                      onChange={() => toggleDraft(draftSessions, 'OPEN', setDraftSessions)}
                    />
                    Open
                  </label>
                  <label className="flex items-center gap-3 text-base sm:text-lg">
                    <input
                      type="checkbox"
                      className="w-6 h-6 accent-[#d4af37]"
                      checked={draftSessions.includes('CLOSE')}
                      onChange={() => toggleDraft(draftSessions, 'CLOSE', setDraftSessions)}
                    />
                    Close
                  </label>
                </div>

                <div className="h-px bg-white/10 my-3" />

                <div className="text-lg font-bold text-[#d4af37] mb-3">By Winning Status</div>
                <div className="grid grid-cols-2 gap-3 pb-4">
                  {['Win', 'Loose', 'Pending', 'Cancelled'].map((s) => (
                    <label key={s} className="flex items-center gap-3 text-base sm:text-lg">
                      <input
                        type="checkbox"
                        className="w-6 h-6 accent-[#d4af37]"
                        checked={draftStatuses.includes(s)}
                        onChange={() => toggleDraft(draftStatuses, s, setDraftStatuses)}
                      />
                      {s}
                    </label>
                  ))}
                </div>

                <div className="h-px bg-white/10 my-3" />

                <div className="text-lg font-bold text-[#d4af37] mb-3">By Games</div>
                <div className="space-y-3 pb-2">
                  {marketOptions.map((name) => (
                    <label
                      key={name.key}
                      className="flex items-center gap-4 bg-black/25 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm px-4 py-4 hover:border-[#d4af37]/40 transition-colors"
                    >
                      <input
                        type="checkbox"
                        className="w-6 h-6 accent-[#d4af37]"
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
                    onClick={() => setIsDesktopFilterOpen(false)}
                    className="rounded-full bg-black border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white font-bold py-4 text-base sm:text-lg shadow-md active:scale-[0.99] hover:border-[#d4af37]/40 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSessions(draftSessions);
                      setSelectedStatuses(draftStatuses);
                      setSelectedMarkets(draftMarkets);
                      setIsDesktopFilterOpen(false);
                    }}
                    className="rounded-full bg-gradient-to-r from-[#d4af37] to-[#cca84d] text-[#4b3608] font-extrabold py-4 text-base sm:text-lg shadow-md active:scale-[0.99] hover:from-[#e5c04a] hover:to-[#d4af37] transition-colors"
                  >
                    Filter
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

export default Bids;

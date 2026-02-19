import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../config/api';
import { getRatesCurrent, getMyBetHistory, cancelBet, updateUserBalance } from '../api/bets';
import ResultDatePicker from '../components/ResultDatePicker';
import ResponsiveSidebarLayout from '../components/ResponsiveSidebarLayout';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useRefreshOnMarketReset } from '../hooks/useRefreshOnMarketReset';
import MyBetsSidebar from './bids/MyBetsSidebar';
import MyBetsBetHistoryPanel from './bids/MyBetsBetHistoryPanel';
import MyBetsGameResultsPanel from './bids/MyBetsGameResultsPanel';

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

const sumDigits = (str) => [...String(str)].reduce((acc, c) => acc + (Number(c) || 0), 0);
const lastDigit = (str) => sumDigits(str) % 10;
const normalizeMarketName = (s) => (s || '').toString().trim().toLowerCase();
const isStarlineMarketName = (s) => {
  const k = normalizeMarketName(s);
  return k.includes('starline') || k.includes('startline') || k.includes('star line') || k.includes('start line');
};
const isKingBazaarMarketName = (s) => {
  const k = normalizeMarketName(s);
  return k.includes('king') || k.includes('bazaar') || k.includes('bazar');
};

const inferBetKind = (betNumberRaw) => {
  const s = (betNumberRaw ?? '').toString().trim();
  if (!s) return 'unknown';
  if (s.includes('-')) {
    const [a, b] = s.split('-').map((x) => (x || '').trim());
    if (/^\d{3}$/.test(a) && /^\d{3}$/.test(b)) return 'full-sangam';
    if (/^\d{3}$/.test(a) && /^\d$/.test(b)) return 'half-sangam-open';
    if (/^\d$/.test(a) && /^\d{3}$/.test(b)) return 'half-sangam-close';
    return 'unknown';
  }
  if (/^\d$/.test(s)) return 'digit';
  if (/^\d{2}$/.test(s)) return 'jodi';
  if (/^\d{3}$/.test(s)) return 'panna';
  return 'unknown';
};

// Backend defaults (must match backend/models/rate/rate.js) – used when API rates not loaded
const DEFAULT_RATES = { single: 10, jodi: 100, singlePatti: 150, doublePatti: 300, triplePatti: 1000, halfSangam: 5000, fullSangam: 10000 };

const rateNum = (val, def) => (Number.isFinite(Number(val)) && Number(val) >= 0 ? Number(val) : def);
const getPayoutMultiplier = (kind, betNumberRaw, ratesMap) => {
  const r = ratesMap && typeof ratesMap === 'object' ? ratesMap : DEFAULT_RATES;
  if (kind === 'digit') return rateNum(r.single, DEFAULT_RATES.single);
  if (kind === 'jodi') return rateNum(r.jodi, DEFAULT_RATES.jodi);
  if (kind === 'half-sangam-open' || kind === 'half-sangam-close') return rateNum(r.halfSangam, DEFAULT_RATES.halfSangam);
  if (kind === 'full-sangam') return rateNum(r.fullSangam, DEFAULT_RATES.fullSangam);
  if (kind === 'panna') {
    const s = (betNumberRaw ?? '').toString().trim();
    if (/^\d{3}$/.test(s)) {
      const a = s[0], b = s[1], c = s[2];
      const allSame = a === b && b === c;
      const twoSame = a === b || b === c || a === c;
      if (allSame) return rateNum(r.triplePatti, DEFAULT_RATES.triplePatti);
      if (twoSame) return rateNum(r.doublePatti, DEFAULT_RATES.doublePatti);
      return rateNum(r.singlePatti, DEFAULT_RATES.singlePatti);
    }
  }
  return 0;
};

const evaluateBet = ({ market, betNumberRaw, amount, session, ratesMap }) => {
  const opening = market?.openingNumber && /^\d{3}$/.test(String(market.openingNumber)) ? String(market.openingNumber) : null;
  const closing = market?.closingNumber && /^\d{3}$/.test(String(market.closingNumber)) ? String(market.closingNumber) : null;
  const openDigit = opening ? String(lastDigit(opening)) : null;
  const closeDigit = closing ? String(lastDigit(closing)) : null;
  const jodi = openDigit != null && closeDigit != null ? `${openDigit}${closeDigit}` : null;

  const betNumber = (betNumberRaw ?? '').toString().trim();
  const kind = inferBetKind(betNumber);
  const sess = (session || '').toString().trim().toUpperCase();

  const declared =
    kind === 'digit'
      ? (sess === 'OPEN' ? !!openDigit : sess === 'CLOSE' ? !!closeDigit : !!(openDigit && closeDigit))
      : kind === 'panna'
        ? (sess === 'OPEN' ? !!opening : sess === 'CLOSE' ? !!closing : !!(opening && closing))
        : kind === 'jodi'
          ? !!jodi
          : kind === 'half-sangam-open'
            ? !!(opening && openDigit)
            : kind === 'half-sangam-close' || kind === 'full-sangam'
              ? !!(opening && closing)
            : false;

  if (!declared) return { state: 'pending', kind, payout: 0 };

  let won = false;
  if (kind === 'digit') {
    if (sess === 'OPEN') won = betNumber === openDigit;
    else if (sess === 'CLOSE') won = betNumber === closeDigit;
    else won = betNumber === openDigit || betNumber === closeDigit;
  } else if (kind === 'jodi') {
    won = betNumber === jodi;
  } else if (kind === 'panna') {
    if (sess === 'OPEN') won = betNumber === opening;
    else if (sess === 'CLOSE') won = betNumber === closing;
    else won = betNumber === opening || betNumber === closing;
  } else if (kind === 'full-sangam') {
    won = betNumber === `${opening}-${closing}`;
  } else if (kind === 'half-sangam-open') {
    // Half Sangam (O) in this app is Open Pana + Open Ank (derived from Open Pana),
    // so it can be decided as soon as OPEN result is declared.
    won = betNumber === `${opening}-${openDigit}`;
  } else if (kind === 'half-sangam-close') {
    won = betNumber === `${openDigit}-${closing}`;
  }

  if (!won) return { state: 'lost', kind, payout: 0 };

  const mul = getPayoutMultiplier(kind, betNumber, ratesMap);
  const payout = mul > 0 ? (Number(amount) || 0) * mul : 0;
  return { state: 'won', kind, payout };
};

const Bids = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
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
      title: t('bids.betHistory'),
      subtitle: t('bids.betHistorySubtitle'),
      color: '#f3b61b'
    },
    {
      title: t('bids.gameResults'),
      subtitle: t('bids.gameResultsSubtitle'),
      color: '#25d366',
      iconUrl: 'https://res.cloudinary.com/dzd47mpdo/image/upload/v1769799295/result_ekwn16.png'
    },
    {
      title: t('bids.starlineBetHistory'),
      subtitle: t('bids.starlineBetHistorySubtitle'),
      color: '#ef4444'
    },
    {
      title: t('bids.kingBazaarBetHistory'),
      subtitle: t('bids.kingBazaarBetHistorySubtitle'),
      color: '#3b82f6'
    },
    
  ]), [t]);

  const TAB_TO_TITLE = useMemo(() => ({
    'bet-history': t('bids.betHistory'),
    'game-results': t('bids.gameResults'),
    'starline-bet-history': t('bids.starlineBetHistory'),
    'king-bazaar-bet-history': t('bids.kingBazaarBetHistory'),
  }), [t]);
  const TITLE_TO_TAB = useMemo(() => ({
    [t('bids.betHistory')]: 'bet-history',
    [t('bids.gameResults')]: 'game-results',
    [t('bids.starlineBetHistory')]: 'starline-bet-history',
    [t('bids.kingBazaarBetHistory')]: 'king-bazaar-bet-history',
  }), [t]);

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
  const [selectedSessions, setSelectedSessions] = useState([]); // ['OPEN','CLOSE']
  const [selectedStatuses, setSelectedStatuses] = useState([]); // ['Win','Loose','Pending']
  const [selectedMarkets, setSelectedMarkets] = useState([]); // normalized market keys
  const [draftSessions, setDraftSessions] = useState([]);
  const [draftStatuses, setDraftStatuses] = useState([]);
  const [draftMarkets, setDraftMarkets] = useState([]);

  const [markets, setMarkets] = useState([]);
  const [ratesMap, setRatesMap] = useState(null);
  const [apiBets, setApiBets] = useState([]);
  const [betsLoading, setBetsLoading] = useState(true);
  const [resultsLoading, setResultsLoading] = useState(true);
  const [cancellingBetId, setCancellingBetId] = useState(null);
  const [cancelMessage, setCancelMessage] = useState({ type: '', text: '' });
  const [confirmCancelBetId, setConfirmCancelBetId] = useState(null);
  const [localVersion, setLocalVersion] = useState(0);

  // Keep selected desktop panel on refresh (via ?tab=...)
  useEffect(() => {
    const t = TAB_TO_TITLE[tabParam];
    if (t && t !== activeTitle) setActiveTitle(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabParam]);

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
  const [resultsRows, setResultsRows] = useState([]);

  const fetchMarkets = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/markets/get-markets`);
      const data = await res.json();
      if (data?.success && Array.isArray(data?.data)) {
        setMarkets(data.data);
      }
    } catch {
      // ignore
    }
  };

  const fetchHistory = async () => {
    try {
      const dateKey = toDateKeyIST(resultsDate) || toDateKeyIST(new Date());
      const res = await fetch(`${API_BASE_URL}/markets/result-history?date=${encodeURIComponent(dateKey)}`);
      const data = await res.json();
      if (data?.success && Array.isArray(data?.data)) {
        const mapped = data.data.map((x) => ({
          id: x?._id || `${x?.marketId || ''}-${x?.dateKey || ''}`,
          name: (x?.marketName || '').toString().trim(),
          result: (x?.displayResult || '***-**-***').toString().trim(),
        })).filter((x) => x.name);
        mapped.sort((a, b) => a.name.localeCompare(b.name));
        setResultsRows(mapped);
      } else {
        setResultsRows([]);
      }
    } catch {
      setResultsRows([]);
    } finally {
      setResultsLoading(false);
    }
  };

  const refetchAll = async () => {
    setResultsLoading(true);
    await Promise.all([fetchMarkets(), fetchHistory()]);
  };

  useEffect(() => {
    let alive = true;
    const run = async () => {
      await fetchMarkets();
    };
    run();
    const id = setInterval(run, 30000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  useRefreshOnMarketReset(refetchAll);
  useEffect(() => {
    let alive = true;
    getRatesCurrent().then((result) => {
      if (!alive) return;
      if (result?.success && result?.data) setRatesMap(result.data);
    });
    return () => { alive = false; };
  }, []);

  // Fetch bets from API
  useEffect(() => {
    let alive = true;
    setBetsLoading(true);
    const fetchBets = async () => {
      if (!alive) return;
      try {
        const result = await getMyBetHistory();
        if (!alive) return;
        if (result?.success && Array.isArray(result?.data)) {
          setApiBets(result.data);
        }
      } finally {
        if (alive) setBetsLoading(false);
      }
    };
    fetchBets();
    const id = setInterval(fetchBets, 30000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [localVersion]);

  // Function to check if a bet can be cancelled
  const canCancelBet = (bet) => {
    if (!bet || bet.status !== 'pending') {
      return { canCancel: false, reason: `Status: ${bet?.status || 'unknown'}` };
    }

    const market = bet.marketId;
    if (!market) {
      return { canCancel: false, reason: t('bids.marketNotFound') };
    }

    const now = new Date();
    const betPlacedAt = new Date(bet.createdAt);
    const timeSinceBetPlaced = (now - betPlacedAt) / 1000 / 60; // minutes

    // Rule 1: Check if within 30 minutes of placing bet
      if (timeSinceBetPlaced > 30) {
        return { canCancel: false, reason: t('bids.canOnlyCancelWithin30Min') };
      }

    // Rule 2: Check if at least 30 minutes before market closing
    const closeStr = (market?.closingTime || '').toString().trim();
    if (!closeStr) {
      return { canCancel: false, reason: t('bids.marketTimingNotConfigured') };
    }

    try {
      const getTodayIST = () => {
        return new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(new Date());
      };

      const normalizeTimeStr = (timeStr) => {
        const parts = timeStr.split(':').map((p) => String(parseInt(p, 10) || 0).padStart(2, '0'));
        return `${parts[0] || '00'}:${parts[1] || '00'}:${parts[2] || '00'}`;
      };

      const parseISTDateTime = (isoStr) => {
        const d = new Date(isoStr);
        return isNaN(d.getTime()) ? null : d.getTime();
      };

      const todayIST = getTodayIST();
      const openAt = parseISTDateTime(`${todayIST}T00:00:00+05:30`);
      let closeAt = parseISTDateTime(`${todayIST}T${normalizeTimeStr(closeStr)}+05:30`);

      if (closeAt <= openAt) {
        const baseDate = new Date(`${todayIST}T12:00:00+05:30`);
        baseDate.setDate(baseDate.getDate() + 1);
        const nextDayStr = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(baseDate);
        closeAt = parseISTDateTime(`${nextDayStr}T${normalizeTimeStr(closeStr)}+05:30`);
      }

      const timeUntilClosing = (closeAt - now.getTime()) / 1000 / 60; // minutes

      if (timeUntilClosing < 30) {
        return { canCancel: false, reason: t('bids.cannotCancelWithin30MinOfClosing') };
      }

      return { canCancel: true, reason: '' };
    } catch (e) {
      return { canCancel: false, reason: 'Error checking market timing' };
    }
  };

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
        
        // Refresh bet list
        setLocalVersion(v => v + 1);
        
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

  useEffect(() => {
    let alive = true;
    setResultsLoading(true);
    const run = async () => {
      await fetchHistory();
    };
    run();
    const id = setInterval(run, 30000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [resultsDate, todayKey]);

  const desktopRows = useMemo(() => {
    return (desktopBetHistory.items || []).map((bet) => {
      const betValue = bet?.betNumber != null ? renderBetNumber(bet.betNumber) : '-';
      const labelForType = (type) => {
        const s = String(type || '').toLowerCase();
        if (s === 'single') return t('bids.gameType.singleAnk');
        if (s === 'jodi') return t('bids.gameType.digit');
        if (s === 'panna') return t('bids.gameType.panna');
        if (s === 'half-sangam') return t('bids.gameType.halfSangam');
        if (s === 'full-sangam') return t('bids.gameType.fullSangam');
        return t('bids.gameType.bet');
      };
      const gameType = labelForType(bet.betType);
      const points = Number(bet?.amount || 0) || 0;
      const session = (bet?.betOn || '').toString().trim().toUpperCase();
      const market = (bet?.marketId?.marketName || '').toString().trim() || 'MARKET';
      const marketKey = normalizeMarketName(market);
      const m = marketByName.get(marketKey) || bet.marketId;
      
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
        canCancel: canCancelBet(bet),
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
  }, [desktopRows, selectedMarkets, selectedSessions, selectedStatuses, isAnyHistoryPanel, historyScope]);

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

  return (
    <div className="min-h-screen bg-black text-white pl-3 pr-3 sm:pl-4 sm:pr-4 pt-0 pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
      <style>{`
        .hide-scrollbar {
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* IE/Edge */
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none; /* Chrome/Safari */
          width: 0;
          height: 0;
        }
      `}</style>
      <div className="w-full max-w-lg md:max-w-none mx-auto md:mx-0">
        <div className="mb-6 md:grid md:grid-cols-[360px_1fr] md:gap-6 md:items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white hover:bg-white/15 active:scale-95 transition"
              aria-label={t('common.back')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl sm:text-2xl font-bold">{t('bids.myBets')}</h1>
          </div>

          <div className="hidden md:flex items-center justify-between gap-4 px-1">
            <div className="text-2xl font-extrabold text-white">{rightPanelTitle}</div>
            {isGameResultsPanel ? (
              <div className="w-[320px]">
                <ResultDatePicker
                  value={resultsDate}
                  onChange={setResultsDate}
                  maxDate={new Date()}
                  label={t('bids.selectDate')}
                  buttonClassName="px-4 py-2 rounded-full bg-black/40 border border-white/10 text-white font-bold text-sm shadow-sm hover:border-[#d4af37]/40 transition-colors"
                />
              </div>
            ) : isAnyHistoryPanel ? (
              <button
                type="button"
                onClick={() => setIsDesktopFilterOpen(true)}
                className="px-4 py-2 rounded-full bg-black/40 border border-white/10 text-[#d4af37] font-bold text-sm shadow-sm hover:border-[#d4af37]/40 transition-colors"
                aria-label={t('bids.filterBy')}
                title={t('bids.filterBy')}
              >
                {t('bids.filterBy')}
              </button>
            ) : null}
          </div>
        </div>

        <ResponsiveSidebarLayout
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
                : 'rounded-2xl bg-[#202124] border border-white/10 shadow-[0_12px_24px_rgba(0,0,0,0.35)] p-6'
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
                  <div className="text-xl font-bold text-white truncate">{activeItem?.title}</div>
                  <div className="text-sm text-gray-400">{activeItem?.subtitle}</div>
                </div>
              </div>
            )}

            {isAnyHistoryPanel ? (
              betsLoading ? (
                <div className="mt-0 max-h-[calc(100vh-220px)] overflow-hidden">
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                      <div key={i} className="rounded-lg border border-white/10 bg-[#202124] p-3 space-y-2 skeleton-shimmer">
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
                <div className="mt-3 max-h-[calc(100vh-300px)] overflow-hidden space-y-3">
                  <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 skeleton-shimmer">
                    <div className="h-4 w-24 rounded bg-white/10" />
                    <div className="h-8 w-28 rounded-lg bg-white/10" />
                  </div>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                    <div key={i} className="rounded-2xl bg-[#202124] border border-white/10 px-4 py-3 flex items-center justify-between gap-3 skeleton-shimmer">
                      <div className="h-4 flex-1 max-w-[60%] rounded bg-white/10" />
                      <div className="h-5 w-16 rounded bg-white/10 shrink-0" />
                    </div>
                  ))}
                </div>
              ) : (
                <MyBetsGameResultsPanel
                  resultsDate={resultsDate}
                  onResultsDateChange={setResultsDate}
                  resultsRows={resultsRows}
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
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#202124] shadow-2xl p-5 space-y-4">
            <h3 className="text-lg font-bold text-white">Cancel bet?</h3>
            <p className="text-gray-300 text-sm">
              Are you sure you want to cancel this bet? The amount will be refunded to your wallet.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmCancelBetId(null)}
                className="flex-1 py-3 rounded-xl border border-white/20 text-white font-semibold hover:bg-white/10 transition-colors"
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

          <div className="relative w-full max-w-md rounded-[28px] overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.65)] border border-white/10 bg-[#202124]">
            <div className="bg-black text-white text-center py-4 text-2xl font-extrabold border-b border-white/10">
              Filter Type
            </div>

            <div className="bg-[#202124] text-white">
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
                      className="flex items-center gap-4 bg-black/25 rounded-xl border border-white/10 shadow-sm px-4 py-4 hover:border-[#d4af37]/40 transition-colors"
                    >
                      <input
                        type="checkbox"
                        className="w-6 h-6 accent-[#d4af37]"
                        checked={draftMarkets.includes(name.key)}
                        onChange={() => toggleDraft(draftMarkets, name.key, setDraftMarkets)}
                      />
                      <span className="text-sm sm:text-base font-semibold tracking-wide text-white">
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
                    className="rounded-full bg-black border border-white/10 text-white font-bold py-4 text-base sm:text-lg shadow-md active:scale-[0.99] hover:border-[#d4af37]/40 transition-colors"
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

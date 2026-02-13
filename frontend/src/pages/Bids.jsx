import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';
import { getRatesCurrent, getMyBetHistory, cancelBet, updateUserBalance } from '../api/bets';
import ResultDatePicker from '../components/ResultDatePicker';
import MenuItemCard from '../components/MenuItemCard';
import ResponsiveSidebarLayout from '../components/ResponsiveSidebarLayout';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useRefreshOnMarketReset } from '../hooks/useRefreshOnMarketReset';

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

  // Mobile only: prevent page scrolling (as requested)
  useEffect(() => {
    let cleanup = () => {};
    try {
      const mql = window.matchMedia('(max-width: 767px)');
      const apply = () => {
        cleanup();
        if (!mql.matches) return;
        const prevBody = document.body.style.overflow;
        const prevHtml = document.documentElement.style.overflow;
        const prevOverscrollBody = document.body.style.overscrollBehavior;
        const prevOverscrollHtml = document.documentElement.style.overscrollBehavior;
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overscrollBehavior = 'none';
        document.documentElement.style.overscrollBehavior = 'none';
        cleanup = () => {
          document.body.style.overflow = prevBody;
          document.documentElement.style.overflow = prevHtml;
          document.body.style.overscrollBehavior = prevOverscrollBody;
          document.documentElement.style.overscrollBehavior = prevOverscrollHtml;
        };
      };
      apply();
      mql.addEventListener?.('change', apply);
      return () => {
        mql.removeEventListener?.('change', apply);
        cleanup();
      };
    } catch (_) {
      return () => cleanup();
    }
  }, []);

  const items = useMemo(() => ([
    {
      title: 'Bet History',
      subtitle: 'You can view your market bet history',
      color: '#f3b61b'
    },
    {
      title: 'Game Results',
      subtitle: 'You can view your market result history',
      color: '#25d366',
      iconUrl: 'https://res.cloudinary.com/dzd47mpdo/image/upload/v1769799295/result_ekwn16.png'
    },
    {
      title: 'Starline Bet History',
      subtitle: 'You can view starline history',
      color: '#ef4444'
    },
    {
      title: 'King Bazaar Bet History',
      subtitle: 'You can view starline result',
      color: '#3b82f6'
    },
    
  ]), []);

  const TAB_TO_TITLE = useMemo(() => ({
    'bet-history': 'Bet History',
    'game-results': 'Game Results',
    'starline-bet-history': 'Starline Bet History',
    'king-bazaar-bet-history': 'King Bazaar Bet History',
  }), []);
  const TITLE_TO_TAB = useMemo(() => ({
    'Bet History': 'bet-history',
    'Game Results': 'game-results',
    'Starline Bet History': 'starline-bet-history',
    'King Bazaar Bet History': 'king-bazaar-bet-history',
  }), []);

  const tabParam = (searchParams.get('tab') || '').toString();
  const initialTitle = TAB_TO_TITLE[tabParam] || (items[0]?.title || 'Bet History');
  const [activeTitle, setActiveTitle] = useState(initialTitle);
  const activeItem = items.find((i) => i.title === activeTitle) || items[0];
  const isBetHistoryPanel = activeTitle === 'Bet History';
  const isStarlineBetHistoryPanel = activeTitle === 'Starline Bet History';
  const isKingBazaarBetHistoryPanel = activeTitle === 'King Bazaar Bet History';
  const isGameResultsPanel = activeTitle === 'Game Results';
  const rightPanelTitle = activeTitle === 'Game Results' ? 'Market Result History' : activeTitle;
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
    if (item?.title === 'Bet History') {
      navigate('/bet-history');
      return;
    }
    if (item?.title === 'Game Results') {
      navigate('/market-result-history');
      return;
    }
    if (item?.title === 'Starline Bet History') {
      navigate('/starline-bet-history');
      return;
    }
    if (item?.title === 'King Bazaar Bet History') {
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
    }
  };

  const refetchAll = async () => {
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
    const fetchBets = async () => {
      const result = await getMyBetHistory();
      if (!alive) return;
      if (result?.success && Array.isArray(result?.data)) {
        setApiBets(result.data);
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
      return { canCancel: false, reason: 'Market not found' };
    }

    const now = new Date();
    const betPlacedAt = new Date(bet.createdAt);
    const timeSinceBetPlaced = (now - betPlacedAt) / 1000 / 60; // minutes

    // Rule 1: Check if within 30 minutes of placing bet
    if (timeSinceBetPlaced > 30) {
      return { canCancel: false, reason: 'Can only cancel within 30 minutes of placing' };
    }

    // Rule 2: Check if at least 30 minutes before market closing
    const closeStr = (market?.closingTime || '').toString().trim();
    if (!closeStr) {
      return { canCancel: false, reason: 'Market timing not configured' };
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
        return { canCancel: false, reason: 'Cannot cancel within 30 minutes of market closing' };
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
          text: `Bet cancelled successfully. ₹${result.data?.refundedAmount || 0} refunded to your wallet.`
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
          text: result.message || 'Failed to cancel bet'
        });
        
        setTimeout(() => {
          setCancelMessage({ type: '', text: '' });
        }, 5000);
      }
    } catch (error) {
      setCancelMessage({
        type: 'error',
        text: error.message || 'Failed to cancel bet'
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
      const labelForType = (t) => {
        const s = String(t || '').toLowerCase();
        if (s === 'single') return 'Single Ank';
        if (s === 'jodi') return 'Digit';
        if (s === 'panna') return 'Panna';
        if (s === 'half-sangam') return 'Half Sangam';
        if (s === 'full-sangam') return 'Full Sangam';
        return 'Bet';
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
      
      const statusLabel = verdict.state === 'won' ? 'Win' 
        : verdict.state === 'lost' ? 'Loose'
        : verdict.state === 'cancelled' ? 'Cancelled'
        : 'Pending';
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
        const statusMap = { 'Win': 'Win', 'Loose': 'Loose', 'Pending': 'Pending', 'Cancelled': 'Cancelled' };
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
              aria-label="Back"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl sm:text-2xl font-bold">My Bets</h1>
          </div>

          <div className="hidden md:flex items-center justify-between gap-4 px-1">
            <div className="text-2xl font-extrabold text-white">{rightPanelTitle}</div>
            {isGameResultsPanel ? (
              <div className="w-[320px]">
                <ResultDatePicker
                  value={resultsDate}
                  onChange={setResultsDate}
                  maxDate={new Date()}
                  label="Select Date"
                  buttonClassName="px-4 py-2 rounded-full bg-black/40 border border-white/10 text-white font-bold text-sm shadow-sm hover:border-[#d4af37]/40 transition-colors"
                />
              </div>
            ) : isAnyHistoryPanel ? (
              <button
                type="button"
                onClick={() => setIsDesktopFilterOpen(true)}
                className="px-4 py-2 rounded-full bg-black/40 border border-white/10 text-[#d4af37] font-bold text-sm shadow-sm hover:border-[#d4af37]/40 transition-colors"
                aria-label="Filter By"
                title="Filter By"
              >
                Filter By
              </button>
            ) : null}
          </div>
        </div>

        <ResponsiveSidebarLayout
          sidebar={
            <div className="grid grid-cols-2 md:grid-cols-1 gap-2 sm:gap-3 md:gap-5 min-w-0 w-full">
              {items.map((item) => (
                <MenuItemCard
                  key={item.title}
                  title={item.title}
                  subtitle={item.subtitle}
                  color={item.color}
                  iconUrl={item.iconUrl}
                  active={item.title === activeTitle}
                  onClick={() => handleItemClick(item)}
                />
              ))}
            </div>
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
              <div className={isAnyHistoryPanel ? 'mt-0' : 'mt-6'}>
                {/* Cancel message for desktop */}
                {cancelMessage.text && (
                  <div className={`mb-3 rounded-xl px-4 py-3 text-sm ${
                    cancelMessage.type === 'success' 
                      ? 'bg-green-500/10 border border-green-500/30 text-green-200' 
                      : 'bg-red-500/10 border border-red-500/30 text-red-200'
                  }`}>
                    {cancelMessage.text}
                  </div>
                )}
                
                <div className="max-h-[calc(100vh-220px)] overflow-y-auto hide-scrollbar">
                  {!desktopBetHistory.uid ? (
                    <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-gray-300 text-sm">
                      Please login to see your bet history.
                    </div>
                  ) : groupedDesktopByMarket.length === 0 ? (
                    <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-gray-300 text-sm">
                      No bets found.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {groupedDesktopByMarket.map(({ marketKey, marketTitle, bets }) => (
                        <section key={marketKey} className="rounded-xl overflow-hidden border border-white/10 bg-black/25">
                          <div className="bg-[#0b2b55] px-4 py-2.5 border-b border-white/10">
                            <h3 className="text-white font-extrabold tracking-wide truncate text-sm">
                              {marketTitle.toUpperCase()}
                            </h3>
                            <p className="text-[#d4af37]/90 text-xs mt-0.5">{bets.length} bet{bets.length !== 1 ? 's' : ''}</p>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[580px] border-collapse text-sm">
                              <thead>
                                <tr className="border-b border-white/10 bg-black/20">
                                  <th className="text-left py-2 px-2 text-[#d4af37] font-bold text-xs uppercase tracking-wider">#</th>
                                  <th className="text-left py-2 px-2 text-[#d4af37] font-bold text-xs uppercase tracking-wider">Game Type</th>
                                  <th className="text-left py-2 px-2 text-[#d4af37] font-bold text-xs uppercase tracking-wider">Bet</th>
                                  <th className="text-center py-2 px-2 text-[#d4af37] font-bold text-xs uppercase tracking-wider">Session</th>
                                  <th className="text-right py-2 px-2 text-[#d4af37] font-bold text-xs uppercase tracking-wider">Points</th>
                                  <th className="text-center py-2 px-2 text-[#d4af37] font-bold text-xs uppercase tracking-wider">Status</th>
                                  <th className="text-left py-2 px-2 text-[#d4af37] font-bold text-xs uppercase tracking-wider">Time</th>
                                  <th className="text-center py-2 px-2 text-[#d4af37] font-bold text-xs uppercase tracking-wider w-24">Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {bets.map((row, idx) => {
                                  const { betId, betValue, gameType, points, session, verdict, createdAt, canCancel } = row;
                                  const statusCls = verdict.state === 'won' ? 'text-[#43b36a] font-semibold' : verdict.state === 'lost' ? 'text-red-400 font-semibold' : verdict.state === 'cancelled' ? 'text-orange-400 font-semibold' : 'text-amber-400/90 font-medium';
                                  const statusText = verdict.state === 'won' ? 'Won' : verdict.state === 'lost' ? 'Lost' : verdict.state === 'cancelled' ? 'Cancelled' : 'Pending';
                                  return (
                                    <tr key={betId} className="border-b border-white/5 hover:bg-white/[0.03]">
                                      <td className="py-2 px-2 text-gray-400 text-xs">{idx + 1}</td>
                                      <td className="py-2 px-2 text-white font-medium">{gameType}</td>
                                      <td className="py-2 px-2 text-white font-semibold">{betValue}</td>
                                      <td className="py-2 px-2 text-center">
                                        {session ? <span className="text-[10px] font-bold text-[#d4af37] border border-[#d4af37]/30 rounded px-1.5 py-0.5">{session}</span> : <span className="text-gray-500">—</span>}
                                      </td>
                                      <td className="py-2 px-2 text-right text-white font-semibold">{points}</td>
                                      <td className="py-2 px-2 text-center">
                                        <span className={statusCls}>{statusText}</span>
                                        {verdict.state === 'won' && verdict.payout > 0 && <div className="text-[#43b36a] text-[10px]">₹{Number(verdict.payout).toLocaleString('en-IN')}</div>}
                                      </td>
                                      <td className="py-2 px-2 text-gray-400 text-xs whitespace-nowrap">{formatTxnTime(createdAt)}</td>
                                      <td className="py-2 px-2 text-center">
                                        {verdict.state === 'pending' && canCancel?.canCancel ? (
                                          <button type="button" onClick={() => handleCancelBetClick(betId)} disabled={cancellingBetId === betId} className="inline-flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-semibold min-h-[32px] bg-gray-800 border border-gray-600 text-white hover:bg-gray-700 hover:border-amber-500/50 disabled:opacity-60" title="Cancel & refund">
                                            {cancellingBetId === betId ? <svg className="animate-spin h-3 w-3 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> : <><svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg><span>Cancel</span></>}
                                          </button>
                                        ) : verdict.state !== 'pending' ? <span className="text-gray-500 text-[10px]">—</span> : null}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </section>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : activeTitle === 'Game Results' ? (
              <div className="mt-3">
                <div className="mb-3 rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[#d4af37] text-xs font-semibold uppercase tracking-wider">Results for</p>
                    <p className="text-white font-bold text-sm sm:text-base mt-0.5">
                      {resultsDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="md:hidden shrink-0">
                    <ResultDatePicker
                      value={resultsDate}
                      onChange={setResultsDate}
                      maxDate={new Date()}
                      label="Date"
                      buttonClassName="px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white font-semibold text-xs hover:border-[#d4af37]/40 transition-colors"
                    />
                  </div>
                </div>
                <div className="max-h-[calc(100vh-300px)] overflow-y-auto hide-scrollbar">
                  {resultsRows.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-[#202124] p-6 text-center text-gray-300">
                      No results for this date.
                    </div>
                  ) : (
                    <>
                      {/* Desktop: table */}
                      <div className="hidden md:block rounded-xl overflow-hidden border border-white/10 bg-black/25">
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[320px] border-collapse text-sm">
                            <thead>
                              <tr className="border-b border-white/10 bg-black/20">
                                <th className="text-left py-2.5 px-3 text-[#d4af37] font-bold text-xs uppercase tracking-wider">#</th>
                                <th className="text-left py-2.5 px-3 text-[#d4af37] font-bold text-xs uppercase tracking-wider">Market</th>
                                <th className="text-right py-2.5 px-3 text-[#d4af37] font-bold text-xs uppercase tracking-wider">Result</th>
                              </tr>
                            </thead>
                            <tbody>
                              {resultsRows.map((r, idx) => (
                                <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                                  <td className="py-2 px-3 text-gray-400 text-xs">{idx + 1}</td>
                                  <td className="py-2 px-3 text-white font-semibold tracking-wide truncate max-w-[200px]">{r.name}</td>
                                  <td className="py-2 px-3 text-right font-extrabold tracking-wide text-[#d4af37] shrink-0">{r.result}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      {/* Mobile: cards */}
                      <div className="md:hidden space-y-3">
                        {resultsRows.map((r) => (
                          <div
                            key={r.id}
                            className="rounded-2xl bg-[#202124] border border-white/10 px-4 py-3 shadow-[0_10px_22px_rgba(0,0,0,0.35)] flex items-center justify-between gap-3"
                          >
                            <span className="font-semibold text-white text-sm truncate flex-1 min-w-0">{r.name}</span>
                            <span className="font-extrabold tracking-wide text-[#d4af37] shrink-0 text-sm">{r.result}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-6 text-gray-300 text-sm">
                Select an item from the left menu. We will add the actual pages/content here next.
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

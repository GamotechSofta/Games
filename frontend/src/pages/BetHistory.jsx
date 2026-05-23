import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../config/api';
import { getRatesCurrent, getMyBetHistory, cancelBet, updateUserBalance } from '../api/bets';
import { useRefreshOnMarketReset } from '../hooks/useRefreshOnMarketReset';
import { getBidOptionLabel, getBidOptionKey, BID_OPTION_FILTER_ORDER } from '../utils/betTypeLabels';

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

const sumDigits = (str) => [...String(str)].reduce((acc, c) => acc + (Number(c) || 0), 0);
const lastDigit = (str) => sumDigits(str) % 10;

const normalizeMarketName = (s) => (s || '').toString().trim().toLowerCase();

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

  // Determine if result is declared for this kind/session
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

const BetHistory = ({ pageTitle, marketScope = null } = {}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const displayTitle = pageTitle ?? t('bids.betHistory');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedSessions, setSelectedSessions] = useState([]); // ['OPEN','CLOSE']
  const [selectedStatuses, setSelectedStatuses] = useState([]); // ['Win','Loose','Pending','Cancelled']
  const [selectedMarkets, setSelectedMarkets] = useState([]); // normalized market keys
  const [selectedBidOptions, setSelectedBidOptions] = useState([]); // bid option keys
  const [markets, setMarkets] = useState([]);
  const [ratesMap, setRatesMap] = useState(null);
  const [localVersion, setLocalVersion] = useState(0);
  const [apiBets, setApiBets] = useState([]);
  const [betsLoading, setBetsLoading] = useState(true);
  const [cancellingBetId, setCancellingBetId] = useState(null);
  const [cancelMessage, setCancelMessage] = useState({ type: '', text: '' });
  const [confirmCancelBetId, setConfirmCancelBetId] = useState(null);
  const [copyToast, setCopyToast] = useState('');

  // Scope behavior:
  // - default (null/empty): MAIN markets only (exclude starline/king)
  // - "starline"/"startline": only starline/startline markets
  // - "king": only king bazaar markets
  const scopeRaw = (marketScope || '').toString().trim().toLowerCase();
  const scope = scopeRaw || 'main';
  const isStarlineMarketName = (marketTitle) => {
    const k = normalizeMarketName(marketTitle);
    return k.includes('starline') || k.includes('startline') || k.includes('star line') || k.includes('start line');
  };
  const isKingBazaarMarketName = (marketTitle) => {
    const k = normalizeMarketName(marketTitle);
    return k.includes('king') || k.includes('bazaar') || k.includes('bazar');
  };
  const inScope = (marketTitle) => {
    if (scope === 'starline' || scope === 'startline') return isStarlineMarketName(marketTitle);
    if (scope === 'king') return isKingBazaarMarketName(marketTitle);
    if (scope === 'main') return !isStarlineMarketName(marketTitle) && !isKingBazaarMarketName(marketTitle);
    return true;
  };

  const { userId, bets } = useMemo(() => {
    const u = safeParse(localStorage.getItem('user') || 'null', null);
    const uid = u?._id || u?.id || u?.userId || u?.userid || u?.user_id || u?.uid || null;
    
    // Filter API bets by scope
    const scoped = (apiBets || []).filter((bet) => {
      const marketTitle = bet?.marketId?.marketName || '';
      return inScope(marketTitle);
    });
    
    return { userId: uid, bets: scoped };
  }, [localVersion, scope, apiBets]);

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

  useEffect(() => {
    let alive = true;
    const wrapped = async () => {
      await fetchMarkets();
    };
    wrapped();
    const id = setInterval(wrapped, 30000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  useRefreshOnMarketReset(fetchMarkets);
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
      console.log('Cannot cancel - bet status:', bet?.status);
      return { canCancel: false, reason: `Status: ${bet?.status || 'unknown'}` };
    }

    const market = bet.marketId;
    if (!market) {
      console.log('Cannot cancel - market not found');
      return { canCancel: false, reason: 'Market not found' };
    }

    const now = new Date();
    const betPlacedAt = new Date(bet.createdAt);
    const timeSinceBetPlaced = (now - betPlacedAt) / 1000 / 60; // minutes

    console.log('Bet placed at:', betPlacedAt, 'Time since placed:', timeSinceBetPlaced, 'minutes');

    // Rule 1: Check if within 30 minutes of placing bet
    if (timeSinceBetPlaced > 30) {
      return { canCancel: false, reason: 'Can only cancel within 30 minutes of placing' };
    }

    // Rule 2: Check if at least 30 minutes before market closing
    const closeStr = (market?.closingTime || '').toString().trim();
    if (!closeStr) {
      console.log('Cannot cancel - market timing not configured');
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

      console.log('Market closing at:', new Date(closeAt), 'Time until closing:', timeUntilClosing, 'minutes');

      if (timeUntilClosing < 30) {
        return { canCancel: false, reason: 'Cannot cancel within 30 minutes of market closing' };
      }

      console.log('Bet CAN be cancelled!');
      return { canCancel: true, reason: '' };
    } catch (e) {
      console.error('Error checking market timing:', e);
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

  // Handle cancel bet (after confirmation)
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
        
        // Clear message after 5 seconds
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
      const isStar = item.type === 'startline' || (item.type == null && isStarlineMarketName(item.name));
      const isKing = item.type === 'king' || (item.type == null && isKingBazaarMarketName(item.name));
      
      if (scope === 'starline' || scope === 'startline') return isStar;
      if (scope === 'king') return isKing;
      if (scope === 'main') return !isStar && !isKing;
      return true;
    });
    
    filtered.sort((a, b) => a.name.localeCompare(b.name));
    return filtered.map((item) => ({ label: item.name, key: normalizeMarketName(item.name) }));
  }, [markets, bets, scope]);

  const enriched = useMemo(() => {
    console.log('Enriching bets, flat count:', flat.length);
    return flat.map((item) => {
      const { bet, betId, marketTitle, betNumber, amount, session, betType, status, createdAt, marketData } = item;
      const m = marketByName.get(normalizeMarketName(marketTitle)) || marketData;
      
      console.log('Processing bet:', betId, 'status:', status, 'market:', marketTitle, 'marketData:', marketData);
      
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
          canCancel: status === 'pending' ? canCancelBet(bet) : { canCancel: false, reason: `Status is ${status}` },
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

      const cancelCheck = canCancelBet(bet);
      console.log('Cancel check for bet', betId, ':', cancelCheck);

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
        canCancel: cancelCheck,
      };
    });
  }, [flat, marketByName, ratesMap, t]);

  const filtered = useMemo(() => {
    return (enriched || []).filter((row) => {
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
  }, [enriched, selectedMarkets, selectedSessions, selectedStatuses, selectedBidOptions]);

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

  const statusLabel = (verdict) => {
    if (verdict?.state === 'won') return { text: t('bids.status.win'), className: 'text-[#43b36a] font-semibold' };
    if (verdict?.state === 'lost') return { text: t('bids.status.lost'), className: 'text-red-400 font-semibold' };
    if (verdict?.state === 'cancelled') return { text: t('bids.status.cancelled'), className: 'text-orange-400 font-semibold' };
    return { text: t('bids.status.pending'), className: 'text-amber-400/90 font-medium' };
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
    <div className="min-h-screen bg-[#f5f5f7] text-gray-900 dark:bg-black dark:text-white px-3 sm:px-4 pt-3 pb-[calc(7rem+env(safe-area-inset-bottom,0px))]">
      <div className="w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto">
        {/* Header row */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/bids', { replace: true })}
              className="w-10 h-10 rounded-full bg-white/10 border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-800 dark:text-white hover:bg-white/15 active:scale-95 transition"
              aria-label="Back"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl sm:text-2xl font-bold truncate">{displayTitle}</h1>
          </div>

          <button
            type="button"
            onClick={() => setIsFilterOpen(true)}
            className="shrink-0 flex items-center gap-2 text-[#d4af37] hover:text-[#f3b61b] transition-colors"
            aria-label={t('bids.filterBy')}
            title={t('bids.filterBy')}
          >
            <span className="text-sm font-semibold">{t('bids.filterBy')}</span>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18l-7 8v6l-4 2v-8L3 4z" />
            </svg>
          </button>
        </div>

        {/* Cancel message */}
        {cancelMessage.text && (
          <div className={`mb-4 rounded-xl px-4 py-3 text-sm ${
            cancelMessage.type === 'success'
              ? 'bg-green-500/10 border border-green-500/30 text-green-200'
              : 'bg-red-500/10 border border-red-500/30 text-red-200'
          }`}>
            {cancelMessage.text}
          </div>
        )}

        {/* Bet ID copied toast */}
        {copyToast && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[1100] px-4 py-2.5 rounded-lg bg-[#d4af37] text-black font-semibold text-sm shadow-lg">
            {copyToast}
          </div>
        )}

        {/* Cancel bet confirmation modal (mobile + desktop) */}
        {confirmCancelBetId && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/70">
            <div className="w-full max-w-sm rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#202124] shadow-2xl p-5 space-y-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('bids.cancelBetTitle')}</h3>
              <p className="text-gray-300 text-sm">
                {t('bids.cancelBetConfirm')}
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmCancelBetId(null)}
                  className="flex-1 py-3 rounded-xl border border-white/20 text-gray-900 dark:text-white font-semibold hover:bg-white/10 transition-colors"
                >
                  {t('bids.noKeepBet')}
                </button>
                <button
                  type="button"
                  onClick={() => handleCancelBetConfirm(confirmCancelBetId)}
                  className="flex-1 py-3 rounded-xl bg-amber-500 text-black font-bold hover:bg-amber-400 transition-colors"
                >
                  {t('bids.yesCancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* One card per bet, newest first (no market grouping) */}
        <div className="space-y-4">
          {betsLoading ? (
            <div className="grid grid-cols-2 gap-3 overflow-x-hidden">
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
          ) : !userId ? (
            <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#202124] p-6 text-center text-gray-300">
              {t('bids.loginToSeeHistory')}
            </div>
          ) : allBetsNewestFirst.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#202124] p-6 text-center text-gray-300">
              {t('bids.noBetsFound')}
            </div>
          ) : (
            <>
              {/* Mobile: 2x2 grid, each bet = one card */}
              <div className="md:hidden grid grid-cols-2 gap-3 overflow-x-hidden">
                {allBetsNewestFirst.map((row, idx) => {
                  const { betId, points, session, betNumber, verdict, createdAt, canCancel, marketTitle, gameType } = row;
                  const isScheduled = row.bet?.scheduledDate || row.bet?.isScheduled;
                  const scheduledDateStr = formatScheduledDate(row.bet?.scheduledDate);
                  const betValue = betNumber != null ? renderBetNumber(betNumber) : '-';
                  const status = statusLabel(verdict);
                  return (
                    <div
                      key={betId}
                      className={`relative rounded-lg border-2 bg-white dark:bg-[#202124] p-2 space-y-1.5 min-w-0 shadow-[0_8px_20px_rgba(0,0,0,0.3)] overflow-hidden ${
                        verdict?.state === 'won'
                          ? 'border-[#43b36a]'
                          : verdict?.state === 'lost'
                            ? 'border-red-500'
                            : verdict?.state === 'pending'
                              ? 'border-amber-500'
                              : verdict?.state === 'cancelled'
                                ? 'border-orange-400'
                                : 'border-gray-200 dark:border-white/10'
                      }`}
                    >
                      {verdict?.state === 'cancelled' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10 pointer-events-none">
                          <svg className="w-12 h-12 text-orange-400 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        </div>
                      )}
                      <div className="flex justify-between items-center gap-1 flex-wrap">
                        <span className="text-[#d4af37] text-[10px] font-semibold shrink-0">#{idx + 1}</span>
                        {session ? <span className="text-[9px] font-bold text-[#d4af37] border border-[#d4af37]/30 rounded px-1 py-0.5 shrink-0">{session}</span> : null}
                      </div>
                      <div className="flex justify-between items-center gap-1 text-[10px]">
                        <span className="text-gray-400 shrink-0">{t('bids.betIdLabel')}</span>
                        <span className="flex items-center gap-1 min-w-0">
                          <span className="font-mono text-gray-300 truncate" title={betId}>{String(betId || '').slice(-8)}</span>
                          <button type="button" onClick={(e) => { e.stopPropagation(); copyToClipboard(betId, () => { setCopyToast(t('bids.betIdCopied')); setTimeout(() => setCopyToast(''), 2000); }); }} className="shrink-0 p-0.5 text-gray-400 hover:text-[#d4af37] transition-colors" title={t('bids.copyBetId')} aria-label={t('bids.copyBetId')}>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                          </button>
                        </span>
                      </div>
                      {isScheduled && (
                        <div className="text-[9px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded px-1.5 py-0.5 inline-block shrink-0">
                          {t('bids.scheduledBet')}{scheduledDateStr ? ` · ${scheduledDateStr}` : ''}
                        </div>
                      )}
                      <p className="text-[10px] text-gray-400 truncate" title={marketTitle}>{marketTitle?.toUpperCase() || 'MARKET'}</p>
                      <div className="flex justify-between gap-1 text-xs">
                        <span className="text-gray-400 shrink-0">{t('bids.gameLabel')}</span>
                        <span className="text-gray-900 dark:text-white font-medium truncate">{gameType}</span>
                      </div>
                      <div className="flex justify-between gap-1 text-xs">
                        <span className="text-gray-400 shrink-0">{t('bids.betLabel')}</span>
                        <span className="text-gray-900 dark:text-white font-bold truncate">{betValue}</span>
                      </div>
                      <div className="flex justify-between gap-1 text-xs">
                        <span className="text-gray-400 shrink-0">{t('bids.pointsLabel')}</span>
                        <span className="text-gray-900 dark:text-white font-semibold">{points}</span>
                      </div>
                      <div className="flex justify-between gap-1 text-xs items-center min-w-0">
                        <span className="text-gray-400 shrink-0">{t('bids.statusLabel')}</span>
                        <span className={`${status.className} truncate text-[10px]`}>{status.text}{verdict?.state === 'won' && verdict?.payout > 0 ? ` ₹${Number(verdict.payout).toLocaleString('en-IN')}` : ''}</span>
                      </div>
                      <div className="flex justify-between gap-1 text-[10px]">
                        <span className="text-gray-400 shrink-0">{t('bids.timeLabel')}</span>
                        <span className="text-gray-300 truncate">{formatTxnTime(createdAt)}</span>
                      </div>
                      {verdict?.state === 'pending' && canCancel?.canCancel && (
                        <div className="pt-1.5 border-t border-gray-200 dark:border-white/10">
                          <button
                            type="button"
                            onClick={() => handleCancelBetClick(betId)}
                            disabled={cancellingBetId === betId}
                            title={t('bids.cancelAndRefund')}
                            className="w-full inline-flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-semibold min-h-[36px] bg-gray-200 border border-gray-300 text-gray-900 hover:bg-gray-300 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:hover:bg-gray-700 disabled:opacity-60 disabled:cursor-wait"
                          >
                            {cancellingBetId === betId ? <><svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> {t('bids.cancelling')}</> : <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg> {t('bids.cancelAndRefund')}</>}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Desktop: table, one row per bet */}
              <div className="hidden md:block overflow-x-auto rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#202124] shadow-[0_12px_24px_rgba(0,0,0,0.35)]">
                <table className="w-full min-w-[640px] lg:min-w-[720px] border-collapse text-sm lg:text-base">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-white/10 bg-black/20">
                      <th className="text-left py-3 px-3 lg:py-4 lg:px-4 text-[#d4af37] font-bold text-xs uppercase tracking-wider">#</th>
                      <th className="text-left py-3 px-3 lg:py-4 lg:px-4 text-[#d4af37] font-bold text-xs uppercase tracking-wider">{t('bids.betIdLabel')}</th>
                      <th className="text-left py-3 px-3 lg:py-4 lg:px-4 text-[#d4af37] font-bold text-xs uppercase tracking-wider">{t('bids.market')}</th>
                      <th className="text-left py-3 px-3 lg:py-4 lg:px-4 text-[#d4af37] font-bold text-xs uppercase tracking-wider">{t('bids.gameTypeLabel')}</th>
                      <th className="text-left py-3 px-3 lg:py-4 lg:px-4 text-[#d4af37] font-bold text-xs uppercase tracking-wider">{t('bids.betNumberLabel')}</th>
                      <th className="text-center py-3 px-3 lg:py-4 lg:px-4 text-[#d4af37] font-bold text-xs uppercase tracking-wider">{t('bids.sessionLabel')}</th>
                      <th className="text-right py-3 px-3 lg:py-4 lg:px-4 text-[#d4af37] font-bold text-xs uppercase tracking-wider">{t('bids.pointsLabel')}</th>
                      <th className="text-center py-3 px-3 lg:py-4 lg:px-4 text-[#d4af37] font-bold text-xs uppercase tracking-wider">{t('bids.statusLabel')}</th>
                      <th className="text-left py-3 px-3 lg:py-4 lg:px-4 text-[#d4af37] font-bold text-xs uppercase tracking-wider">{t('bids.dateTimeLabel')}</th>
                      <th className="text-center py-3 px-3 lg:py-4 lg:px-4 text-[#d4af37] font-bold text-xs uppercase tracking-wider w-32">{t('bids.actionLabel')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allBetsNewestFirst.map((row, idx) => {
                      const { betId, points, session, betNumber, verdict, createdAt, canCancel, marketTitle, gameType } = row;
                      const isScheduled = row.bet?.scheduledDate || row.bet?.isScheduled;
                      const scheduledDateStr = formatScheduledDate(row.bet?.scheduledDate);
                      const betValue = betNumber != null ? renderBetNumber(betNumber) : '-';
                      const status = statusLabel(verdict);
                      return (
                        <tr
                          key={betId}
                          className={`border-b border-gray-200 dark:border-white/5 hover:bg-white/[0.03] transition-colors ${
                            row.verdict?.state === 'won'
                              ? 'bg-[#43b36a]/10 border-l-4 border-l-[#43b36a]'
                              : row.verdict?.state === 'lost'
                                ? 'bg-red-500/10 border-l-4 border-l-red-500'
                                : row.verdict?.state === 'pending'
                                  ? 'bg-amber-500/10 border-l-4 border-l-amber-500'
                                  : row.verdict?.state === 'cancelled'
                                    ? 'bg-orange-400/10 border-l-4 border-l-orange-400'
                                    : ''
                          }`}
                        >
                          <td className="py-3 px-3 lg:py-4 lg:px-4 text-gray-400 text-sm">{idx + 1}</td>
                          <td className="py-3 px-3 lg:py-4 lg:px-4">
                            <span className="flex items-center gap-1.5">
                              <span className="font-mono text-gray-300 text-xs" title={betId}>{String(betId || '').slice(-8)}</span>
                              <button type="button" onClick={() => { copyToClipboard(betId, () => { setCopyToast(t('bids.betIdCopied')); setTimeout(() => setCopyToast(''), 2000); }); }} className="p-1 text-gray-400 hover:text-[#d4af37] transition-colors" title={t('bids.copyBetId')} aria-label={t('bids.copyBetId')}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                              </button>
                            </span>
                          </td>
                          <td className="py-3 px-3 lg:py-4 lg:px-4 text-gray-900 dark:text-white text-sm font-medium truncate max-w-[120px]" title={marketTitle}>
                            <span className="block truncate">{marketTitle?.toUpperCase() || '—'}</span>
                            {isScheduled && (
                              <span className="inline-block mt-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded px-1.5 py-0.5">
                                {t('bids.scheduledBet')}{scheduledDateStr ? ` · ${scheduledDateStr}` : ''}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 lg:py-4 lg:px-4 text-gray-900 dark:text-white text-sm font-medium">{gameType}</td>
                          <td className="py-3 px-3 lg:py-4 lg:px-4 text-gray-900 dark:text-white font-semibold">{betValue}</td>
                          <td className="py-3 px-3 lg:py-4 lg:px-4 text-center">
                            {session ? (
                              <span className="text-xs font-bold text-[#d4af37] border border-[#d4af37]/30 rounded-full px-2 py-0.5">{session}</span>
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
                          <td className="py-3 px-3 lg:py-4 lg:px-4 text-gray-400 text-xs whitespace-nowrap">{formatTxnTime(createdAt)}</td>
                          <td className="py-3 px-3 lg:py-4 lg:px-4 text-center">
                            {verdict?.state === 'pending' && canCancel?.canCancel ? (
                              <button
                                type="button"
                                onClick={() => handleCancelBetClick(betId)}
                                disabled={cancellingBetId === betId}
                                title={t('bids.cancelAndRefund')}
                                className="inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold min-h-[36px] bg-gray-200 border border-gray-300 text-gray-900 hover:bg-gray-300 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:hover:bg-gray-700 hover:border-amber-500/50 active:scale-[0.98] disabled:opacity-60 disabled:cursor-wait"
                              >
                                {cancellingBetId === betId ? (
                                  <><svg className="animate-spin h-3.5 w-3.5 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg><span>{t('bids.cancelling')}</span></>
                                ) : (
                                  <><svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg><span>{t('bids.cancelBet')}</span></>
                                )}
                              </button>
                            ) : verdict?.state === 'cancelled' ? (
                              <svg className="w-6 h-6 text-orange-400 mx-auto inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" title="Cancelled">
                                <path d="M18 6L6 18M6 6l12 12" />
                              </svg>
                            ) : (
                              <span className="text-gray-500 text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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
            <div className="bg-gray-100 dark:bg-black text-gray-900 dark:text-white text-center py-4 text-2xl font-extrabold border-b border-gray-200 dark:border-white/10">
              Filter Type
            </div>

            <div className="bg-white dark:bg-[#202124] text-gray-900 dark:text-white">
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

                <div className="h-px bg-gray-200 dark:bg-white/10 my-3" />

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

                {bidOptionFilterOptions.length > 0 ? (
                  <>
                    <div className="h-px bg-gray-200 dark:bg-white/10 my-3" />
                    <div className="text-lg font-bold text-[#d4af37] mb-3">{t('bids.byBidOption')}</div>
                    <div className="space-y-3 pb-4">
                      {bidOptionFilterOptions.map((opt) => (
                        <label
                          key={opt.key}
                          className="flex items-center gap-4 bg-black/25 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm px-4 py-3 hover:border-[#d4af37]/40 transition-colors"
                        >
                          <input
                            type="checkbox"
                            className="w-6 h-6 accent-[#d4af37]"
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
                    onClick={() => setIsFilterOpen(false)}
                    className="rounded-full bg-gray-100 dark:bg-black border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white font-bold py-4 text-base sm:text-lg shadow-md active:scale-[0.99] hover:border-[#d4af37]/40 transition-colors"
                  >
                    Cancel
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

export default BetHistory;


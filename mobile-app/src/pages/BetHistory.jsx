import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Modal, StyleSheet, Clipboard, Alert, FlatList, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../hooks/useTranslation';
import { API_BASE_URL } from '../config/api';
import { getRatesCurrent, getMyBetHistory, cancelBet, updateUserBalance } from '../api/bets';
import { useRefreshOnMarketReset } from '../hooks/useRefreshOnMarketReset';
import { storage } from '../utils/storage';
import { colors, spacing, borderRadius, fontSize } from '../theme';

/* ─── Helpers ─── */
const safeParse = (raw, fallback) => { try { return JSON.parse(raw); } catch { return fallback; } };

const txnDateFormatter = new Intl.DateTimeFormat('en-GB');
const txnTimeFormatter = new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' });
const istDateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });

const formatTxnTime = (iso) => {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '-';
    const date = txnDateFormatter.format(d).replace(/\//g, '-');
    const time = txnTimeFormatter.format(d);
    return `${date} ${time}`;
  } catch { return '-'; }
};

const formatScheduledDate = (scheduledDate) => {
  if (!scheduledDate) return null;
  try {
    const d = typeof scheduledDate === 'string' ? new Date(scheduledDate) : scheduledDate;
    if (Number.isNaN(d?.getTime())) return null;
    return txnDateFormatter.format(d).replace(/\//g, '/');
  } catch { return null; }
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
    kind === 'digit' ? (sess === 'OPEN' ? !!openDigit : sess === 'CLOSE' ? !!closeDigit : !!(openDigit && closeDigit))
      : kind === 'panna' ? (sess === 'OPEN' ? !!opening : sess === 'CLOSE' ? !!closing : !!(opening && closing))
        : kind === 'jodi' ? !!jodi
          : kind === 'half-sangam-open' ? !!(opening && openDigit)
            : kind === 'half-sangam-close' || kind === 'full-sangam' ? !!(opening && closing) : false;
  if (!declared) return { state: 'pending', kind, payout: 0 };
  let won = false;
  if (kind === 'digit') {
    if (sess === 'OPEN') won = betNumber === openDigit;
    else if (sess === 'CLOSE') won = betNumber === closeDigit;
    else won = betNumber === openDigit || betNumber === closeDigit;
  } else if (kind === 'jodi') { won = betNumber === jodi; }
  else if (kind === 'panna') {
    if (sess === 'OPEN') won = betNumber === opening;
    else if (sess === 'CLOSE') won = betNumber === closing;
    else won = betNumber === opening || betNumber === closing;
  } else if (kind === 'full-sangam') { won = betNumber === `${opening}-${closing}`; }
  else if (kind === 'half-sangam-open') { won = betNumber === `${opening}-${openDigit}`; }
  else if (kind === 'half-sangam-close') { won = betNumber === `${openDigit}-${closing}`; }
  if (!won) return { state: 'lost', kind, payout: 0 };
  const mul = getPayoutMultiplier(kind, betNumber, ratesMap);
  const payout = mul > 0 ? (Number(amount) || 0) * mul : 0;
  return { state: 'won', kind, payout };
};

export default function BetHistory({ pageTitle, marketScope = null }) {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const displayTitle = pageTitle ?? t('bids.betHistory');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedSessions, setSelectedSessions] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [selectedMarkets, setSelectedMarkets] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [ratesMap, setRatesMap] = useState(null);
  const [localVersion, setLocalVersion] = useState(0);
  const [apiBets, setApiBets] = useState([]);
  const [betsLoading, setBetsLoading] = useState(true);
  const [cancellingBetId, setCancellingBetId] = useState(null);
  const [cancelMessage, setCancelMessage] = useState({ type: '', text: '' });
  const [confirmCancelBetId, setConfirmCancelBetId] = useState(null);
  const [copyToast, setCopyToast] = useState('');
  const [userId, setUserId] = useState(null);

  // Draft filter state
  const [draftSessions, setDraftSessions] = useState([]);
  const [draftStatuses, setDraftStatuses] = useState([]);
  const [draftMarkets, setDraftMarkets] = useState([]);

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

  const labelForTypeInner = (betType) => {
    const s = String(betType || '').toLowerCase();
    if (s === 'single') return t('bids.gameType.singleAnk');
    if (s === 'jodi') return t('gameRate.jodi');
    if (s === 'panna') return t('bids.gameType.panna');
    if (s === 'half-sangam' || s === 'half-sangam-open' || s === 'half-sangam-close') return t('bids.gameType.halfSangam');
    if (s === 'full-sangam') return t('bids.gameType.fullSangam');
    return betType || t('bids.gameType.bet');
  };

  const getStatusColorInner = (state) => {
    if (state === 'won') return '#43b36a';
    if (state === 'lost') return '#f87171';
    if (state === 'cancelled') return '#fb923c';
    return '#fbbf24';
  };

  const getStatusTextInner = (verdict) => {
    if (verdict?.state === 'won') return t('bids.status.win');
    if (verdict?.state === 'lost') return t('bids.status.lost');
    if (verdict?.state === 'cancelled') return t('bids.status.cancelled');
    return t('bids.status.pending');
  };

  const getBorderColorInner = (state) => {
    if (state === 'won') return '#43b36a';
    if (state === 'lost') return '#ef4444';
    if (state === 'pending') return '#f59e0b';
    if (state === 'cancelled') return '#fb923c';
    return 'rgba(255,255,255,0.1)';
  };

  useEffect(() => {
    storage.getItem('user').then((raw) => {
      const u = safeParse(raw, null);
      const uid = u?._id || u?.id || u?.userId || u?.userid || u?.user_id || u?.uid || null;
      setUserId(uid);
    });
  }, []);

  const bets = useMemo(() => {
    return (apiBets || []).filter((bet) => {
      const marketTitle = bet?.marketId?.marketName || '';
      return inScope(marketTitle);
    });
  }, [apiBets, scope]);

  const flat = useMemo(() => {
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

  const fetchMarkets = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/markets/get-markets`);
      const data = await res.json();
      if (data?.success && Array.isArray(data?.data)) setMarkets(data.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchMarkets();
    const id = setInterval(fetchMarkets, 30000);
    return () => clearInterval(id);
  }, [fetchMarkets]);

  useRefreshOnMarketReset(fetchMarkets);

  useEffect(() => {
    let alive = true;
    getRatesCurrent().then((result) => {
      if (!alive) return;
      if (result?.success && result?.data) setRatesMap(result.data);
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    setBetsLoading(true);
    const fetchBets = async () => {
      try {
        const result = await getMyBetHistory();
        if (!alive) return;
        if (result?.success && Array.isArray(result?.data)) setApiBets(result.data);
      } finally {
        if (alive) setBetsLoading(false);
      }
    };
    fetchBets();
    const id = setInterval(fetchBets, 30000);
    return () => { alive = false; clearInterval(id); };
  }, [localVersion]);

  const canCancelBet = (bet) => {
    if (!bet || bet.status !== 'pending') return { canCancel: false, reason: `Status: ${bet?.status || 'unknown'}` };
    const market = bet.marketId;
    if (!market) return { canCancel: false, reason: 'Market not found' };
    const now = new Date();
    const betPlacedAt = new Date(bet.createdAt);
    const timeSinceBetPlaced = (now - betPlacedAt) / 1000 / 60;
    if (timeSinceBetPlaced > 30) return { canCancel: false, reason: 'Can only cancel within 30 minutes of placing' };
    const closeStr = (market?.closingTime || '').toString().trim();
    if (!closeStr) return { canCancel: false, reason: 'Market timing not configured' };
    try {
      const getTodayISTValue = () => istDateFormatter.format(new Date());
      const normalizeTimeStr = (timeStr) => {
        const parts = timeStr.split(':').map((p) => String(parseInt(p, 10) || 0).padStart(2, '0'));
        return `${parts[0] || '00'}:${parts[1] || '00'}:${parts[2] || '00'}`;
      };
      const parseISTDateTime = (isoStr) => { const d = new Date(isoStr); return isNaN(d.getTime()) ? null : d.getTime(); };
      const todayIST = getTodayISTValue();
      const openAt = parseISTDateTime(`${todayIST}T00:00:00+05:30`);
      let closeAt = parseISTDateTime(`${todayIST}T${normalizeTimeStr(closeStr)}+05:30`);
      if (closeAt <= openAt) {
        const baseDate = new Date(`${todayIST}T12:00:00+05:30`);
        baseDate.setDate(baseDate.getDate() + 1);
        const nextDayStr = istDateFormatter.format(baseDate);
        closeAt = parseISTDateTime(`${nextDayStr}T${normalizeTimeStr(closeStr)}+05:30`);
      }
      const timeUntilClosing = (closeAt - now.getTime()) / 1000 / 60;
      if (timeUntilClosing < 30) return { canCancel: false, reason: 'Cannot cancel within 30 minutes of market closing' };
      return { canCancel: true, reason: '' };
    } catch { return { canCancel: false, reason: 'Error checking market timing' }; }
  };

  const handleCancelBet = async (betIdParam) => {
    const betId = typeof betIdParam === 'string' ? betIdParam : (betIdParam?._id ?? betIdParam?.$oid ?? String(betIdParam || ''));
    if (!betId) return;
    setCancellingBetId(betId);
    setCancelMessage({ type: '', text: '' });
    try {
      const result = await cancelBet(betId);
      if (result.success) {
        if (result.data?.newBalance != null) updateUserBalance(result.data.newBalance);
        setCancelMessage({ type: 'success', text: `Bet cancelled. ₹${result.data?.refundedAmount || 0} refunded.` });
        setLocalVersion(v => v + 1);
        setTimeout(() => setCancelMessage({ type: '', text: '' }), 5000);
      } else {
        setCancelMessage({ type: 'error', text: result.message || 'Failed to cancel bet' });
        setTimeout(() => setCancelMessage({ type: '', text: '' }), 5000);
      }
    } catch (error) {
      setCancelMessage({ type: 'error', text: error.message || 'Failed to cancel bet' });
      setTimeout(() => setCancelMessage({ type: '', text: '' }), 5000);
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
    const fromHistory = (bets || []).map((bet) => ({ name: (bet?.marketId?.marketName || '').toString().trim() })).filter((x) => x.name);
    const uniqueMap = new Map();
    for (const item of fromHistory) {
      const key = normalizeMarketName(item.name);
      if (!uniqueMap.has(key)) uniqueMap.set(key, item);
    }
    const filtered = Array.from(uniqueMap.values()).filter((item) => {
      const isStar = isStarlineMarketName(item.name);
      const isKing = isKingBazaarMarketName(item.name);
      if (scope === 'starline' || scope === 'startline') return isStar;
      if (scope === 'king') return isKing;
      if (scope === 'main') return !isStar && !isKing;
      return true;
    });
    filtered.sort((a, b) => a.name.localeCompare(b.name));
    return filtered.map((item) => ({ label: item.name, key: normalizeMarketName(item.name) }));
  }, [bets, scope]);

  const enriched = useMemo(() => {
    return flat.map((item) => {
      const { bet, betId, marketTitle, betNumber, amount, session, betType, status, createdAt, marketData } = item;
      const m = marketByName.get(normalizeMarketName(marketTitle)) || marketData;
      if (status === 'won' || status === 'lost' || status === 'cancelled') {
        const verdict = { state: status, payout: bet.payout || 0, kind: inferBetKind(betNumber) };
        return { bet, betId, points: amount, session, marketTitle, betNumber, betType, status, createdAt, verdict, canCancel: { canCancel: false, reason: `Status is ${status}` } };
      }
      const computed = evaluateBet({ market: m, betNumberRaw: betNumber, amount, session, ratesMap });
      const cancelCheck = canCancelBet(bet);
      return { bet, betId, points: amount, session, marketTitle, betNumber, betType, status, createdAt, verdict: computed, canCancel: cancelCheck };
    });
  }, [flat, marketByName, ratesMap]);

  const filtered = useMemo(() => {
    return (enriched || []).filter((row) => {
      if (selectedSessions.length > 0 && !selectedSessions.includes(row.session)) return false;
      if (selectedMarkets.length > 0) {
        const k = normalizeMarketName(row.marketTitle);
        if (!selectedMarkets.includes(k)) return false;
      }
      if (selectedStatuses.length > 0) {
        const st = row.verdict.state === 'won' ? 'Win' : row.verdict.state === 'lost' ? 'Loose' : row.verdict.state === 'cancelled' ? 'Cancelled' : 'Pending';
        if (!selectedStatuses.includes(st)) return false;
      }
      return true;
    });
  }, [enriched, selectedMarkets, selectedSessions, selectedStatuses]);

  const allBetsNewestFirst = useMemo(() => {
    return [...(filtered || [])].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [filtered]);

  const labelForType = (betType) => {
    const s = String(betType || '').toLowerCase();
    if (s === 'single') return t('bids.gameType.singleAnk');
    if (s === 'jodi') return t('gameRate.jodi');
    if (s === 'panna') return t('bids.gameType.panna');
    if (s === 'half-sangam' || s === 'half-sangam-open' || s === 'half-sangam-close') return t('bids.gameType.halfSangam');
    if (s === 'full-sangam') return t('bids.gameType.fullSangam');
    return betType || t('bids.gameType.bet');
  };

  const getStatusColor = (state) => {
    if (state === 'won') return '#43b36a';
    if (state === 'lost') return '#f87171';
    if (state === 'cancelled') return '#fb923c';
    return '#fbbf24';
  };

  const getStatusText = (verdict) => {
    if (verdict?.state === 'won') return t('bids.status.win');
    if (verdict?.state === 'lost') return t('bids.status.lost');
    if (verdict?.state === 'cancelled') return t('bids.status.cancelled');
    return t('bids.status.pending');
  };

  const getBorderColor = (state) => {
    if (state === 'won') return '#43b36a';
    if (state === 'lost') return '#ef4444';
    if (state === 'pending') return '#f59e0b';
    if (state === 'cancelled') return '#fb923c';
    return 'rgba(255,255,255,0.1)';
  };

  const copyBetId = (betId) => {
    Clipboard.setString(String(betId || ''));
    setCopyToast(t('bids.betIdCopied'));
    setTimeout(() => setCopyToast(''), 2000);
  };

  const toggleDraft = (arr, value, setArr) => {
    setArr((prev) => (prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]));
  };

  useEffect(() => {
    if (!isFilterOpen) return;
    setDraftSessions(selectedSessions);
    setDraftStatuses(selectedStatuses);
    setDraftMarkets(selectedMarkets);
  }, [isFilterOpen]);

  const applyFilters = () => {
    setSelectedSessions(draftSessions);
    setSelectedStatuses(draftStatuses);
    setSelectedMarkets(draftMarkets);
    setIsFilterOpen(false);
  };

  const resetFilters = () => {
    setDraftSessions([]);
    setDraftStatuses([]);
    setDraftMarkets([]);
  };

  const FilterChip = ({ label, active, onPress }) => (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.filterChip, active && styles.filterChipActive]}
      activeOpacity={0.7}
    >
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  const renderItem = useCallback(({ item, index }) => (
    <BetCardKeyed
      row={item}
      idx={index}
      t={t}
      copyBetId={copyBetId}
      setConfirmCancelBetId={setConfirmCancelBetId}
      cancellingBetId={cancellingBetId}
      labelForType={labelForTypeInner}
      getStatusColor={getStatusColorInner}
      getStatusText={getStatusTextInner}
      getBorderColor={getBorderColorInner}
    />
  ), [t, cancellingBetId, copyBetId, setConfirmCancelBetId]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Bids')} style={styles.backBtn} activeOpacity={0.8}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{displayTitle}</Text>
        <TouchableOpacity onPress={() => setIsFilterOpen(true)} style={styles.filterBtn} activeOpacity={0.8}>
          <Text style={styles.filterText}>{t('bids.filterBy')} ▼</Text>
        </TouchableOpacity>
      </View>

      {/* Cancel message */}
      {cancelMessage.text ? (
        <View style={[styles.msgBox, cancelMessage.type === 'success' ? styles.msgSuccess : styles.msgError]}>
          <Text style={styles.msgText}>{cancelMessage.text}</Text>
        </View>
      ) : null}

      {/* Copy toast */}
      {copyToast ? (
        <View style={styles.copyToast}><Text style={styles.copyToastText}>{copyToast}</Text></View>
      ) : null}

      {/* Confirm cancel modal */}
      <Modal visible={!!confirmCancelBetId} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('bids.cancelBetTitle')}</Text>
            <Text style={styles.modalBody}>{t('bids.cancelBetConfirm')}</Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity onPress={() => setConfirmCancelBetId(null)} style={styles.modalBtnCancel} activeOpacity={0.8}>
                <Text style={styles.modalBtnCancelText}>{t('bids.noKeepBet')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { const id = confirmCancelBetId; setConfirmCancelBetId(null); if (id) handleCancelBet(id); }}
                style={styles.modalBtnConfirm}
                activeOpacity={0.8}
              >
                <Text style={styles.modalBtnConfirmText}>{t('bids.yesCancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Filter modal */}
      <Modal visible={isFilterOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.filterModal}>
            <Text style={styles.filterModalTitle}>{t('bids.filterBy')}</Text>
            <Text style={styles.filterSectionLabel}>{t('bids.session')}</Text>
            <View style={styles.filterChipRow}>
              {['OPEN', 'CLOSE'].map((s) => (
                <FilterChip key={s} label={s} active={draftSessions.includes(s)} onPress={() => toggleDraft(draftSessions, s, setDraftSessions)} />
              ))}
            </View>
            <Text style={styles.filterSectionLabel}>{t('bids.status')}</Text>
            <View style={styles.filterChipRow}>
              {['Win', 'Loose', 'Pending', 'Cancelled'].map((s) => (
                <FilterChip key={s} label={s} active={draftStatuses.includes(s)} onPress={() => toggleDraft(draftStatuses, s, setDraftStatuses)} />
              ))}
            </View>
            {marketOptions.length > 0 && (
              <>
                <Text style={styles.filterSectionLabel}>{t('bids.market')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                  <View style={styles.filterChipRow}>
                    {marketOptions.map((m) => (
                      <FilterChip key={m.key} label={m.label} active={draftMarkets.includes(m.key)} onPress={() => toggleDraft(draftMarkets, m.key, setDraftMarkets)} />
                    ))}
                  </View>
                </ScrollView>
              </>
            )}
            <View style={styles.filterModalBtns}>
              <TouchableOpacity onPress={resetFilters} style={styles.filterResetBtn} activeOpacity={0.8}>
                <Text style={styles.filterResetText}>{t('common.reset')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={applyFilters} style={styles.filterApplyBtn} activeOpacity={0.8}>
                <Text style={styles.filterApplyText}>{t('common.apply')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIsFilterOpen(false)} style={styles.filterCloseBtn} activeOpacity={0.8}>
                <Text style={styles.filterCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bet list optimized with FlatList */}
      {betsLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.goldLight} />
        </View>
      ) : !userId ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>{t('bids.loginToSeeHistory')}</Text>
        </View>
      ) : allBetsNewestFirst.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>{t('bids.noBetsFound')}</Text>
        </View>
      ) : (
        <FlatList
          data={allBetsNewestFirst}
          renderItem={renderItem}
          keyExtractor={(item) => item.betId}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listGrid}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={Platform.OS === 'android'}
          maxToRenderPerBatch={8}
          initialNumToRender={10}
          windowSize={5}
        />
      )}
    </View>
  );
}

const BetCardKeyed = React.memo(({ row, idx, t, copyBetId, setConfirmCancelBetId, cancellingBetId, labelForType, getStatusColor, getStatusText, getBorderColor }) => {
  const { betId, points, session, betNumber, betType, verdict, createdAt, canCancel, marketTitle } = row;
  const isScheduled = row.bet?.scheduledDate || row.bet?.isScheduled;
  const scheduledDateStr = formatScheduledDate(row.bet?.scheduledDate);
  const statusColor = getStatusColor(verdict?.state);
  const borderColor = getBorderColor(verdict?.state);
  const isCancelling = cancellingBetId === betId;

  return (
    <View style={[styles.betCard, { borderColor }]}>
      {verdict?.state === 'cancelled' && (
        <View style={styles.cancelledOverlay}>
          <Text style={styles.cancelledX}>✕</Text>
        </View>
      )}
      <View style={styles.betCardRow}>
        <Text style={styles.betIdxText}>#{idx + 1}</Text>
        {session ? <View style={styles.sessionBadge}><Text style={styles.sessionBadgeText}>{session}</Text></View> : null}
      </View>
      <View style={styles.betCardRow}>
        <Text style={styles.betLabel}>{t('bids.betIdLabel')}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={styles.betMono} numberOfLines={1}>{String(betId || '').slice(-8)}</Text>
          <TouchableOpacity onPress={() => copyBetId(betId)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.copyIcon}>⎘</Text>
          </TouchableOpacity>
        </View>
      </View>
      {isScheduled && (
        <View style={styles.scheduledBadge}>
          <Text style={styles.scheduledText}>{t('bids.scheduledBet')}{scheduledDateStr ? ` · ${scheduledDateStr}` : ''}</Text>
        </View>
      )}
      <Text style={styles.marketName} numberOfLines={1}>{(marketTitle || 'MARKET').toUpperCase()}</Text>
      <View style={styles.betCardRow}>
        <Text style={styles.betLabel}>{t('bids.gameLabel')}</Text>
        <Text style={styles.betValue}>{labelForType(betType)}</Text>
      </View>
      <View style={styles.betCardRow}>
        <Text style={styles.betLabel}>{t('bids.betLabel')}</Text>
        <Text style={styles.betValue}>{betNumber != null ? String(betNumber) : '-'}</Text>
      </View>
      <View style={styles.betCardRow}>
        <Text style={styles.betLabel}>{t('bids.pointsLabel')}</Text>
        <Text style={styles.betValue}>{points}</Text>
      </View>
      <View style={styles.betCardRow}>
        <Text style={styles.betLabel}>{t('bids.statusLabel')}</Text>
        <Text style={[styles.betStatusValue, { color: statusColor }]}>
          {getStatusText(verdict)}{verdict?.state === 'won' && verdict?.payout > 0 ? ` ₹${Number(verdict.payout).toLocaleString('en-IN')}` : ''}
        </Text>
      </View>
      <View style={styles.betCardRow}>
        <Text style={styles.betLabel}>{t('bids.timeLabel')}</Text>
        <Text style={styles.betTimeValue}>{formatTxnTime(createdAt)}</Text>
      </View>
      {verdict?.state === 'pending' && canCancel?.canCancel && (
        <TouchableOpacity
          onPress={() => setConfirmCancelBetId(betId)}
          disabled={isCancelling}
          style={[styles.cancelBtn, isCancelling && { opacity: 0.6 }]}
          activeOpacity={0.8}
        >
          {isCancelling
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.cancelBtnText}>{t('bids.cancelAndRefund')}</Text>}
        </TouchableOpacity>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black, paddingHorizontal: spacing[3] },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingTop: spacing[3], paddingBottom: spacing[3] },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  backIcon: { color: colors.text, fontSize: 18, fontWeight: '600' },
  title: { flex: 1, color: colors.text, fontSize: fontSize.xl, fontWeight: '700' },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  filterText: { color: colors.goldText, fontSize: fontSize.sm, fontWeight: '600' },
  msgBox: { marginBottom: spacing[3], borderRadius: borderRadius.xl, paddingHorizontal: spacing[4], paddingVertical: spacing[3] },
  msgSuccess: { backgroundColor: 'rgba(34,197,94,0.1)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)' },
  msgError: { backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  msgText: { color: colors.textSecondary, fontSize: fontSize.sm },
  copyToast: { position: 'absolute', bottom: 100, alignSelf: 'center', backgroundColor: colors.goldLight, paddingHorizontal: spacing[4], paddingVertical: 10, borderRadius: borderRadius.xl, zIndex: 100 },
  copyToastText: { color: colors.black, fontWeight: '600', fontSize: fontSize.sm },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyBox: { margin: spacing[4], borderRadius: borderRadius['2xl'], borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: '#202124', padding: spacing[6], alignItems: 'center' },
  emptyText: { color: '#d1d5db', fontSize: fontSize.base },
  listColumnWrapper: { justifyContent: 'space-between', marginBottom: spacing[3] },
  columnWrapper: { justifyContent: 'space-between' },
  listGrid: { paddingBottom: spacing[6] },
  betCard: { width: '48.5%', backgroundColor: '#202124', borderRadius: borderRadius.lg, borderWidth: 2, padding: spacing[2], gap: 6 },
  betCardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  betIdxText: { color: colors.goldText, fontSize: 10, fontWeight: '600' },
  sessionBadge: { borderWidth: 1, borderColor: 'rgba(212,175,55,0.3)', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2 },
  sessionBadgeText: { color: colors.goldText, fontSize: 9, fontWeight: '700' },
  betLabel: { color: '#9ca3af', fontSize: 10, flexShrink: 0 },
  betMono: { color: '#d1d5db', fontSize: 10, fontFamily: 'monospace' },
  copyIcon: { color: '#9ca3af', fontSize: 12 },
  betValue: { color: colors.text, fontSize: fontSize.xs, fontWeight: '600' },
  betStatusValue: { fontSize: 10, fontWeight: '600' },
  betTimeValue: { color: '#d1d5db', fontSize: 10 },
  marketName: { color: '#9ca3af', fontSize: 10 },
  scheduledBadge: { backgroundColor: 'rgba(245,158,11,0.1)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start' },
  scheduledText: { color: '#fbbf24', fontSize: 9, fontWeight: '600' },
  cancelledOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', zIndex: 10, borderRadius: borderRadius.lg },
  cancelledX: { color: '#fb923c', fontSize: 40, fontWeight: '700' },
  cancelBtn: { marginTop: 4, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 6, alignItems: 'center', backgroundColor: '#1f2937', borderRadius: borderRadius.lg, paddingVertical: 8 },
  cancelBtnText: { color: colors.text, fontSize: 10, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: spacing[4] },
  modalCard: { width: '100%', maxWidth: 360, backgroundColor: '#202124', borderRadius: borderRadius['2xl'], borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: spacing[5], gap: spacing[4] },
  modalTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: '700' },
  modalBody: { color: '#d1d5db', fontSize: fontSize.sm },
  modalBtns: { flexDirection: 'row', gap: spacing[3] },
  modalBtnCancel: { flex: 1, paddingVertical: spacing[3], borderRadius: borderRadius.xl, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center' },
  modalBtnCancelText: { color: colors.text, fontWeight: '600' },
  modalBtnConfirm: { flex: 1, paddingVertical: spacing[3], borderRadius: borderRadius.xl, backgroundColor: '#f59e0b', alignItems: 'center' },
  modalBtnConfirmText: { color: colors.black, fontWeight: '700' },
  filterModal: { width: '100%', backgroundColor: '#202124', borderRadius: borderRadius['2xl'], padding: spacing[5], gap: spacing[3] },
  filterModalTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: '700' },
  filterSectionLabel: { color: '#9ca3af', fontSize: fontSize.xs, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
  filterChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  filterChip: { paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: borderRadius.full, backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  filterChipActive: { backgroundColor: colors.goldLight, borderColor: colors.goldLight },
  filterChipText: { color: '#9ca3af', fontSize: fontSize.sm, fontWeight: '600' },
  filterChipTextActive: { color: colors.black },
  filterModalBtns: { flexDirection: 'row', gap: spacing[2], marginTop: spacing[2] },
  filterResetBtn: { flex: 1, paddingVertical: spacing[3], borderRadius: borderRadius.xl, backgroundColor: '#1a1a1a', alignItems: 'center' },
  filterResetText: { color: '#9ca3af', fontWeight: '600' },
  filterApplyBtn: { flex: 2, paddingVertical: spacing[3], borderRadius: borderRadius.xl, backgroundColor: colors.goldLight, alignItems: 'center' },
  filterApplyText: { color: colors.black, fontWeight: '700' },
  filterCloseBtn: { paddingVertical: spacing[3], paddingHorizontal: spacing[4], borderRadius: borderRadius.xl, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  filterCloseText: { color: colors.text, fontWeight: '700' },
});

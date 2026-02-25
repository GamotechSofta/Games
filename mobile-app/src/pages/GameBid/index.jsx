import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Image,
  StyleSheet, Modal, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '../../hooks/useTranslation';
import { colors, spacing, borderRadius, fontSize } from '../../theme';
import { storage } from '../../utils/storage';
import { placeBet, updateUserBalance } from '../../api/bets';
import { getTomorrowIST, isPastClosingTime, formatDateDisplay } from '../../utils/marketTiming';
import {
  isValidSinglePana, isValidDoublePana, isValidTriplePana, isValidAnyPana,
  VALID_SINGLE_PANAS, SINGLE_PANA_BY_SUM, DOUBLE_PANAS, doublePanasBySumDigit,
} from './panaRules';

// ─── helpers ──────────────────────────────────────────────────────────────────
const sanitize = (v, max = 6) => (v ?? '').toString().replace(/\D/g, '').slice(0, max);

function useBal() {
  const [bal, setBal] = useState(0);
  useEffect(() => {
    storage.getItem('user').then(s => {
      try {
        const u = s ? JSON.parse(s) : null;
        const n = Number(u?.balance ?? u?.wallet ?? u?.points ?? 0);
        setBal(Number.isFinite(n) ? n : 0);
      } catch { setBal(0); }
    });
  }, []);
  return bal;
}

const WALLET_ICON = 'https://res.cloudinary.com/dnyp5jknp/image/upload/v1771394532/wallet_n1oyef.png';

// ─── Review Modal (matches frontend BidReviewModal: title bar, 3-col table, 2x2 summary, note, buttons) ───
function ReviewModal({ visible, rows, totalAmount, walletBefore, marketTitle, dateText, labelKey, onClose, onConfirm }) {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const before = Number(walletBefore) || 0;
  const amount = Number(totalAmount) || 0;
  const after = before - amount;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      await onConfirm();
    } catch (e) {
      setError(e.message || 'Failed to place bet');
    } finally {
      setSubmitting(false);
    }
  };

  const titleText = (marketTitle && dateText) ? `${marketTitle} - ${dateText}` : (marketTitle || dateText || t('gameBid.reviewBet'));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={rm.overlay}>
        <View style={rm.sheet}>
          {/* Title bar - frontend: bg-black border-b white/10 */}
          <View style={rm.titleBar}>
            <Text style={rm.title}>{titleText}</Text>
          </View>
          {/* Table header: labelKey | Points | Type - frontend order, gold #d4af37 */}
          <View style={rm.headerRow}>
            <Text style={[rm.col, rm.colLeft]}>{labelKey}</Text>
            <Text style={rm.col}>{t('gameBid.points')}</Text>
            <Text style={rm.col}>{t('gameBid.type')}</Text>
          </View>
          <ScrollView style={rm.list} showsVerticalScrollIndicator={false}>
            {rows.map((r, i) => (
              <View key={r.id ?? i} style={rm.row}>
                <Text style={[rm.cell, rm.cellLeft]} numberOfLines={1}>{r.number}</Text>
                <Text style={[rm.cell, rm.cellPoints]}>{r.points}</Text>
                <Text style={[rm.cell, rm.cellType]}>{r.type === 'OPEN' ? t('gameBid.open') : r.type === 'CLOSE' ? t('gameBid.close') : (r.type ?? '-')}</Text>
              </View>
            ))}
          </ScrollView>
          {/* Summary 2x2 - frontend: Total Bids, Total Bet Amount, Wallet Before, Wallet After */}
          <View style={rm.summaryGrid}>
            <View style={[rm.sumCell, rm.sumCellBorderR, rm.sumCellBorderB]}>
              <Text style={rm.sumLabel}>{t('gameBid.totalBids')}</Text>
              <Text style={rm.sumVal}>{rows.length}</Text>
            </View>
            <View style={[rm.sumCell, rm.sumCellBorderB]}>
              <Text style={rm.sumLabel}>{t('gameBid.totalBetAmount')}</Text>
              <Text style={[rm.sumVal, rm.sumValGold]}>{amount}</Text>
            </View>
            <View style={[rm.sumCell, rm.sumCellBorderR]}>
              <Text style={rm.sumLabel}>{t('gameBid.walletBalanceBeforeDeduction')}</Text>
              <Text style={rm.sumVal}>{before.toFixed(1)}</Text>
            </View>
            <View style={rm.sumCell}>
              <Text style={rm.sumLabel}>{t('gameBid.walletBalanceAfterDeduction')}</Text>
              <Text style={[rm.sumVal, after < 0 && rm.sumValDanger]}>{after.toFixed(1)}</Text>
            </View>
          </View>
          {!!error && <Text style={rm.error}>{error}</Text>}
          <Text style={rm.note}>{t('gameBid.betNoteCannotCancel')}</Text>
          <View style={rm.btns}>
            <TouchableOpacity style={rm.cancelBtn} onPress={onClose} disabled={submitting}>
              <Text style={rm.cancelText}>{t('gameBid.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[rm.confirmBtn, (submitting || (after < 0)) && rm.confirmBtnDisabled]} onPress={handleSubmit} disabled={submitting || after < 0}>
              {submitting ? (
                <>
                  <ActivityIndicator size="small" color="#4b3608" style={{ marginRight: 6 }} />
                  <Text style={rm.confirmText}>{t('gameBid.placing')}</Text>
                </>
              ) : (
                <Text style={rm.confirmText}>{t('gameBid.submitBet')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const rm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: spacing[4] },
  sheet: { backgroundColor: '#202124', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', width: '100%', maxWidth: 400, maxHeight: '90%' },
  titleBar: { backgroundColor: '#000', paddingVertical: 10, paddingHorizontal: spacing[3], borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  title: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600', textAlign: 'center' },
  headerRow: { flexDirection: 'row', paddingHorizontal: spacing[3], paddingTop: spacing[3], paddingBottom: spacing[2] },
  col: { flex: 1, color: '#d4af37', fontSize: 11, fontWeight: '700', textAlign: 'center' },
  colLeft: { textAlign: 'left' },
  list: { maxHeight: 220, paddingHorizontal: spacing[3], paddingTop: spacing[2] },
  row: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 12, paddingVertical: 10, paddingHorizontal: spacing[3], marginBottom: spacing[2], borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  cell: { flex: 1, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  cellLeft: { textAlign: 'left', color: colors.text },
  cellPoints: { color: '#f2c14e' },
  cellType: { color: colors.textMuted, textTransform: 'uppercase' },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing[3], paddingHorizontal: spacing[3], borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 16, overflow: 'hidden' },
  sumCell: { width: '50%', padding: spacing[3], alignItems: 'center' },
  sumCellBorderR: { borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.1)' },
  sumCellBorderB: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  sumLabel: { color: colors.textMuted, fontSize: 11, marginBottom: 2 },
  sumVal: { color: colors.text, fontSize: fontSize.base, fontWeight: '700' },
  sumValGold: { color: '#f2c14e' },
  sumValDanger: { color: '#f87171' },
  note: { color: '#f87171', fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: spacing[3], paddingHorizontal: spacing[3] },
  error: { color: colors.red, fontSize: fontSize.xs, textAlign: 'center', marginTop: spacing[2], paddingHorizontal: spacing[3] },
  btns: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[4], paddingHorizontal: spacing[3], paddingBottom: spacing[4] },
  cancelBtn: { flex: 1, padding: spacing[3], borderRadius: 16, backgroundColor: '#000', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  cancelText: { color: colors.text, fontWeight: '700' },
  confirmBtn: { flex: 1, padding: spacing[3], borderRadius: 16, backgroundColor: colors.gold, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmText: { color: '#4b3608', fontWeight: '700' },
});

// ─── Session/Date Header (matches frontend BidLayout: #202124, wallet icon, date/session) ───
function BidHeader({ market, title, onBack, session, setSession, walletBal, scheduleForTomorrow, sessionOptions = ['OPEN', 'CLOSE'], lockSession = false }) {
  const { t } = useTranslation();
  const isRunning = market?.status === 'running';
  const displayDate = scheduleForTomorrow ? formatDateDisplay(getTomorrowIST()) : formatDateDisplay(new Date().toISOString().slice(0, 10));
  const effectiveSession = isRunning ? 'CLOSE' : session;
  const headerTitle = market?.gameName ? `${market.gameName} - ${title}` : (title || '');
  const walletStr = Number(walletBal).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 0 });

  return (
    <View style={hdr.wrapper}>
      <View style={hdr.top}>
        <TouchableOpacity onPress={onBack} style={hdr.back} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={hdr.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={hdr.title} numberOfLines={1}>{headerTitle}</Text>
        <View style={hdr.walletPill}>
          <Image source={{ uri: WALLET_ICON }} style={hdr.walletIcon} resizeMode="contain" />
          <Text style={hdr.walletText}>{walletStr}</Text>
        </View>
      </View>
      <View style={hdr.row}>
        <View style={hdr.pill}>
          <Text style={hdr.pillText}>{displayDate}</Text>
        </View>
        <View style={hdr.sessionWrap}>
          {sessionOptions.map(opt => (
            <TouchableOpacity
              key={opt}
              style={[hdr.sessionBtn, effectiveSession === opt && hdr.sessionBtnActive]}
              onPress={() => !isRunning && !lockSession && setSession(opt)}
              disabled={isRunning || lockSession}
            >
              <Text style={[hdr.sessionText, effectiveSession === opt && hdr.sessionTextActive]}>
                {opt === 'OPEN' ? t('gameBid.open') : opt === 'CLOSE' ? t('gameBid.close') : opt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

// Frontend BidLayout: header bg-[#202124] border-b white/10 py-2; back 44px rounded-full bg-white/10; date/session pb-4 pt-2, min-h-[44px] rounded-full
const hdr = StyleSheet.create({
  wrapper: { backgroundColor: '#202124', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', paddingBottom: spacing[2] },
  top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[3], paddingTop: spacing[2], paddingBottom: spacing[2], gap: spacing[2] },
  back: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: borderRadius.full },
  backIcon: { color: colors.text, fontSize: 20 },
  title: { flex: 1, color: colors.text, fontSize: 12, fontWeight: '700', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.5 },
  walletPill: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingHorizontal: spacing[2], paddingVertical: 6 },
  walletIcon: { width: 20, height: 20 },
  walletText: { color: colors.text, fontSize: 12, fontWeight: '700' },
  row: { flexDirection: 'row', paddingHorizontal: spacing[3], paddingTop: spacing[2], paddingBottom: spacing[4], gap: spacing[2], alignItems: 'center' },
  pill: { flex: 1, backgroundColor: '#202124', borderRadius: borderRadius.full, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', minHeight: 44 },
  pillText: { color: colors.text, fontSize: fontSize.xs, fontWeight: '600' },
  sessionWrap: { flexDirection: 'row', gap: spacing[1] },
  sessionBtn: { paddingHorizontal: spacing[3], paddingVertical: 10, borderRadius: borderRadius.full, backgroundColor: '#202124', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', minHeight: 44 },
  sessionBtnActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  sessionText: { color: colors.textMuted, fontSize: fontSize.xs, fontWeight: '700' },
  sessionTextActive: { color: '#4b3608' },
});

// ─── Sticky Footer (matches frontend: card style, stats, submit) ─────────────────
function BidFooter({ bidsCount, totalPoints, onSubmit, disabled }) {
  const { t } = useTranslation();
  return (
    <View style={ft.footer}>
      <View style={ft.card}>
        <View style={ft.stats}>
          <View style={ft.statBlock}>
            <Text style={ft.statLabel}>{t('gameBid.bets')}</Text>
            <Text style={ft.statVal}>{bidsCount}</Text>
          </View>
          <View style={ft.statBlock}>
            <Text style={ft.statLabel}>{t('gameBid.points')}</Text>
            <Text style={ft.statVal}>{totalPoints}</Text>
          </View>
        </View>
        <TouchableOpacity style={[ft.btn, disabled && ft.btnDisabled]} onPress={onSubmit} disabled={disabled}>
          <Text style={ft.btnText}>{t('gameBid.submitBet')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const ft = StyleSheet.create({
  footer: { paddingHorizontal: spacing[3], paddingVertical: spacing[3], paddingBottom: spacing[4], alignItems: 'center' },
  card: { width: '100%', maxWidth: 400, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(32,33,36,0.95)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: spacing[4], gap: spacing[4] },
  stats: { flexDirection: 'row', gap: spacing[6] },
  statBlock: { alignItems: 'center' },
  statLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  statVal: { color: colors.goldText, fontSize: fontSize.base, fontWeight: '700' },
  btn: { flex: 1, backgroundColor: colors.gold, borderRadius: borderRadius.xl, paddingHorizontal: spacing[5], paddingVertical: spacing[3], alignItems: 'center', justifyContent: 'center' },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#4b3608', fontWeight: '800', fontSize: fontSize.sm },
});

// ─── Single Digit Bid ───────────────────────────────────────────────────────────
function SingleDigitBid({ market, session, walletBal, scheduleForTomorrow, onBack }) {
  const { t } = useTranslation();
  const [points, setPoints] = useState('');
  const [bids, setBids] = useState([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [warning, setWarning] = useState('');

  const warn = (msg) => { setWarning(msg); setTimeout(() => setWarning(''), 2500); };
  const totalPoints = bids.reduce((s, b) => s + Number(b.points), 0);

  const pointsByDigit = useMemo(() => bids.reduce((acc, b) => {
    acc[b.number] = (acc[b.number] || 0) + Number(b.points);
    return acc;
  }, {}), [bids]);

  const rows = useMemo(() => {
    const map = new Map();
    for (const b of bids) {
      const key = `${b.number}__${b.type}`;
      const prev = map.get(key);
      if (prev) prev.points = String(Number(prev.points) + Number(b.points));
      else map.set(key, { id: key, number: b.number, points: String(Number(b.points)), type: b.type });
    }
    return Array.from(map.values()).sort((a, c) => a.number.localeCompare(c.number));
  }, [bids]);

  const handleDigit = (num) => {
    const pts = Number(points);
    if (!pts || pts <= 0) { warn(t('gameBid.pleaseEnterPoints')); return; }
    setBids(prev => [...prev, { id: Date.now() + Math.random(), number: String(num), points: String(pts), type: session }]);
  };

  const handleSubmit = async () => {
    const mId = market?._id || market?.id;
    if (!mId) throw new Error('Market not found');
    const payload = rows.map(r => ({ betType: 'single', betNumber: String(r.number), amount: Number(r.points), betOn: r.type === 'CLOSE' ? 'close' : 'open' }));
    let sd = scheduleForTomorrow ? getTomorrowIST() : undefined;
    if (!sd && market && isPastClosingTime(market)) sd = getTomorrowIST();
    const res = await placeBet(mId, payload, sd);
    if (!res.success) throw new Error(res.message);
    if (res.data?.newBalance != null) await updateUserBalance(res.data.newBalance);
    setBids([]); setPoints(''); setReviewOpen(false);
  };

  const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, null];
  return (
    <>
      {!!warning && <View style={s.warnBox}><Text style={s.warnText}>{warning}</Text></View>}
      <View style={s.inputRow}>
        <Text style={s.label}>{t('gameBid.enterPoints')}:</Text>
        <TextInput style={s.input} value={points} onChangeText={v => setPoints(sanitize(v))} keyboardType="numeric" placeholder={t('gameBid.point')} placeholderTextColor={colors.placeholder} />
      </View>
      <Text style={s.sectionTitle}>{t('gameBid.selectDigit')}</Text>
      <View style={s.digitGrid}>
        {DIGITS.map((d, i) => d === null ? <View key={`spacer-${i}`} style={s.digitSpacer} /> : (
          <TouchableOpacity key={`digit-${d}`} style={s.digitBtn} onPress={() => handleDigit(d)} activeOpacity={0.8}>
            <Text style={s.digitNum}>{d}</Text>
            {pointsByDigit[String(d)] > 0 && <Text style={s.digitPts}>{pointsByDigit[String(d)]}</Text>}
          </TouchableOpacity>
        ))}
      </View>
      <BidFooter bidsCount={rows.length} totalPoints={totalPoints} onSubmit={() => rows.length && setReviewOpen(true)} disabled={!rows.length} />
      <ReviewModal visible={reviewOpen} rows={rows} totalAmount={totalPoints} walletBefore={walletBal} marketTitle={market?.gameName} dateText={formatDateDisplay(new Date().toISOString().slice(0, 10))} labelKey={t('gameBid.digit')} onClose={() => { setReviewOpen(false); setBids([]); setPoints(''); }} onConfirm={handleSubmit} />
    </>
  );
}

// ─── Easy Mode (Jodi / Single Pana / Double Pana) – list-based ─────────────────
function EasyModeBid({ market, session, walletBal, scheduleForTomorrow, betType }) {
  const { t } = useTranslation();
  const isJodi = betType === 'Jodi';
  const isSP = betType === 'Single Pana';
  const isDP = betType === 'Double Pana';
  const maxLen = isJodi ? 2 : 3;

  const validate = isJodi ? (n => n && /^[0-9]{2}$/.test(n))
    : isSP ? isValidSinglePana
      : isDP ? isValidDoublePana
        : () => true;

  const [number, setNumber] = useState('');
  const [points, setPoints] = useState('');
  const [bids, setBids] = useState([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [warning, setWarning] = useState('');

  const warn = (msg) => { setWarning(msg); setTimeout(() => setWarning(''), 2500); };
  const totalPoints = useMemo(() => bids.reduce((s, b) => s + Number(b.points), 0), [bids]);

  const handleAdd = () => {
    const pts = Number(points);
    if (!pts || pts <= 0) { warn(t('gameBid.pleaseEnterPoints')); return; }
    if (!validate(number)) { warn(t('gameBid.invalidDigit')); return; }
    setBids(prev => {
      const idx = prev.findIndex(b => b.number === number && b.type === session);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], points: String(Number(next[idx].points) + pts) };
        return next;
      }
      return [...prev, { id: Date.now(), number, points: String(pts), type: session }];
    });
    setNumber(''); setPoints('');
  };

  const handleDelete = (id) => setBids(prev => prev.filter(b => b.id !== id));

  const handleSubmit = async () => {
    const mId = market?._id || market?.id;
    if (!mId) throw new Error('Market not found');
    const betTypeMap = { 'Jodi': 'jodi', 'Single Pana': 'panna', 'Double Pana': 'panna' };
    const payload = bids.map(r => ({ betType: betTypeMap[betType] || 'single', betNumber: r.number, amount: Number(r.points), betOn: r.type === 'CLOSE' ? 'close' : 'open' }));
    let sd = scheduleForTomorrow ? getTomorrowIST() : undefined;
    if (!sd && market && isPastClosingTime(market)) sd = getTomorrowIST();
    const res = await placeBet(mId, payload, sd);
    if (!res.success) throw new Error(res.message);
    if (res.data?.newBalance != null) await updateUserBalance(res.data.newBalance);
    setBids([]); setReviewOpen(false);
  };

  return (
    <>
      {!!warning && <View style={s.warnBox}><Text style={s.warnText}>{warning}</Text></View>}
      <View style={s.inputRow}>
        <Text style={s.label}>{isJodi ? t('gameBid.jodi') : t('gameBid.pana')}:</Text>
        <TextInput style={s.input} value={number} onChangeText={v => setNumber(sanitize(v, maxLen))} keyboardType="numeric" placeholder={isJodi ? '00–99' : '000–999'} placeholderTextColor={colors.placeholder} maxLength={maxLen} />
      </View>
      <View style={s.inputRow}>
        <Text style={s.label}>{t('gameBid.enterPoints')}:</Text>
        <TextInput style={s.input} value={points} onChangeText={v => setPoints(sanitize(v))} keyboardType="numeric" placeholder={t('gameBid.point')} placeholderTextColor={colors.placeholder} />
      </View>
      <TouchableOpacity style={s.addBtn} onPress={handleAdd}>
        <Text style={s.addBtnText}>{t('gameBid.addToList')}</Text>
      </TouchableOpacity>
      {bids.length > 0 && (
        <View style={s.listWrap}>
          <View style={s.listHeader}>
            <Text style={[s.listCol, { flex: 2 }]}>{isJodi ? t('gameBid.jodi') : t('gameBid.pana')}</Text>
            <Text style={s.listCol}>{t('gameBid.type')}</Text>
            <Text style={s.listCol}>{t('gameBid.pts')}</Text>
            <Text style={s.listCol}>Del</Text>
          </View>
          {bids.map(b => (
            <View key={b.id} style={s.listRow}>
              <Text style={[s.listCell, { flex: 2, color: colors.text }]}>{b.number}</Text>
              <Text style={[s.listCell, { color: colors.textMuted, textTransform: 'uppercase' }]}>{b.type}</Text>
              <Text style={[s.listCell, { color: colors.goldText }]}>{b.points}</Text>
              <TouchableOpacity onPress={() => handleDelete(b.id)}>
                <Text style={[s.listCell, { color: colors.red }]}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
      <BidFooter bidsCount={bids.length} totalPoints={totalPoints} onSubmit={() => bids.length && setReviewOpen(true)} disabled={!bids.length} />
      <ReviewModal visible={reviewOpen} rows={bids} totalAmount={totalPoints} walletBefore={walletBal} marketTitle={market?.gameName} dateText={formatDateDisplay(new Date().toISOString().slice(0, 10))} labelKey={betType === 'Jodi' ? t('gameBid.jodi') : t('gameBid.pana')} onClose={() => { setReviewOpen(false); setBids([]); }} onConfirm={handleSubmit} />
    </>
  );
}

// ─── Triple Pana Bid ────────────────────────────────────────────────────────────
function TriplePanaBid({ market, session, walletBal, scheduleForTomorrow }) {
  const { t } = useTranslation();
  const TRIPLES = useMemo(() => Array.from({ length: 10 }, (_, i) => `${i}${i}${i}`), []);
  const [inputs, setInputs] = useState(() => Object.fromEntries(TRIPLES.map(n => [n, ''])));
  const [bids, setBids] = useState([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [warning, setWarning] = useState('');

  const warn = (msg) => { setWarning(msg); setTimeout(() => setWarning(''), 2500); };
  const totalPoints = useMemo(() => bids.reduce((s, b) => s + Number(b.points), 0), [bids]);

  const handleAdd = () => {
    const toAdd = Object.entries(inputs).filter(([, p]) => Number(p) > 0).map(([num, pts]) => ({ id: Date.now() + Number(num[0]), number: num, points: String(pts), type: session }));
    if (!toAdd.length) { warn(t('gameBid.pleaseEnterPointsForTriplePana')); return; }
    setBids(prev => [...prev, ...toAdd]);
    setInputs(Object.fromEntries(TRIPLES.map(n => [n, ''])));
    setReviewOpen(true);
  };

  const handleSubmit = async () => {
    const mId = market?._id || market?.id;
    if (!mId) throw new Error('Market not found');
    const payload = bids.map(r => ({ betType: 'panna', betNumber: r.number, amount: Number(r.points), betOn: r.type === 'CLOSE' ? 'close' : 'open' }));
    let sd = scheduleForTomorrow ? getTomorrowIST() : undefined;
    if (!sd && market && isPastClosingTime(market)) sd = getTomorrowIST();
    const res = await placeBet(mId, payload, sd);
    if (!res.success) throw new Error(res.message);
    if (res.data?.newBalance != null) await updateUserBalance(res.data.newBalance);
    setBids([]); setReviewOpen(false);
  };

  return (
    <>
      {!!warning && <View style={s.warnBox}><Text style={s.warnText}>{warning}</Text></View>}
      <Text style={s.sectionTitle}>Enter Points per Triple Pana</Text>
      <View style={s.tripleGrid}>
        {TRIPLES.map(num => (
          <View key={num} style={s.tripleRow}>
            <View style={s.tripleLabel}><Text style={s.tripleLabelText}>{num}</Text></View>
            <TextInput style={s.tripleInput} value={inputs[num]} onChangeText={t => setInputs(p => ({ ...p, [num]: sanitize(t) }))} keyboardType="numeric" placeholder="Pts" placeholderTextColor={colors.placeholder} />
          </View>
        ))}
      </View>
      <TouchableOpacity style={[s.addBtn, { marginTop: spacing[3] }]} onPress={handleAdd}>
        <Text style={s.addBtnText}>Add to List & Review</Text>
      </TouchableOpacity>
      <ReviewModal visible={reviewOpen} rows={bids} totalAmount={totalPoints} walletBefore={walletBal} marketTitle={market?.gameName} dateText={formatDateDisplay(new Date().toISOString().slice(0, 10))} labelKey={t('gameBid.pana')} onClose={() => { setReviewOpen(false); setBids([]); }} onConfirm={handleSubmit} />
    </>
  );
}

// ─── Bulk Bid (Single Digit / Jodi / Single Pana / Double Pana) ────────────────
function BulkBid({ market, session, walletBal, scheduleForTomorrow, betType }) {
  const { t } = useTranslation();
  const isSDB = betType === 'Single Digit Bulk';
  const isJB = betType === 'Jodi Bulk';
  const isSPB = betType === 'Single Pana Bulk';
  const isDPB = betType === 'Double Pana Bulk';

  const groups = useMemo(() => {
    if (isSDB) return { digits: Array.from({ length: 10 }, (_, i) => String(i)) };
    if (isJB) return Object.fromEntries(Array.from({ length: 10 }, (_, d) => [String(d), Array.from({ length: 10 }, (_, i) => String(d * 10 + i).padStart(2, '0'))]));
    if (isSPB) return SINGLE_PANA_BY_SUM;
    if (isDPB) return doublePanasBySumDigit;
    return {};
  }, [betType]);

  const allItems = useMemo(() => {
    if (isSDB) return Array.from({ length: 10 }, (_, i) => String(i));
    if (isJB) return Array.from({ length: 100 }, (_, i) => String(i).padStart(2, '0'));
    if (isSPB) return Object.values(SINGLE_PANA_BY_SUM).flat();
    if (isDPB) return Array.from(DOUBLE_PANAS);
    return [];
  }, [betType]);

  const [inputs, setInputs] = useState(() => Object.fromEntries(allItems.map(n => [n, ''])));
  const [groupBulk, setGroupBulk] = useState(() => Object.fromEntries(Object.keys(groups).map(k => [k, ''])));
  const [reviewRows, setReviewRows] = useState([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [warning, setWarning] = useState('');

  const warn = (msg) => { setWarning(msg); setTimeout(() => setWarning(''), 2500); };

  const applyGroup = (groupKey) => {
    const pts = Number(groupBulk[groupKey]);
    if (!pts || pts <= 0) { warn(t('gameBid.pleaseEnterPoints')); return; }
    const list = isSDB ? groups.digits : groups[groupKey] ?? [];
    setInputs(prev => {
      const next = { ...prev };
      for (const num of list) {
        next[num] = String((Number(next[num] || 0) || 0) + pts);
      }
      return next;
    });
    setGroupBulk(p => ({ ...p, [groupKey]: '' }));
  };

  const selectedTotal = useMemo(() => Object.values(inputs).reduce((s, v) => s + Number(v || 0), 0), [inputs]);

  const openReview = () => {
    const rows = Object.entries(inputs).filter(([, p]) => Number(p) > 0).map(([num, pts]) => ({ id: `${num}-${pts}`, number: num, points: String(pts), type: session }));
    if (!rows.length) { warn(t('gameBid.pleaseEnterPoints')); return; }
    setReviewRows(rows);
    setReviewOpen(true);
  };

  const handleSubmit = async () => {
    const mId = market?._id || market?.id;
    if (!mId) throw new Error('Market not found');
    const bTypeMap = { 'Single Digit Bulk': 'single', 'Jodi Bulk': 'jodi', 'Single Pana Bulk': 'panna', 'Double Pana Bulk': 'panna' };
    const payload = reviewRows.map(r => ({ betType: bTypeMap[betType] || 'single', betNumber: r.number, amount: Number(r.points), betOn: r.type === 'CLOSE' ? 'close' : 'open' }));
    let sd = scheduleForTomorrow ? getTomorrowIST() : undefined;
    if (!sd && market && isPastClosingTime(market)) sd = getTomorrowIST();
    const res = await placeBet(mId, payload, sd);
    if (!res.success) throw new Error(res.message);
    if (res.data?.newBalance != null) await updateUserBalance(res.data.newBalance);
    setInputs(Object.fromEntries(allItems.map(n => [n, ''])));
    setReviewRows([]); setReviewOpen(false);
  };

  const groupKeys = isSDB ? ['all'] : Object.keys(groups).sort();

  const renderGroup = (groupKey) => {
    const list = isSDB ? groups.digits : (groups[groupKey] ?? []);
    return (
      <View key={groupKey} style={s.bulkGroup}>
        <View style={s.bulkGroupHeader}>
          <View style={s.bulkGroupLabel}><Text style={s.bulkGroupLabelText}>{isSDB ? 'All Digits' : groupKey}</Text></View>
          <TextInput
            style={s.bulkGroupInput}
            value={groupBulk[groupKey] ?? ''}
            onChangeText={t => setGroupBulk(p => ({ ...p, [groupKey]: sanitize(t) }))}
            keyboardType="numeric" placeholder="All pts" placeholderTextColor={colors.placeholder}
          />
          <TouchableOpacity style={s.bulkApplyBtn} onPress={() => applyGroup(groupKey)}>
            <Text style={s.bulkApplyText}>Apply</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.bulkClearBtn} onPress={() => {
            setInputs(p => { const n = { ...p }; for (const x of list) n[x] = ''; return n; });
            setGroupBulk(p => ({ ...p, [groupKey]: '' }));
          }}>
            <Text style={s.bulkClearText}>Clear</Text>
          </TouchableOpacity>
        </View>
        <View style={s.bulkItemsGrid}>
          {list.map(num => (
            <View key={num} style={s.bulkItem}>
              <View style={s.bulkItemLabel}><Text style={s.bulkItemLabelText}>{num}</Text></View>
              <TextInput
                style={s.bulkItemInput}
                value={inputs[num] ?? ''}
                onChangeText={t => setInputs(p => ({ ...p, [num]: sanitize(t) }))}
                keyboardType="numeric" placeholder="Pts" placeholderTextColor={colors.placeholder}
              />
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <>
      {!!warning && <View style={s.warnBox}><Text style={s.warnText}>{warning}</Text></View>}
      {groupKeys.map(renderGroup)}
      <BidFooter bidsCount={Object.values(inputs).filter(v => Number(v) > 0).length} totalPoints={selectedTotal} onSubmit={openReview} disabled={selectedTotal <= 0} />
      <ReviewModal visible={reviewOpen} rows={reviewRows} totalAmount={reviewRows.reduce((s, r) => s + Number(r.points), 0)} walletBefore={walletBal} marketTitle={market?.gameName} dateText={formatDateDisplay(new Date().toISOString().slice(0, 10))} labelKey={t('gameBid.digit')} onClose={() => { setReviewOpen(false); setReviewRows([]); }} onConfirm={handleSubmit} />
    </>
  );
}

// ─── Half Sangam Bid ────────────────────────────────────────────────────────────
function HalfSangamBid({ market, session, walletBal, scheduleForTomorrow }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState('open'); // open=Pana+CloseAnk | close=OpenAnk+Pana
  const [field1, setField1] = useState(''); // open pana or open ank
  const [field2, setField2] = useState(''); // close ank or close pana
  const [points, setPoints] = useState('');
  const [bids, setBids] = useState([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [warning, setWarning] = useState('');

  const warn = (msg) => { setWarning(msg); setTimeout(() => setWarning(''), 2500); };
  const totalPoints = useMemo(() => bids.reduce((s, b) => s + Number(b.points), 0), [bids]);
  const sessionOverride = mode === 'open' ? 'OPEN' : 'CLOSE';

  const handleAdd = () => {
    const pts = Number(points);
    if (!pts || pts <= 0) { warn(t('gameBid.pleaseEnterPoints')); return; }
    if (mode === 'open') {
      if (!isValidAnyPana(field1)) { warn(t('gameBid.pleaseEnterSinglePana')); return; }
      if (!/^[0-9]$/.test(field2)) { warn(t('gameBid.invalidDigit')); return; }
    } else {
      if (!/^[0-9]$/.test(field1)) { warn(t('gameBid.invalidDigit')); return; }
      if (!isValidAnyPana(field2)) { warn(t('gameBid.pleaseEnterSinglePana')); return; }
    }
    const key = `${field1}-${field2}`;
    setBids(prev => {
      const idx = prev.findIndex(b => b.number === key && b.type === sessionOverride);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], points: String(Number(next[idx].points) + pts) };
        return next;
      }
      return [...prev, { id: Date.now() + Math.random(), number: key, points: String(pts), type: sessionOverride }];
    });
    setField1(''); setField2(''); setPoints('');
  };

  const handleDelete = (id) => setBids(prev => prev.filter(b => b.id !== id));

  const handleSubmit = async () => {
    const mId = market?._id || market?.id;
    if (!mId) throw new Error('Market not found');
    const payload = bids.map(r => ({ betType: 'half-sangam', betNumber: r.number, amount: Number(r.points), betOn: r.type === 'CLOSE' ? 'close' : 'open' }));
    let sd = scheduleForTomorrow ? getTomorrowIST() : undefined;
    if (!sd && market && isPastClosingTime(market)) sd = getTomorrowIST();
    const res = await placeBet(mId, payload, sd);
    if (!res.success) throw new Error(res.message);
    if (res.data?.newBalance != null) await updateUserBalance(res.data.newBalance);
    setBids([]); setReviewOpen(false);
  };

  return (
    <>
      <View style={s.modeRow}>
        {['open', 'close'].map(m => (
          <TouchableOpacity key={m} style={[s.modeBtn, mode === m && s.modeBtnActive]} onPress={() => setMode(m)}>
            <Text style={[s.modeBtnText, mode === m && s.modeBtnTextActive]}>{m === 'open' ? 'Half Sangam (O)' : 'Half Sangam (C)'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {!!warning && <View style={s.warnBox}><Text style={s.warnText}>{warning}</Text></View>}
      <View style={s.inputRow}>
        <Text style={s.label}>{mode === 'open' ? 'Open Pana:' : 'Open Ank:'}</Text>
        <TextInput style={s.input} value={field1} onChangeText={t => setField1(sanitize(t, mode === 'open' ? 3 : 1))} keyboardType="numeric" placeholder={mode === 'open' ? '3 digits' : '0–9'} placeholderTextColor={colors.placeholder} maxLength={mode === 'open' ? 3 : 1} />
      </View>
      <View style={s.inputRow}>
        <Text style={s.label}>{mode === 'open' ? 'Close Ank:' : 'Close Pana:'}</Text>
        <TextInput style={s.input} value={field2} onChangeText={t => setField2(sanitize(t, mode === 'close' ? 3 : 1))} keyboardType="numeric" placeholder={mode === 'close' ? '3 digits' : '0–9'} placeholderTextColor={colors.placeholder} maxLength={mode === 'close' ? 3 : 1} />
      </View>
      <View style={s.inputRow}>
        <Text style={s.label}>Points:</Text>
        <TextInput style={s.input} value={points} onChangeText={t => setPoints(sanitize(t))} keyboardType="numeric" placeholder="Points" placeholderTextColor={colors.placeholder} />
      </View>
      <View style={s.actionRow}>
        <TouchableOpacity style={s.addBtn} onPress={handleAdd}><Text style={s.addBtnText}>Add to List</Text></TouchableOpacity>
        <TouchableOpacity style={[s.addBtn, !bids.length && { opacity: 0.5 }]} onPress={() => bids.length && setReviewOpen(true)} disabled={!bids.length}><Text style={s.addBtnText}>Submit Bet</Text></TouchableOpacity>
      </View>
      {bids.length > 0 && (
        <View style={s.listWrap}>
          {bids.map(b => (
            <View key={b.id} style={s.listRow}>
              <Text style={[s.listCell, { flex: 2, color: colors.text }]}>{b.number}</Text>
              <Text style={[s.listCell, { color: colors.textMuted }]}>{b.type}</Text>
              <Text style={[s.listCell, { color: colors.goldText }]}>{b.points}</Text>
              <TouchableOpacity onPress={() => handleDelete(b.id)}><Text style={[s.listCell, { color: colors.red }]}>✕</Text></TouchableOpacity>
            </View>
          ))}
        </View>
      )}
      <ReviewModal visible={reviewOpen} rows={bids} totalAmount={totalPoints} walletBefore={walletBal} marketTitle={market?.gameName} dateText={formatDateDisplay(new Date().toISOString().slice(0, 10))} labelKey={t('gameBid.sangam')} onClose={() => { setReviewOpen(false); setBids([]); }} onConfirm={handleSubmit} />
    </>
  );
}

// ─── Full Sangam Bid ────────────────────────────────────────────────────────────
function FullSangamBid({ market, walletBal, scheduleForTomorrow }) {
  const { t } = useTranslation();
  const [openPana, setOpenPana] = useState('');
  const [closePana, setClosePana] = useState('');
  const [points, setPoints] = useState('');
  const [bids, setBids] = useState([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [warning, setWarning] = useState('');

  const warn = (msg) => { setWarning(msg); setTimeout(() => setWarning(''), 2500); };
  const totalPoints = useMemo(() => bids.reduce((s, b) => s + Number(b.points), 0), [bids]);

  const handleAdd = () => {
    const pts = Number(points);
    if (!pts || pts <= 0) { warn(t('gameBid.pleaseEnterPoints')); return; }
    if (!isValidAnyPana(openPana)) { warn(t('gameBid.pleaseEnterSinglePana')); return; }
    if (!isValidAnyPana(closePana)) { warn(t('gameBid.pleaseEnterSinglePana')); return; }
    const key = `${openPana}-${closePana}`;
    setBids(prev => {
      const idx = prev.findIndex(b => b.number === key);
      if (idx >= 0) { const next = [...prev]; next[idx] = { ...next[idx], points: String(Number(next[idx].points) + pts) }; return next; }
      return [...prev, { id: Date.now() + Math.random(), number: key, points: String(pts), type: 'OPEN' }];
    });
    setOpenPana(''); setClosePana(''); setPoints('');
  };

  const handleSubmit = async () => {
    const mId = market?._id || market?.id;
    if (!mId) throw new Error('Market not found');
    const payload = bids.map(r => ({ betType: 'full-sangam', betNumber: r.number, amount: Number(r.points), betOn: 'open' }));
    let sd = scheduleForTomorrow ? getTomorrowIST() : undefined;
    if (!sd && market && isPastClosingTime(market)) sd = getTomorrowIST();
    const res = await placeBet(mId, payload, sd);
    if (!res.success) throw new Error(res.message);
    if (res.data?.newBalance != null) await updateUserBalance(res.data.newBalance);
    setBids([]); setReviewOpen(false);
  };

  return (
    <>
      {!!warning && <View style={s.warnBox}><Text style={s.warnText}>{warning}</Text></View>}
      <View style={s.inputRow}><Text style={s.label}>Open Pana:</Text><TextInput style={s.input} value={openPana} onChangeText={t => setOpenPana(sanitize(t, 3))} keyboardType="numeric" placeholder="3 digits" placeholderTextColor={colors.placeholder} maxLength={3} /></View>
      <View style={s.inputRow}><Text style={s.label}>Close Pana:</Text><TextInput style={s.input} value={closePana} onChangeText={t => setClosePana(sanitize(t, 3))} keyboardType="numeric" placeholder="3 digits" placeholderTextColor={colors.placeholder} maxLength={3} /></View>
      <View style={s.inputRow}><Text style={s.label}>Points:</Text><TextInput style={s.input} value={points} onChangeText={t => setPoints(sanitize(t))} keyboardType="numeric" placeholder="Points" placeholderTextColor={colors.placeholder} /></View>
      <View style={s.actionRow}>
        <TouchableOpacity style={s.addBtn} onPress={handleAdd}><Text style={s.addBtnText}>Add to List</Text></TouchableOpacity>
        <TouchableOpacity style={[s.addBtn, !bids.length && { opacity: 0.5 }]} onPress={() => bids.length && setReviewOpen(true)} disabled={!bids.length}><Text style={s.addBtnText}>Submit Bet</Text></TouchableOpacity>
      </View>
      {bids.length > 0 && (
        <View style={s.listWrap}>
          {bids.map(b => (
            <View key={b.id} style={s.listRow}>
              <Text style={[s.listCell, { flex: 2, color: colors.text }]}>{b.number}</Text>
              <Text style={[s.listCell, { color: colors.goldText }]}>{b.points}</Text>
              <TouchableOpacity onPress={() => setBids(p => p.filter(x => x.id !== b.id))}><Text style={[s.listCell, { color: colors.red }]}>✕</Text></TouchableOpacity>
            </View>
          ))}
        </View>
      )}
      <ReviewModal visible={reviewOpen} rows={bids} totalAmount={totalPoints} walletBefore={walletBal} marketTitle={market?.gameName} dateText={formatDateDisplay(new Date().toISOString().slice(0, 10))} labelKey={t('gameBid.sangam')} onClose={() => { setReviewOpen(false); setBids([]); }} onConfirm={handleSubmit} />
    </>
  );
}

// ─── Root GameBid Screen ────────────────────────────────────────────────────────
export default function GameBid() {
  const navigation = useNavigation();
  const route = useRoute();
  const walletBal = useBal();

  const { market, betType = 'Single Digit', sessionPreset, scheduleForTomorrow } = route.params ?? {};
  const isRunning = market?.status === 'running';
  const [session, setSession] = useState(isRunning ? 'CLOSE' : (sessionPreset || 'OPEN'));

  useEffect(() => { if (isRunning) setSession('CLOSE'); }, [isRunning]);

  const handleBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Home');
  };

  const isBulk = ['Single Digit Bulk', 'Jodi Bulk', 'Single Pana Bulk', 'Double Pana Bulk'].includes(betType);
  const isJodiOrPana = ['Jodi', 'Single Pana', 'Double Pana'].includes(betType);

  const renderBidContent = () => {
    if (betType === 'Single Digit') return <SingleDigitBid market={market} session={session} walletBal={walletBal} scheduleForTomorrow={scheduleForTomorrow} onBack={handleBack} />;
    if (isBulk) return <BulkBid market={market} session={session} walletBal={walletBal} scheduleForTomorrow={scheduleForTomorrow} betType={betType} />;
    if (isJodiOrPana) return <EasyModeBid market={market} session={session} walletBal={walletBal} scheduleForTomorrow={scheduleForTomorrow} betType={betType} />;
    if (betType === 'Triple Pana') return <TriplePanaBid market={market} session={session} walletBal={walletBal} scheduleForTomorrow={scheduleForTomorrow} />;
    if (betType === 'Half Sangam') return <HalfSangamBid market={market} session={session} walletBal={walletBal} scheduleForTomorrow={scheduleForTomorrow} />;
    if (betType === 'Full Sangam') return <FullSangamBid market={market} walletBal={walletBal} scheduleForTomorrow={scheduleForTomorrow} />;
    return <View style={{ padding: 20 }}><Text style={{ color: colors.textMuted }}>Bid type "{betType}" not supported yet.</Text></View>;
  };

  const sessionOptions = betType === 'Full Sangam' ? ['OPEN'] : betType === 'Half Sangam' ? (session === 'CLOSE' ? ['CLOSE'] : ['OPEN']) : ['OPEN', 'CLOSE'];

  const insets = useSafeAreaInsets();
  const scrollPaddingBottom = 120 + Math.max(insets.bottom, 0);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.black }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <BidHeader
        market={market}
        title={betType}
        onBack={handleBack}
        session={session}
        setSession={setSession}
        walletBal={walletBal}
        scheduleForTomorrow={scheduleForTomorrow}
        sessionOptions={sessionOptions}
        lockSession={betType === 'Full Sangam'}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.scrollContent, { paddingBottom: scrollPaddingBottom }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {!market && <View style={s.noMarket}><Text style={{ color: colors.red }}>No market selected. Please go back.</Text></View>}
        {!!market && renderBidContent()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Shared Styles ──────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  scrollContent: { paddingHorizontal: spacing[3] },
  noMarket: { padding: spacing[6], alignItems: 'center' },
  warnBox: { margin: spacing[3], padding: spacing[3], backgroundColor: colors.redBg, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.redBorder },
  warnText: { color: colors.redText, fontSize: fontSize.sm },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingHorizontal: spacing[3], marginTop: spacing[3] },
  label: { color: colors.textMuted, fontSize: fontSize.sm, width: 100 },
  input: { flex: 1, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.borderLight, borderRadius: borderRadius.full, color: colors.text, padding: spacing[3], textAlign: 'center', fontSize: fontSize.sm },
  sectionTitle: { color: colors.goldText, fontSize: fontSize.sm, fontWeight: '700', paddingHorizontal: spacing[3], marginTop: spacing[4], marginBottom: spacing[2] },
  digitGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing[3], gap: spacing[2], marginTop: spacing[2], justifyContent: 'center' },
  digitSpacer: { width: '30%' },
  digitBtn: { width: '30%', aspectRatio: 1.2, backgroundColor: colors.surfaceCard, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.borderLight, alignItems: 'center', justifyContent: 'center', position: 'relative', minHeight: 52 },
  digitNum: { color: colors.goldText, fontSize: fontSize.lg, fontWeight: '700' },
  digitPts: { position: 'absolute', top: 4, right: 6, color: colors.goldText, fontSize: 9, fontWeight: '800' },
  addBtn: { marginHorizontal: spacing[3], marginTop: spacing[3], backgroundColor: colors.gold, borderRadius: borderRadius.lg, padding: spacing[3], alignItems: 'center' },
  addBtnText: { color: '#4b3608', fontWeight: '800', fontSize: fontSize.sm },
  actionRow: { flexDirection: 'row', paddingHorizontal: spacing[3], marginTop: spacing[3], gap: spacing[2] },
  listWrap: { marginHorizontal: spacing[3], marginTop: spacing[3], backgroundColor: colors.surfaceCard, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.borderLight, overflow: 'hidden' },
  listHeader: { flexDirection: 'row', padding: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  listCol: { flex: 1, color: colors.goldText, fontSize: fontSize.xs, fontWeight: '700', textAlign: 'center' },
  listRow: { flexDirection: 'row', padding: spacing[3], borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  listCell: { flex: 1, fontSize: fontSize.xs, fontWeight: '600', textAlign: 'center' },
  tripleGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing[3], gap: spacing[2], marginTop: spacing[2] },
  tripleRow: { width: '48%', flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  tripleLabel: { width: 44, height: 36, backgroundColor: colors.surfaceCard, borderRadius: 6, borderWidth: 1, borderColor: colors.borderLight, alignItems: 'center', justifyContent: 'center' },
  tripleLabelText: { color: colors.goldText, fontWeight: '700', fontSize: fontSize.sm },
  tripleInput: { flex: 1, height: 36, backgroundColor: colors.surfaceCard, borderRadius: 6, borderWidth: 1, borderColor: colors.borderLight, color: colors.text, textAlign: 'center', fontSize: fontSize.sm },
  modeRow: { flexDirection: 'row', marginHorizontal: spacing[3], marginTop: spacing[3], gap: spacing[2] },
  modeBtn: { flex: 1, padding: spacing[3], borderRadius: borderRadius.lg, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.borderLight, alignItems: 'center' },
  modeBtnActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  modeBtnText: { color: colors.textMuted, fontWeight: '700', fontSize: fontSize.xs },
  modeBtnTextActive: { color: '#4b3608' },
  bulkGroup: { marginHorizontal: spacing[3], marginTop: spacing[4], backgroundColor: colors.surfaceCard, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.borderLight, overflow: 'hidden' },
  bulkGroupHeader: { flexDirection: 'row', alignItems: 'center', padding: spacing[2], borderBottomWidth: 1, borderBottomColor: colors.borderLight, gap: spacing[1] },
  bulkGroupLabel: { width: 36, height: 32, backgroundColor: '#0d1117', borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  bulkGroupLabelText: { color: colors.goldText, fontSize: fontSize.xs, fontWeight: '800' },
  bulkGroupInput: { flex: 1, height: 32, backgroundColor: '#0d1117', borderRadius: 6, borderWidth: 1, borderColor: colors.borderLight, color: colors.text, textAlign: 'center', fontSize: fontSize.xs },
  bulkApplyBtn: { paddingHorizontal: spacing[2], paddingVertical: spacing[1], backgroundColor: '#0d1117', borderRadius: 6, borderWidth: 1, borderColor: 'rgba(212,175,55,0.4)' },
  bulkApplyText: { color: colors.goldText, fontSize: fontSize.xs, fontWeight: '700' },
  bulkClearBtn: { paddingHorizontal: spacing[2], paddingVertical: spacing[1], backgroundColor: '#0d1117', borderRadius: 6, borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)' },
  bulkClearText: { color: colors.red, fontSize: fontSize.xs, fontWeight: '700' },
  bulkItemsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: spacing[2], gap: spacing[1] },
  bulkItem: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  bulkItemLabel: { width: 40, height: 32, backgroundColor: '#0d1117', borderRadius: 4, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderLight },
  bulkItemLabelText: { color: colors.goldText, fontSize: 10, fontWeight: '700' },
  bulkItemInput: { width: 54, height: 32, backgroundColor: '#0d1117', borderRadius: 4, borderWidth: 1, borderColor: colors.borderLight, color: colors.text, textAlign: 'center', fontSize: 10 },
});

import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from '../hooks/useTranslation';
import { API_BASE_URL } from '../config/api';
import { isPastClosingTime } from '../utils/marketTiming';
import { colors, spacing, borderRadius, fontSize } from '../theme';

const formatTime12 = (time24) => {
  if (!time24) return '';
  const [hhRaw, mmRaw] = String(time24).split(':');
  const hh = Number(hhRaw);
  const mm = Number(mmRaw);
  if (!Number.isFinite(hh)) return String(time24);
  const ampm = hh >= 12 ? 'pm' : 'am';
  const h12 = hh % 12 || 12;
  const min = Number.isFinite(mm) ? String(mm).padStart(2, '0') : '00';
  return `${h12}:${min} ${ampm}`;
};

const formatKingBazaarJodi = (jodi) => {
  const s = (jodi || '').toString().trim();
  if (s.length === 2 && /^\d{2}$/.test(s)) return s.split('').join(' ');
  if (s.includes('-')) return s.split('').join(' ').replace(/-/g, ' ');
  return '* *';
};

const getTodayIST = (now = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);

const getTodayTargetMsIST = (timeHHMM, nowMs) => {
  const todayIST = getTodayIST(new Date(nowMs));
  const t = (timeHHMM || '').toString().slice(0, 5);
  if (!/^\d{2}:\d{2}$/.test(t)) return null;
  const addDays = (yyyyMmDd, days) => { const b = new Date(`${yyyyMmDd}T12:00:00+05:30`); b.setDate(b.getDate() + days); return getTodayIST(b); };
  const dateStr = t === '00:00' ? addDays(todayIST, 1) : todayIST;
  const targetToday = new Date(`${dateStr}T${t}:00+05:30`).getTime();
  if (Number.isNaN(targetToday)) return null;
  return targetToday;
};

const isSlotClosedTodayIST = (timeHHMM, nowMs) => {
  const targetToday = getTodayTargetMsIST(timeHHMM, nowMs);
  if (targetToday == null) return true;
  return nowMs >= targetToday;
};

const DEMO_SLOTS = ['11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '00:00'];

export default function KingBazaarMarket() {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useTranslation();
  const marketKey = (route.params?.marketKey || '').toString().trim().toLowerCase();
  const marketLabel = (route.params?.marketLabel || 'King Bazaar').toString();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [tick, setTick] = useState(() => Date.now());
  const [showClosedModal, setShowClosedModal] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchItems = async (updateState = true) => {
    if (updateState) setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/markets/get-markets?marketType=king`);
      const data = await res.json();
      const list = Array.isArray(data?.data) ? data.data : [];
      const filtered = list.filter((m) => {
        const group = (m?.kingBazaarGroup || '').toString().trim().toLowerCase();
        if (!marketKey) return true;
        return group === marketKey;
      });
      const mapped = filtered.map((m) => {
        const st = (m.startingTime || '').toString().trim().slice(0, 5);
        const status = isPastClosingTime(m) ? 'closed' : (m.openingNumber && /^\d{3}$/.test(String(m.openingNumber)) ? 'closed' : 'open');
        return {
          id: m._id, marketName: m.marketName || m.gameName || marketLabel,
          startingTime: st || null, closingTime: m.closingTime || m.startingTime || null,
          openingNumber: m.openingNumber || null, closingNumber: m.closingNumber || null,
          displayResult: m.displayResult || '***-**-***', status, _raw: m, _isDemo: false,
        };
      }).sort((a, b) => String(a.startingTime || '').localeCompare(String(b.startingTime || '')));
      if (mapped.length > 0) {
        if (updateState) { setItems(mapped); setLoading(false); }
        else setItems(mapped);
      } else if (updateState) {
        const demoItems = DEMO_SLOTS.map((slotTime) => ({
          id: `king-demo-${slotTime}`, marketName: marketLabel,
          startingTime: slotTime, closingTime: slotTime,
          openingNumber: null, closingNumber: null,
          displayResult: '***-**-***', status: 'open', _raw: null, _isDemo: true,
        }));
        setItems(demoItems);
        setLoading(false);
      }
    } catch {
      if (updateState) {
        const demoItems = DEMO_SLOTS.map((slotTime) => ({
          id: `king-demo-${slotTime}`, marketName: marketLabel,
          startingTime: slotTime, closingTime: slotTime,
          openingNumber: null, closingNumber: null,
          displayResult: '***-**-***', status: 'open', _raw: null, _isDemo: true,
        }));
        setItems(demoItems);
        setLoading(false);
      }
    }
  };

  useEffect(() => { fetchItems(true); }, [marketKey]);
  useEffect(() => {
    const id = setInterval(() => fetchItems(false), 5000);
    return () => clearInterval(id);
  }, [marketKey]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.backBtn} activeOpacity={0.8}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerSubtitle}>{t('kingBazaarMarket.pageTitle')}</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>{marketLabel}</Text>
        </View>
      </View>

      <FlatList
        data={items}
        renderItem={({ item }) => (
          <SlotCard
            m={item}
            tick={tick}
            t={t}
            onPress={() => {
              const slotClosed = isSlotClosedTodayIST(item.startingTime, tick);
              const hasDeclaredOpen = item.openingNumber != null && /^\d{3}$/.test(String(item.openingNumber));
              const hasDeclaredClose = item.closingNumber != null && /^\d{3}$/.test(String(item.closingNumber));
              const isClosedForToday = slotClosed || (hasDeclaredOpen && hasDeclaredClose);
              const marketStatus = isClosedForToday ? 'closed' : 'open';

              if (marketStatus === 'closed') { setShowClosedModal(true); return; }
              const marketForBidOptions = item._raw
                ? { ...(item._raw || {}), _id: item.id, marketName: item.marketName, gameName: item.marketName, startingTime: item.startingTime, closingTime: item.closingTime, openingNumber: item.openingNumber, closingNumber: item.closingNumber, status: item.status === 'running' ? 'running' : 'open' }
                : { _id: 'king-demo-market', marketType: 'king', marketName: item.marketName, gameName: item.marketName, startingTime: item.startingTime, closingTime: item.closingTime, openingNumber: null, closingNumber: null, status: 'open' };
              navigation.navigate('BidOptions', {
                marketType: 'king', market: marketForBidOptions,
                kingBazaarMarketKey: marketKey, kingBazaarMarketLabel: marketLabel || 'King Bazaar',
              });
            }}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        ListLoadingComponent={loading && Array.from({ length: 8 }).map((_, i) => <View key={i} style={styles.skeletonCard} />)}
      />
      {/* Closed Modal */}
      <Modal visible={showClosedModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <TouchableOpacity onPress={() => setShowClosedModal(false)} style={styles.modalCloseBtn}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
            <View style={styles.modalIcon}>
              <Text style={styles.modalIconText}>✕</Text>
            </View>
            <Text style={styles.modalTitle}>{t('kingBazaarMarket.sorry')}</Text>
            <Text style={styles.modalBody}>{t('kingBazaarMarket.bettingClosed')}</Text>
            <Text style={styles.modalBody}>{t('kingBazaarMarket.comeNextDay')}</Text>
            <TouchableOpacity onPress={() => setShowClosedModal(false)} style={styles.modalOkBtn} activeOpacity={0.8}>
              <Text style={styles.modalOkText}>{t('kingBazaarMarket.ok')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const SlotCard = React.memo(({ m, tick, t, onPress }) => {
  const timeLabel = formatTime12(m.startingTime) || '-';
  const slotClosed = isSlotClosedTodayIST(m.startingTime, tick);
  const hasDeclaredOpen = m.openingNumber != null && /^\d{3}$/.test(String(m.openingNumber));
  const hasDeclaredClose = m.closingNumber != null && /^\d{3}$/.test(String(m.closingNumber));
  const isClosedForToday = slotClosed || (hasDeclaredOpen && hasDeclaredClose);
  const pill = formatKingBazaarJodi(m.displayResult);
  const marketStatus = isClosedForToday ? 'closed' : 'open';
  const isClickable = !isClosedForToday;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.slotCard, isClosedForToday && { opacity: 0.9 }]}
      activeOpacity={isClickable ? 0.85 : 1}
    >
      <View style={styles.timeBlock}>
        <Text style={styles.timeText}>{timeLabel}</Text>
        {marketStatus === 'closed' && (
          <Text style={styles.closedText}>{t('kingBazaarMarket.closeForToday')}</Text>
        )}
      </View>
      <View style={styles.resultPillWrap}>
        <View style={styles.resultPill}>
          <Text style={styles.resultPillText}>{pill}</Text>
        </View>
      </View>
      <TouchableOpacity onPress={onPress} style={[styles.playBtn, isClosedForToday && { opacity: 0.7 }]} activeOpacity={0.8}>
        <Text style={styles.playIcon}>▶</Text>
        <Text style={styles.playText}>{t('kingBazaarMarket.playGame')}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingHorizontal: spacing[4], paddingTop: spacing[3], paddingBottom: spacing[3] },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  backIcon: { color: colors.text, fontSize: 20, fontWeight: '600' },
  headerInfo: { flex: 1 },
  headerSubtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
  headerTitle: { color: colors.text, fontSize: fontSize.xl, fontWeight: '800', letterSpacing: 0.5 },
  list: { paddingHorizontal: spacing[4], gap: spacing[2], paddingBottom: 100 },
  skeletonCard: { height: 68, borderRadius: borderRadius.lg, backgroundColor: '#1f2937', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  slotCard: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], backgroundColor: '#1f2937', borderRadius: borderRadius.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', padding: spacing[3] },
  timeBlock: { flexShrink: 0 },
  timeText: { color: colors.text, fontSize: fontSize.xl, fontWeight: '700' },
  closedText: { color: '#f87171', fontSize: 10, fontWeight: '600', marginTop: 2 },
  resultPillWrap: { flex: 1, alignItems: 'center' },
  resultPill: { backgroundColor: colors.black, borderRadius: borderRadius.full, paddingHorizontal: spacing[4], paddingVertical: spacing[2], borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  resultPillText: { color: colors.text, fontSize: fontSize.lg, fontWeight: '700' },
  playBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#374151', borderRadius: borderRadius.full, paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', flexShrink: 0 },
  playIcon: { color: colors.text, fontSize: 10 },
  playText: { color: colors.text, fontSize: 11, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', alignItems: 'center', justifyContent: 'center', padding: spacing[4] },
  modalCard: { width: '100%', maxWidth: 360, backgroundColor: '#1f2937', borderRadius: borderRadius['2xl'], borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: spacing[6], alignItems: 'center', gap: spacing[3] },
  modalCloseBtn: { position: 'absolute', top: spacing[4], right: spacing[4] },
  modalCloseText: { color: 'rgba(255,255,255,0.7)', fontSize: 18 },
  modalIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(127,29,29,0.3)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', alignItems: 'center', justifyContent: 'center' },
  modalIconText: { color: '#f87171', fontSize: 28, fontWeight: '700' },
  modalTitle: { color: '#f87171', fontSize: fontSize.xl, fontWeight: '700' },
  modalBody: { color: 'rgba(255,255,255,0.9)', fontSize: fontSize.sm, textAlign: 'center', lineHeight: 20 },
  modalOkBtn: { width: '100%', backgroundColor: colors.goldLight, borderRadius: borderRadius.lg, paddingVertical: spacing[3], alignItems: 'center' },
  modalOkText: { color: colors.black, fontWeight: '700', fontSize: fontSize.base },
});

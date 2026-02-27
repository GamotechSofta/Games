import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal, StyleSheet, RefreshControl,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from '../hooks/useTranslation';
import { API_BASE_URL } from '../config/api';
import { isPastClosingTime } from '../utils/marketTiming';
import { colors, spacing, borderRadius, fontSize } from '../theme';
import { SkeletonSlotCard } from '../components/Skeleton';
import { haptics } from '../utils/haptics';

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

const sumDigits = (s) => [...String(s)].reduce((acc, c) => acc + (Number(c) || 0), 0);
const openDigit = (open3) => (open3 && /^\d{3}$/.test(String(open3)) ? String(sumDigits(open3) % 10) : '*');

const istDateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });

const getTodayIST = (now = new Date()) => istDateFormatter.format(now);

const getTodayTargetMsIST = (timeHHMM, nowMs) => {
  const todayIST = getTodayIST(new Date(nowMs));
  const t = (timeHHMM || '').toString().slice(0, 5);
  if (!/^\d{2}:\d{2}$/.test(t)) return null;
  const addDays = (yyyyMmDd, days) => {
    const base = new Date(`${yyyyMmDd}T12:00:00+05:30`);
    base.setDate(base.getDate() + days);
    return getTodayIST(base);
  };
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

export default function StarlineMarket() {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useTranslation();
  const marketKey = (route.params?.marketKey || '').toString().trim().toLowerCase();
  const marketLabel = (route.params?.marketLabel || 'Starline').toString();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [tick, setTick] = useState(() => Date.now());
  const [showClosedModal, setShowClosedModal] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchItems(false);
    setRefreshing(false);
  };

  useEffect(() => {
    // Check slot closed status every 30s — 1s tick causes all cards to re-render every second
    const timer = setInterval(() => setTick(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const fetchItems = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/markets/get-markets?marketType=startline`);
      const data = await res.json();
      const list = Array.isArray(data?.data) ? data.data : [];
      const keyNorm = marketKey;
      const filtered = list.filter((m) => {
        const group = (m?.starlineGroup || '').toString().trim().toLowerCase();
        if (!keyNorm) return true;
        return group === keyNorm;
      });
      const mapped = filtered
        .map((m) => {
          const st = (m.startingTime || '').toString().trim().slice(0, 5);
          const status = isPastClosingTime(m) ? 'closed' : (m.openingNumber && /^\d{3}$/.test(String(m.openingNumber)) ? 'closed' : 'open');
          return {
            id: m._id, marketName: m.marketName || m.gameName || marketLabel,
            startingTime: st || null, closingTime: m.closingTime || m.startingTime || null,
            openingNumber: m.openingNumber || null, closingNumber: m.closingNumber || null, status,
          };
        })
        .sort((a, b) => String(a.startingTime || '').localeCompare(String(b.startingTime || '')));
      setItems(mapped);
    } catch { setItems([]); } finally { if (showLoading) setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, [marketKey]);

  useEffect(() => {
    const id = setInterval(fetchItems, 30000);
    return () => clearInterval(id);
  }, [marketKey]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { haptics.light(); navigation.navigate('StartlineDashboard'); }} style={styles.backBtn} activeOpacity={0.8}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerSubtitle}>{t('starlineMarket.pageTitle')}</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>{marketLabel}</Text>
        </View>
      </View>

      {!loading && items.length === 0 && (
        <View style={styles.warnBox}>
          <Text style={styles.warnText}>{t('starlineMarket.noTimeSlots', { title: marketLabel })}</Text>
          <Text style={styles.warnSubText}>{t('starlineMarket.slotsAddedIn')}</Text>
        </View>
      )}

      {loading && items.length === 0 ? (
        <View style={styles.list}>
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonSlotCard key={i} />
          ))}
        </View>
      ) : (
      <FlatList
        data={items}
        renderItem={({ item }) => (
          <SlotCard
            m={item}
            tick={tick}
            t={t}
            onPress={() => {
              haptics.light();
              const hasDeclaredOpen = item.openingNumber != null && /^\d{3}$/.test(String(item.openingNumber));
              const slotClosed = isSlotClosedTodayIST(item.startingTime, tick);
              const isClosedForToday = slotClosed || hasDeclaredOpen;
              const marketStatus = isClosedForToday ? 'closed' : 'open';

              if (marketStatus === 'closed') { setShowClosedModal(true); return; }
              navigation.navigate('BidOptions', {
                marketType: 'starline',
                market: {
                  _id: item.id, marketName: item.marketName, gameName: item.marketName,
                  startingTime: item.startingTime, closingTime: item.closingTime,
                  openingNumber: item.openingNumber, closingNumber: item.closingNumber,
                  status: marketStatus,
                },
                starlineMarketKey: marketKey,
                starlineMarketLabel: marketLabel || 'Starline',
              });
            }}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.goldLight} />}
      />
      )}
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
            <Text style={styles.modalTitle}>{t('starlineMarket.sorry')}</Text>
            <Text style={styles.modalBody}>{t('starlineMarket.bettingClosed')}</Text>
            <Text style={styles.modalBody}>{t('starlineMarket.comeNextDay')}</Text>
            <TouchableOpacity onPress={() => setShowClosedModal(false)} style={styles.modalOkBtn} activeOpacity={0.8}>
              <Text style={styles.modalOkText}>{t('starlineMarket.ok')}</Text>
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
  const isClosedForToday = slotClosed || hasDeclaredOpen;
  const pill = `${hasDeclaredOpen ? String(m.openingNumber) : '***'} - ${openDigit(m.openingNumber)}`;
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
          <Text style={styles.closedText}>{t('starlineMarket.closeForToday')}</Text>
        )}
      </View>
      <View style={styles.resultPillWrap}>
        <View style={styles.resultPill}>
          <Text style={styles.resultPillText}>{pill}</Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={onPress}
        style={[styles.playBtn, isClosedForToday && { opacity: 0.7 }]}
        activeOpacity={0.8}
      >
        <Text style={styles.playIcon}>▶</Text>
        <Text style={styles.playText}>{t('starlineMarket.playGame')}</Text>
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
  warnBox: { margin: spacing[4], padding: spacing[4], borderRadius: borderRadius['2xl'], backgroundColor: 'rgba(245,158,11,0.15)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.4)' },
  warnText: { color: '#fcd34d', fontWeight: '600', fontSize: fontSize.sm },
  warnSubText: { color: 'rgba(252,211,77,0.9)', fontSize: 12, marginTop: 4 },
  list: { paddingHorizontal: spacing[4], gap: spacing[2], paddingBottom: 100 },
  skeletonCard: { height: 68, borderRadius: borderRadius.lg, backgroundColor: '#1f2937', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  slotCard: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], backgroundColor: '#1f2937', borderRadius: borderRadius.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', padding: spacing[3] },
  timeBlock: { flexShrink: 0 },
  timeText: { color: colors.text, fontSize: fontSize.xl, fontWeight: '700', lineHeight: 26 },
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

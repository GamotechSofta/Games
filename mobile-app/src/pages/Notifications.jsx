import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../hooks/useTranslation';
import { API_BASE_URL } from '../config/api';
import { storage } from '../utils/storage';
import {
  markNotificationsSeen,
  getNotificationsClearedAt,
  setNotificationsClearedAt,
} from '../utils/notificationCount';
import { colors, spacing, borderRadius, fontSize } from '../theme';
import { SkeletonList } from '../components/Skeleton';

const toDateKeyIST = (d) => {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(d);
  } catch { return ''; }
};

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
  } catch { return ''; }
};

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
  } catch { return t('notifications.older'); }
};

const getIconFromType = (type, subtype, status) => {
  if (type === 'payment' && subtype === 'deposit') {
    if (status === 'approved') return { icon: '↓', color: '#43b36a' };
    if (status === 'rejected') return { icon: '✕', color: '#f87171' };
    return { icon: '⏳', color: '#fbbf24' };
  }
  if (type === 'payment' && subtype === 'withdrawal') {
    if (status === 'approved') return { icon: '↑', color: '#43b36a' };
    if (status === 'rejected') return { icon: '✕', color: '#f87171' };
    return { icon: '⏳', color: '#fbbf24' };
  }
  if (type === 'support') return { icon: '🎫', color: '#a78bfa' };
  if (type === 'result') return { icon: '🏆', color: '#d4af37' };
  return { icon: '🔔', color: '#9ca3af' };
};

export default function Notifications() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [items, setItems] = useState([]);
  const [userId, setUserId] = useState(null);
  const [clearedAt, setClearedAt] = useState(null);

  useEffect(() => {
    storage.getItem('user').then((raw) => {
      try {
        const u = raw ? JSON.parse(raw) : {};
        setUserId(u?.id || u?._id || null);
      } catch { setUserId(null); }
    });
    getNotificationsClearedAt().then((val) => setClearedAt(val));
  }, []);

  const fetchAll = useCallback(async (showLoading = true) => {
    if (!userId) { setItems([]); setLoading(false); setRefreshing(false); return; }
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

      const toMarketId = (v) => (v == null ? '' : String(v && typeof v === 'object' && v._id != null ? v._id : v));
      const betMarketIds = new Set(
        (Array.isArray(betsData?.data) ? betsData.data : []).map((b) => toMarketId(b.marketId)).filter(Boolean)
      );

      const list = [];

      (depData?.data || []).slice(0, 25).forEach((d) => {
        const status = (d.status || '').toLowerCase();
        const amount = `₹${Number(d.amount || 0).toLocaleString('en-IN')}`;
        const title = status === 'approved'
          ? t('notifications.addFundApproved', { amount })
          : status === 'rejected'
            ? t('notifications.addFundRejected', { amount })
            : t('notifications.addFundPending', { amount });
        const msg = (d.adminRemarks && String(d.adminRemarks).trim()) || (d.upiTransactionId ? `${t('funds.utrLabel')} ${d.upiTransactionId}` : t('notifications.viewAddFundHistory'));
        list.push({ id: `dep-${d._id}`, type: 'payment', subtype: 'deposit', title, message: msg, time: d.processedAt || d.updatedAt || d.createdAt, status, nav: 'Funds' });
      });

      (withData?.data || []).slice(0, 25).forEach((w) => {
        const status = (w.status || '').toLowerCase();
        const amount = `₹${Number(w.amount || 0).toLocaleString('en-IN')}`;
        const title = status === 'approved'
          ? t('notifications.withdrawalApproved', { amount })
          : status === 'rejected'
            ? t('notifications.withdrawalRejected', { amount })
            : t('notifications.withdrawalPending', { amount });
        const msg = (w.adminRemarks && String(w.adminRemarks).trim()) || t('notifications.viewWithdrawFundHistory');
        list.push({ id: `with-${w._id}`, type: 'payment', subtype: 'withdrawal', title, message: msg, time: w.processedAt || w.updatedAt || w.createdAt, status, nav: 'Funds' });
      });

      const statusLabel = (s) => ({
        open: t('notifications.statusOpen'),
        'in-progress': t('notifications.statusInProgress'),
        resolved: t('notifications.statusResolved'),
        closed: t('notifications.statusClosed'),
      }[s] || s);

      (ticketsData?.data || []).slice(0, 20).forEach((ticket) => {
        const hasReply = !!ticket.adminResponse;
        const subject = (ticket.subject || t('notifications.supportRequest')).trim();
        const title = hasReply ? t('notifications.replyPrefix', { subject }) : t('notifications.ticketPrefix', { subject });
        const statusText = statusLabel(ticket.status) || ticket.status;
        const msg = hasReply
          ? (ticket.adminResponse || '').toString().trim().slice(0, 120) + ((ticket.adminResponse || '').length > 120 ? '…' : '')
          : t('notifications.statusPrefixReply', { status: statusText });
        list.push({ id: `ticket-${ticket._id}`, type: 'support', subtype: 'ticket', title, message: msg, time: ticket.updatedAt || ticket.createdAt, status: ticket.status, nav: 'SupportStatus' });
      });

      const resultArray = (data) => (Array.isArray(data?.data) ? data.data : []);
      const addResults = (resultData, dateKey) => {
        resultArray(resultData).forEach((r) => {
          const marketIdStr = toMarketId(r.marketId);
          if (!marketIdStr || !betMarketIds.has(marketIdStr)) return;
          const name = (r.marketName || '').toString().trim();
          if (!name) return;
          const result = (r.displayResult || '').toString().trim() || '***-**-***';
          list.push({
            id: `result-${r._id || marketIdStr}-${dateKey}`,
            type: 'result',
            subtype: 'market',
            title: t('notifications.resultDeclared', { name: name.toUpperCase() }),
            message: result,
            time: r.updatedAt || r.createdAt || new Date(`${dateKey}T23:59:59+05:30`).toISOString(),
            status: 'declared',
            nav: 'MarketResultHistory',
          });
        });
      };
      addResults(resultTodayData, todayKey);
      addResults(resultYesterdayData, yesterdayKey);

      list.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
      setItems(list);
    } catch (err) {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, t]);

  useEffect(() => {
    if (userId !== null) fetchAll(true);
  }, [userId, fetchAll]);

  useEffect(() => {
    markNotificationsSeen();
  }, []);

  const filterOptions = [
    { key: 'all', label: t('common.all') },
    { key: 'payment', label: t('notifications.payment') },
    { key: 'result', label: t('notifications.result') },
    { key: 'support', label: t('notifications.support') },
  ];

  const filtered = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter((i) => i.type === filter);
  }, [items, filter]);

  // Group by date section
  const grouped = useMemo(() => {
    const map = new Map();
    for (const item of filtered) {
      const section = getDateSection(item.time, t);
      if (!map.has(section)) map.set(section, []);
      map.get(section).push(item);
    }
    const order = [t('notifications.today'), t('notifications.yesterday'), t('notifications.thisWeek'), t('notifications.older')];
    const sorted = Array.from(map.entries()).sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
    return sorted;
  }, [filtered, t]);

  const handleClearAll = async () => {
    const now = Date.now();
    await setNotificationsClearedAt(now);
    setClearedAt(now);
    setItems([]);
  };

  const NotifCard = ({ item }) => {
    const { icon, color } = getIconFromType(item.type, item.subtype, item.status);
    const relTime = formatNotificationTime(item.time, t);
    return (
      <TouchableOpacity
        onPress={() => item.nav && navigation.navigate(item.nav)}
        style={styles.notifCard}
        activeOpacity={0.8}
      >
        <View style={[styles.notifIconWrap, { backgroundColor: `${color}20`, borderColor: `${color}40` }]}>
          <Text style={[styles.notifIcon, { color }]}>{icon}</Text>
        </View>
        <View style={styles.notifContent}>
          <Text style={styles.notifTitle} numberOfLines={2}>{item.title}</Text>
          {item.message ? <Text style={styles.notifMsg} numberOfLines={2}>{item.message}</Text> : null}
          {relTime ? <Text style={styles.notifTime}>{relTime}</Text> : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.backBtn} activeOpacity={0.8}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('notifications.title')}</Text>
        {items.length > 0 && (
          <TouchableOpacity onPress={handleClearAll} style={styles.clearBtn} activeOpacity={0.8}>
            <Text style={styles.clearText}>{t('notifications.clearAll')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow} style={{ flexGrow: 0 }}>
        {filterOptions.map((fo) => (
          <TouchableOpacity key={fo.key} onPress={() => setFilter(fo.key)} style={[styles.chip, fo.key === filter && styles.chipActive]} activeOpacity={0.8}>
            <Text style={[styles.chipText, fo.key === filter && styles.chipTextActive]}>{fo.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          <SkeletonList count={10} />
        </ScrollView>
      ) : !userId ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>{t('notifications.loginToSee')}</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyEmoji}>🔔</Text>
          <Text style={styles.emptyTitle}>{t('notifications.allCaughtUp')}</Text>
          <Text style={styles.emptyText}>{t('notifications.noNotifications')}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchAll(false)} tintColor={colors.goldLight} />}
        >
          {grouped.map(([section, sectionItems]) => (
            <View key={section}>
              <Text style={styles.sectionLabel}>{section}</Text>
              {sectionItems.map((item) => <NotifCard key={item.id} item={item} />)}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingHorizontal: spacing[3], paddingTop: spacing[4], paddingBottom: spacing[3] },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  backIcon: { color: colors.text, fontSize: 20, fontWeight: '600' },
  title: { flex: 1, color: colors.text, fontSize: fontSize.xl, fontWeight: '700' },
  clearBtn: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: borderRadius.full, paddingHorizontal: spacing[3], paddingVertical: 6 },
  clearText: { color: '#9ca3af', fontSize: fontSize.xs, fontWeight: '600' },
  chipRow: { flexDirection: 'row', gap: spacing[2], paddingHorizontal: spacing[3], paddingBottom: spacing[3] },
  chip: { height: 36, paddingHorizontal: spacing[4], borderRadius: borderRadius.full, backgroundColor: '#202124', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  chipActive: { backgroundColor: '#1f2937', borderColor: 'rgba(255,255,255,0.3)' },
  chipText: { color: '#9ca3af', fontSize: fontSize.sm, fontWeight: '600' },
  chipTextActive: { color: colors.text },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[6], gap: spacing[3] },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: '700' },
  emptyText: { color: '#9ca3af', fontSize: fontSize.sm, textAlign: 'center' },
  list: { paddingHorizontal: spacing[3], paddingBottom: 100, gap: spacing[3] },
  sectionLabel: { color: '#6b7280', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: spacing[4], marginBottom: spacing[2] },
  notifCard: { flexDirection: 'row', gap: spacing[3], backgroundColor: '#111113', borderRadius: borderRadius['2xl'], borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: spacing[4] },
  notifIconWrap: { width: 44, height: 44, borderRadius: borderRadius.xl, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  notifIcon: { fontSize: 18 },
  notifContent: { flex: 1, gap: 3 },
  notifTitle: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600' },
  notifMsg: { color: '#9ca3af', fontSize: fontSize.xs },
  notifTime: { color: '#6b7280', fontSize: 10 },
});

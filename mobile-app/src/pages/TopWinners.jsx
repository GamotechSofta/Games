import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../hooks/useTranslation';
import { API_BASE_URL } from '../config/api';
import { colors, spacing, borderRadius, fontSize } from '../theme';

const INR = (n) => {
  const num = Number(n);
  const safe = Number.isFinite(num) ? num : 0;
  return safe.toLocaleString('en-IN');
};

const getMedalColors = (rank) => {
  if (rank === 1) return { bg: '#d4af37', text: '#000' };
  if (rank === 2) return { bg: '#94a3b8', text: '#000' };
  if (rank === 3) return { bg: '#d97706', text: '#000' };
  return { bg: '#1f2227', text: '#fff' };
};

export default function TopWinners() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState('today');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);

  const timeRanges = [
    { key: 'today', label: t('notifications.today') },
    { key: 'week', label: t('topWinners.7Days') },
    { key: 'month', label: t('topWinners.30Days') },
    { key: 'all', label: t('common.all') },
  ];

  const fetchWinners = async (range) => {
    setLoading(true);
    setError('');
    try {
      const qs = range && range !== 'all' ? `?timeRange=${encodeURIComponent(range)}` : '';
      const res = await fetch(`${API_BASE_URL}/bets/public/top-winners${qs}`);
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.message || t('topWinners.failedToLoad'));
      setRows(Array.isArray(data.data) ? data.data : []);
    } catch (e) {
      setRows([]);
      setError(e?.message || t('topWinners.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWinners(timeRange); }, [timeRange]);

  const normalized = useMemo(() => {
    return (rows || []).map((r, idx) => ({
      rank: idx + 1,
      username: r?.userId?.username || r?.user?.username || 'User',
      totalWinnings: Number(r?.totalWinnings ?? 0) || 0,
      totalWins: Number(r?.totalWins ?? 0) || 0,
      winRate: r?.winRate != null ? String(r.winRate) : '',
    }));
  }, [rows]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.backBtn} activeOpacity={0.8}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('topWinners.title')}</Text>
      </View>

      {/* Time Range Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        style={{ flexGrow: 0 }}
      >
        {timeRanges.map((tr) => (
          <TouchableOpacity
            key={tr.key}
            onPress={() => setTimeRange(tr.key)}
            style={[styles.chip, tr.key === timeRange && styles.chipActive]}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, tr.key === timeRange && styles.chipTextActive]}>{tr.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.goldLight} />
        </View>
      ) : normalized.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>{t('topWinners.noWinners')}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {normalized.map((r) => {
            const medalColors = getMedalColors(r.rank);
            return (
              <View key={`${r.rank}-${r.username}`} style={styles.card}>
                <View style={[styles.rankBadge, { backgroundColor: medalColors.bg }]}>
                  <Text style={[styles.rankText, { color: medalColors.text }]}>{r.rank}</Text>
                </View>
                <View style={styles.infoWrap}>
                  <View style={styles.cardRow}>
                    <Text style={styles.username} numberOfLines={1}>{r.username}</Text>
                    <Text style={styles.winnings}>₹ {INR(r.totalWinnings)}</Text>
                  </View>
                  <View style={styles.cardRowSub}>
                    <Text style={styles.subText}>{t('topWinners.wins')}: {INR(r.totalWins)}</Text>
                    {r.winRate ? <Text style={styles.subText}>{t('topWinners.winRate')}: {r.winRate}%</Text> : null}
                  </View>
                </View>
              </View>
            );
          })}
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
  title: { color: colors.text, fontSize: fontSize.xl, fontWeight: '700' },
  chipRow: { flexDirection: 'row', gap: spacing[2], paddingHorizontal: spacing[3], paddingBottom: spacing[3] },
  chip: { height: 36, paddingHorizontal: spacing[4], borderRadius: borderRadius.full, backgroundColor: '#202124', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  chipActive: { backgroundColor: colors.gold, borderColor: 'rgba(212,175,55,0.6)' },
  chipText: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600' },
  chipTextActive: { color: colors.black },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorBox: { margin: spacing[3], padding: spacing[4], backgroundColor: 'rgba(127,29,29,0.5)', borderRadius: borderRadius.xl, borderWidth: 1, borderColor: '#dc2626' },
  errorText: { color: '#fca5a5', fontSize: fontSize.sm },
  emptyBox: { margin: spacing[3], backgroundColor: '#202124', borderRadius: borderRadius['2xl'], borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: spacing[6], alignItems: 'center' },
  emptyText: { color: '#9ca3af', fontSize: fontSize.sm },
  list: { paddingHorizontal: spacing[3], gap: spacing[3], paddingBottom: 100 },
  card: { backgroundColor: '#202124', borderRadius: borderRadius['2xl'], borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: spacing[4], flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  rankBadge: { width: 48, height: 48, borderRadius: borderRadius['2xl'], alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rankText: { fontSize: fontSize.lg, fontWeight: '800' },
  infoWrap: { flex: 1, minWidth: 0 },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[3] },
  username: { color: colors.text, fontWeight: '700', flex: 1 },
  winnings: { color: colors.gold, fontWeight: '800', flexShrink: 0 },
  cardRowSub: { flexDirection: 'row', gap: spacing[3], marginTop: 4 },
  subText: { color: '#9ca3af', fontSize: fontSize.xs },
});

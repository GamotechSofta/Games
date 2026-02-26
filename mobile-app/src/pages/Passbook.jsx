import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  StyleSheet, RefreshControl, SectionList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../hooks/useTranslation';
import { API_BASE_URL } from '../config/api';
import { storage } from '../utils/storage';
import { updateUserBalance } from '../api/bets';
import { colors, spacing, borderRadius, fontSize } from '../theme';

const dateCardFormatter = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const timeFormatter = new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
const inCurrencyFormatter = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatDate = (dateStr) => {
  try {
    const d = new Date(dateStr);
    return dateCardFormatter.format(d);
  } catch { return ''; }
};

const formatTime = (dateStr) => {
  try {
    const d = new Date(dateStr);
    return timeFormatter.format(d);
  } catch { return ''; }
};

const formatAmount = (amount) => {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '0.00';
  return inCurrencyFormatter.format(n);
};

export default function Passbook() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [balance, setBalance] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    storage.getItem('user').then((raw) => {
      try {
        const u = raw ? JSON.parse(raw) : {};
        setUserId(u?.id || u?._id || null);
      } catch { setUserId(null); }
    });
  }, []);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!userId) { setLoading(false); return; }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [txRes, balRes] = await Promise.all([
        fetch(`${API_BASE_URL}/wallet/my-transactions?userId=${userId}&limit=500`),
        fetch(`${API_BASE_URL}/wallet/balance?userId=${userId}`),
      ]);
      const txData = await txRes.json();
      const balData = await balRes.json();
      if (txData.success) setTransactions(txData.data || []);
      if (balData.success) {
        const newBal = balData.data?.balance ?? 0;
        setBalance(newBal);
        updateUserBalance(newBal);
      }
    } catch (err) {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    if (filter === 'all') return transactions;
    return transactions.filter((tx) => tx.type === filter);
  }, [transactions, filter]);

  const stats = useMemo(() => {
    let totalCredit = 0, totalDebit = 0, creditCount = 0, debitCount = 0;
    transactions.forEach((tx) => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'credit') { totalCredit += amt; creditCount++; }
      else { totalDebit += amt; debitCount++; }
    });
    return { totalCredit, totalDebit, creditCount, debitCount };
  }, [transactions]);

  const grouped = useMemo(() => {
    const map = new Map();
    filtered.forEach((tx) => {
      const key = formatDate(tx.createdAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(tx);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const filterOptions = useMemo(() => [
    { key: 'all', label: t('passbook.allTransactions'), count: transactions.length },
    { key: 'credit', label: t('passbook.credits'), count: stats.creditCount },
    { key: 'debit', label: t('passbook.debits'), count: stats.debitCount },
  ], [t, transactions.length, stats.creditCount, stats.debitCount]);

  const sections = useMemo(() => {
    return grouped.map(([date, data]) => ({ title: date, data }));
  }, [grouped]);

  const renderItem = useCallback(({ item, index, section }) => {
    const isCredit = item.type === 'credit';
    const isLast = index === section.data.length - 1;
    return (
      <TxItem
        tx={item}
        isCredit={isCredit}
        isLast={isLast}
        t={t}
        formatTime={formatTime}
        formatAmount={formatAmount}
      />
    );
  }, [t]);

  const renderSectionHeader = useCallback(({ section: { title } }) => (
    <Text style={styles.groupDate}>{title}</Text>
  ), []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.backBtn} activeOpacity={0.8}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('passbook.title')}</Text>
        <TouchableOpacity onPress={() => fetchData(true)} disabled={refreshing} style={styles.refreshBtn} activeOpacity={0.8}>
          <Text style={[styles.refreshIcon, refreshing && { opacity: 0.5 }]}>⟳</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.goldLight} />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item, index) => item._id || String(index)}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={colors.goldLight} />}
          contentContainerStyle={styles.scrollContent}
          initialNumToRender={20}
          maxToRenderPerBatch={10}
          windowSize={5}
          ListHeaderComponent={
            <>
              {/* Balance Card */}
              <View style={styles.balanceCard}>
                <Text style={styles.balanceLabel}>{t('passbook.currentBalance')}</Text>
                <Text style={styles.balanceValue}>₹{balance !== null ? formatAmount(balance) : '---'}</Text>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>+₹{formatAmount(stats.totalCredit)}</Text>
                    <Text style={styles.statLabel}>{t('passbook.credited')} ({stats.creditCount})</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: '#f87171' }]}>-₹{formatAmount(stats.totalDebit)}</Text>
                    <Text style={styles.statLabel}>{t('passbook.withdrawn')} ({stats.debitCount})</Text>
                  </View>
                </View>
              </View>

              {/* Filter tabs */}
              <View style={styles.filterRow}>
                {filterOptions.map((fo) => (
                  <TouchableOpacity
                    key={fo.key}
                    onPress={() => setFilter(fo.key)}
                    style={[styles.filterTab, fo.key === filter && styles.filterTabActive]}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.filterTabText, fo.key === filter && styles.filterTabTextActive]}>
                      {fo.label} {fo.count > 0 ? `(${fo.count})` : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {filtered.length === 0 && (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>{t('passbook.noTransactions')}</Text>
                </View>
              )}
            </>
          }
        />
      )}
    </View>
  );
}

const TxItem = React.memo(({ tx, isCredit, isLast, t, formatTime, formatAmount }) => (
  <View style={[styles.txCard, !isLast && styles.txCardBorder]}>
    <View style={[styles.txIconWrap, { backgroundColor: isCredit ? 'rgba(67,179,106,0.1)' : 'rgba(248,113,113,0.1)' }]}>
      <Text style={{ fontSize: 18 }}>{isCredit ? '↓' : '↑'}</Text>
    </View>
    <View style={styles.txInfo}>
      <Text style={styles.txDesc} numberOfLines={1}>{tx.description || (isCredit ? t('passbook.creditEntry') : t('passbook.debitEntry'))}</Text>
      <Text style={styles.txTime}>{formatTime(tx.createdAt)}</Text>
    </View>
    <View style={styles.txAmtWrap}>
      <Text style={[styles.txAmount, { color: isCredit ? '#43b36a' : '#f87171' }]}>
        {isCredit ? '+' : '-'}₹{formatAmount(tx.amount)}
      </Text>
      {tx.balanceAfter != null && (
        <Text style={styles.txBalance}>₹{formatAmount(tx.balanceAfter)}</Text>
      )}
    </View>
  </View>
));

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0b' },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingHorizontal: spacing[4], paddingTop: spacing[4], paddingBottom: spacing[3], borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  backIcon: { color: colors.text, fontSize: 18 },
  title: { flex: 1, color: colors.text, fontSize: fontSize.base, fontWeight: '600', letterSpacing: 0.5 },
  refreshBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  refreshIcon: { color: colors.text, fontSize: 20 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: spacing[4], paddingBottom: 100 },
  balanceCard: {
    marginTop: spacing[4],
    borderRadius: borderRadius['2xl'],
    backgroundColor: '#16213e',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    padding: spacing[5],
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  balanceLabel: { color: '#9ca3af', fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  balanceValue: { color: colors.goldText, fontSize: 32, fontWeight: '800' },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, gap: 3 },
  statValue: { color: '#43b36a', fontSize: fontSize.base, fontWeight: '700' },
  statLabel: { color: '#6b7280', fontSize: 10 },
  statDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: spacing[3] },
  filterRow: { flexDirection: 'row', gap: spacing[2], marginBottom: spacing[4] },
  filterTab: { flex: 1, paddingVertical: spacing[2], borderRadius: borderRadius.full, backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  filterTabActive: { backgroundColor: 'rgba(242,193,78,0.1)', borderColor: 'rgba(242,193,78,0.3)' },
  filterTabText: { color: '#9ca3af', fontSize: fontSize.xs, fontWeight: '600' },
  filterTabTextActive: { color: colors.goldText },
  emptyBox: { padding: spacing[6], alignItems: 'center', gap: spacing[2] },
  emptyText: { color: '#9ca3af', fontSize: fontSize.sm },
  groupDate: { color: '#6b7280', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: spacing[4], marginBottom: spacing[2] },
  txCard: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingVertical: spacing[3] },
  txCardBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  txIconWrap: { width: 40, height: 40, borderRadius: borderRadius.xl, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  txInfo: { flex: 1, gap: 2 },
  txDesc: { color: colors.text, fontSize: fontSize.sm, fontWeight: '500' },
  txTime: { color: '#6b7280', fontSize: 11 },
  txAmtWrap: { alignItems: 'flex-end', gap: 2 },
  txAmount: { fontSize: fontSize.base, fontWeight: '700' },
  txBalance: { color: '#6b7280', fontSize: 10 },
});

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../../hooks/useTranslation';
import { API_BASE_URL } from '../../config/api';
import { storage } from '../../utils/storage';
import { colors, spacing, borderRadius, fontSize } from '../../theme';
import { SkeletonFundCard } from '../../components/Skeleton';

const formatDate = (dateString) => {
    try {
        const d = new Date(dateString);
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return '-'; }
};

const statusStyles = {
    pending: { bg: 'rgba(234,179,8,0.3)', text: '#fcd34d' },
    approved: { bg: 'rgba(34,197,94,0.3)', text: '#4ade80' },
    rejected: { bg: 'rgba(239,68,68,0.3)', text: '#f87171' },
    completed: { bg: 'rgba(59,130,246,0.3)', text: '#93c5fd' },
};

export default function WithdrawFundHistory() {
    const navigation = useNavigation();
    const { t } = useTranslation();
    const [user, setUser] = useState(null);
    const [withdrawals, setWithdrawals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        storage.getItem('user').then((raw) => {
            try { setUser(raw ? JSON.parse(raw) : null); } catch { setUser(null); }
        });
    }, []);

    const userId = user?._id || user?.id;

    const fetchWithdrawals = React.useCallback(() => {
        if (!userId) return Promise.resolve();
        return fetch(`${API_BASE_URL}/payments/my-withdrawals?userId=${encodeURIComponent(userId)}`)
            .then((r) => r.json())
            .then((data) => { if (data.success) setWithdrawals(data.data || []); })
            .catch(() => setWithdrawals([]));
    }, [userId]);

    useEffect(() => {
        if (!userId) { setLoading(false); return; }
        setLoading(true);
        fetchWithdrawals().finally(() => setLoading(false));
    }, [userId, fetchWithdrawals]);

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        fetchWithdrawals().finally(() => setRefreshing(false));
    }, [fetchWithdrawals]);

    const filtered = filter === 'all' ? withdrawals : withdrawals.filter((w) => w.status === filter);
    const stats = {
        total: withdrawals.length,
        pending: withdrawals.filter((w) => w.status === 'pending').length,
        approved: withdrawals.filter((w) => w.status === 'approved').length,
        rejected: withdrawals.filter((w) => w.status === 'rejected').length,
    };
    const totalWithdrawn = withdrawals.filter((w) => w.status === 'approved').reduce((sum, w) => sum + (w.amount || 0), 0);

    const getStatusBadge = (status) => statusStyles[status] || statusStyles.pending;
    const getStatusLabel = (status) => {
        if (status === 'pending') return t('funds.pending');
        if (status === 'approved') return t('funds.approved');
        if (status === 'rejected') return t('funds.rejected');
        return (status || '').charAt(0).toUpperCase() + (status || '').slice(1);
    };

    const bankDetail = (w) => w.bankDetailId || w.bankDetail;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>
                <Text style={styles.title}>{t('funds.withdrawFundHistory')}</Text>
            </View>
            {loading ? (
                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                    {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonFundCard key={i} />)}
                </ScrollView>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.goldLight} />}
                >
                    {/* Total Withdrawn - match frontend */}
                    <View style={styles.totalCard}>
                        <Text style={styles.totalLabel}>{t('funds.totalWithdrawn')}</Text>
                        <Text style={styles.totalValue}>₹{totalWithdrawn.toLocaleString('en-IN')}</Text>
                    </View>

                    {/* Filter chips */}
                    <View style={styles.chipsRow}>
                        {(['all', 'pending', 'approved', 'rejected']).map((key) => (
                            <TouchableOpacity
                                key={key}
                                onPress={() => setFilter(key)}
                                style={[styles.chip, filter === key && styles.chipActive]}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.chipValue, key === 'pending' && { color: '#fcd34d' }, key === 'approved' && { color: '#4ade80' }, key === 'rejected' && { color: '#f87171' }]}>
                                    {key === 'all' ? stats.total : stats[key]}
                                </Text>
                                <Text style={styles.chipLabel}>{key === 'all' ? t('funds.total') : getStatusLabel(key)}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {filtered.length === 0 ? (
                        <View style={styles.emptyWrap}>
                            <Text style={styles.emptyIcon}>📋</Text>
                            <Text style={styles.emptyText}>{t('funds.noWithdrawalHistoryFound')}</Text>
                            {filter !== 'all' && (
                                <TouchableOpacity onPress={() => setFilter('all')} style={styles.viewAllBtn} activeOpacity={0.8}>
                                    <Text style={styles.viewAllText}>{t('funds.viewAllWithdrawals')}</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : (
                        <View style={styles.grid}>
                            {filtered.map((wd) => {
                                const badge = getStatusBadge(wd.status);
                                const bank = bankDetail(wd);
                                return (
                                    <View key={wd._id} style={styles.card}>
                                        <View style={styles.cardTop}>
                                            <View style={[styles.statusIcon, { backgroundColor: badge.bg }]}>
                                                <Text style={[styles.statusIconText, { color: badge.text }]}>
                                                    {wd.status === 'approved' ? '✓' : wd.status === 'rejected' ? '✕' : '◷'}
                                                </Text>
                                            </View>
                                            <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                                                <Text style={[styles.statusBadgeText, { color: badge.text }]}>{getStatusLabel(wd.status)}</Text>
                                            </View>
                                        </View>
                                        <Text style={styles.amount}>-₹{(wd.amount || 0).toLocaleString('en-IN')}</Text>
                                        <Text style={styles.date}>{formatDate(wd.createdAt)}</Text>
                                        {bank?.accountHolderName && (
                                            <Text style={styles.meta}><Text style={styles.metaLabel}>{t('funds.toLabel')}</Text> {bank.accountHolderName}</Text>
                                        )}
                                        {bank?.bankName && bank?.accountNumber && (
                                            <Text style={styles.meta}>{bank.bankName} - ****{String(bank.accountNumber).slice(-4)}</Text>
                                        )}
                                        {bank?.upiId && (
                                            <Text style={styles.meta}><Text style={styles.metaLabel}>{t('funds.upiLabel')}</Text> {bank.upiId}</Text>
                                        )}
                                        {wd.adminRemarks && (
                                            <Text style={styles.meta}><Text style={styles.metaLabel}>{t('funds.adminLabel')}</Text> {wd.adminRemarks}</Text>
                                        )}
                                        {wd.processedAt && (
                                            <Text style={styles.meta}>{t('funds.processed')}: {formatDate(wd.processedAt)}</Text>
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.black },
    header: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingHorizontal: spacing[4], paddingTop: spacing[4], paddingBottom: spacing[3] },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    backIcon: { color: colors.text, fontSize: 20, fontWeight: '600' },
    title: { flex: 1, color: colors.text, fontSize: fontSize.xl, fontWeight: '700' },
    scroll: { paddingHorizontal: spacing[4], paddingBottom: 100 },
    totalCard: { backgroundColor: 'rgba(147,51,234,0.2)', borderRadius: borderRadius['2xl'], padding: spacing[5], borderWidth: 1, borderColor: 'rgba(147,51,234,0.3)', marginBottom: spacing[4] },
    totalLabel: { color: '#9ca3af', fontSize: fontSize.sm },
    totalValue: { color: colors.text, fontSize: 30, fontWeight: '700', marginTop: 4 },
    chipsRow: { flexDirection: 'row', gap: spacing[3], marginBottom: spacing[4] },
    chip: { flex: 1, backgroundColor: '#1a1a1a', borderRadius: borderRadius.xl, padding: spacing[3], alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    chipActive: { backgroundColor: 'rgba(59,130,246,0.2)', borderColor: 'rgba(59,130,246,0.5)' },
    chipValue: { color: colors.text, fontSize: fontSize.lg, fontWeight: '700' },
    chipLabel: { color: '#9ca3af', fontSize: 11, marginTop: 2 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing[3] },
    card: { width: '48%', backgroundColor: '#1a1a1a', borderRadius: borderRadius.xl, padding: spacing[4], borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[2] },
    statusIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    statusIconText: { fontSize: 16, fontWeight: '700' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
    statusBadgeText: { fontSize: 11, fontWeight: '600' },
    amount: { color: '#f87171', fontWeight: '600', fontSize: fontSize.base },
    date: { color: '#6b7280', fontSize: 11, marginTop: 4 },
    meta: { color: '#9ca3af', fontSize: 11, marginTop: 4 },
    metaLabel: { color: '#6b7280' },
    emptyWrap: { alignItems: 'center', paddingVertical: spacing[8] },
    emptyIcon: { fontSize: 48, marginBottom: spacing[2] },
    emptyText: { color: '#9ca3af', fontSize: fontSize.sm },
    viewAllBtn: { marginTop: spacing[2] },
    viewAllText: { color: '#93c5fd', fontSize: fontSize.sm },
});

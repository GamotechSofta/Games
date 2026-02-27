import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking, RefreshControl } from 'react-native';
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

export default function AddFundHistory() {
    const navigation = useNavigation();
    const { t } = useTranslation();
    const [user, setUser] = useState(null);
    const [deposits, setDeposits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        storage.getItem('user').then((raw) => {
            try { setUser(raw ? JSON.parse(raw) : null); } catch { setUser(null); }
        });
    }, []);

    const userId = user?._id || user?.id;

    const fetchDeposits = React.useCallback(() => {
        if (!userId) return Promise.resolve();
        return fetch(`${API_BASE_URL}/payments/my-deposits?userId=${encodeURIComponent(userId)}`)
            .then((r) => r.json())
            .then((data) => { if (data.success) setDeposits(data.data || []); })
            .catch(() => setDeposits([]));
    }, [userId]);

    useEffect(() => {
        if (!userId) { setLoading(false); return; }
        setLoading(true);
        fetchDeposits().finally(() => setLoading(false));
    }, [userId, fetchDeposits]);

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        fetchDeposits().finally(() => setRefreshing(false));
    }, [fetchDeposits]);

    const filtered = filter === 'all' ? deposits : deposits.filter((d) => d.status === filter);
    const stats = {
        total: deposits.length,
        pending: deposits.filter((d) => d.status === 'pending').length,
        approved: deposits.filter((d) => d.status === 'approved').length,
        rejected: deposits.filter((d) => d.status === 'rejected').length,
    };
    const totalAdded = deposits.filter((d) => d.status === 'approved').reduce((sum, d) => sum + (d.amount || 0), 0);

    const getStatusBadge = (status) => statusStyles[status] || statusStyles.pending;
    const getStatusLabel = (status) => {
        if (status === 'pending') return t('funds.pending');
        if (status === 'approved') return t('funds.approved');
        if (status === 'rejected') return t('funds.rejected');
        return (status || '').charAt(0).toUpperCase() + (status || '').slice(1);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>
                <Text style={styles.title}>{t('funds.addFundHistory')}</Text>
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
                    {/* Total Added Funds - match frontend */}
                    <View style={styles.totalCard}>
                        <Text style={styles.totalLabel}>{t('funds.totalAddedFunds')}</Text>
                        <Text style={styles.totalValue}>₹{totalAdded.toLocaleString('en-IN')}</Text>
                    </View>

                    {/* Filter chips - match frontend */}
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
                            <Text style={styles.emptyText}>{t('funds.noDepositHistoryFound')}</Text>
                            {filter !== 'all' && (
                                <TouchableOpacity onPress={() => setFilter('all')} style={styles.viewAllBtn} activeOpacity={0.8}>
                                    <Text style={styles.viewAllText}>{t('funds.viewAllDeposits')}</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : (
                        <View style={styles.grid}>
                            {filtered.map((dep) => {
                                const badge = getStatusBadge(dep.status);
                                return (
                                    <View key={dep._id} style={styles.card}>
                                        <View style={styles.cardTop}>
                                            <View style={[styles.statusIcon, { backgroundColor: badge.bg }]}>
                                                <Text style={[styles.statusIconText, { color: badge.text }]}>
                                                    {dep.status === 'approved' ? '✓' : dep.status === 'rejected' ? '✕' : '◷'}
                                                </Text>
                                            </View>
                                            <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                                                <Text style={[styles.statusBadgeText, { color: badge.text }]}>{getStatusLabel(dep.status)}</Text>
                                            </View>
                                        </View>
                                        <Text style={styles.amount}>+₹{(dep.amount || 0).toLocaleString('en-IN')}</Text>
                                        <Text style={styles.date}>{formatDate(dep.createdAt)}</Text>
                                        {dep.upiTransactionId ? (
                                            <Text style={styles.meta}><Text style={styles.metaLabel}>{t('funds.utrLabel')}</Text> {dep.upiTransactionId}</Text>
                                        ) : null}
                                        {dep.adminRemarks ? (
                                            <Text style={styles.meta}><Text style={styles.metaLabel}>{t('funds.adminLabel')}</Text> {dep.adminRemarks}</Text>
                                        ) : null}
                                        {dep.processedAt ? (
                                            <Text style={styles.meta}>{t('funds.processed')}: {formatDate(dep.processedAt)}</Text>
                                        ) : null}
                                        {dep.screenshotUrl ? (
                                            <TouchableOpacity onPress={() => Linking.openURL(dep.screenshotUrl.startsWith('http') ? dep.screenshotUrl : `${API_BASE_URL.replace('/api/v1', '')}${dep.screenshotUrl}`)} style={styles.screenshotLink} activeOpacity={0.8}>
                                                <Text style={styles.screenshotLinkText}>{t('funds.viewScreenshot')}</Text>
                                            </TouchableOpacity>
                                        ) : null}
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
    totalCard: { backgroundColor: 'rgba(34,197,94,0.15)', borderRadius: borderRadius['2xl'], padding: spacing[5], borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)', marginBottom: spacing[4] },
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
    amount: { color: colors.text, fontWeight: '600', fontSize: fontSize.base },
    date: { color: '#6b7280', fontSize: 11, marginTop: 4 },
    meta: { color: '#9ca3af', fontSize: 11, marginTop: 4 },
    metaLabel: { color: '#6b7280' },
    screenshotLink: { marginTop: spacing[2] },
    screenshotLinkText: { color: '#93c5fd', fontSize: 11 },
    emptyWrap: { alignItems: 'center', paddingVertical: spacing[8] },
    emptyIcon: { fontSize: 48, marginBottom: spacing[2] },
    emptyText: { color: '#9ca3af', fontSize: fontSize.sm },
    viewAllBtn: { marginTop: spacing[2] },
    viewAllText: { color: '#93c5fd', fontSize: fontSize.sm },
});

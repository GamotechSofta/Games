import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../../hooks/useTranslation';
import { API_BASE_URL } from '../../config/api';
import { storage } from '../../utils/storage';
import { colors, spacing, borderRadius, fontSize } from '../../theme';

const formatDate = (iso) => {
    try {
        return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return '-'; }
};

export default function AddFundHistory() {
    const navigation = useNavigation();
    const { t } = useTranslation();
    const [user, setUser] = useState(null);
    const [deposits, setDeposits] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        storage.getItem('user').then((raw) => {
            try { setUser(raw ? JSON.parse(raw) : null); } catch { setUser(null); }
        });
    }, []);

    const userId = user?._id || user?.id;

    useEffect(() => {
        if (!userId) { setLoading(false); return; }
        fetch(`${API_BASE_URL}/payments/my-deposits?userId=${encodeURIComponent(userId)}`)
            .then((r) => r.json())
            .then((data) => { if (data.success) setDeposits(data.data || []); })
            .catch(() => setDeposits([]))
            .finally(() => setLoading(false));
    }, [userId]);

    const statusColor = (s) => {
        if (s === 'success' || s === 'approved') return '#34d399';
        if (s === 'pending') return '#fcd34d';
        return '#f87171';
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
                <View style={styles.centered}><ActivityIndicator size="large" color={colors.goldLight} /></View>
            ) : deposits.length === 0 ? (
                <View style={styles.emptyWrap}>
                    <Text style={styles.emptyText}>{t('funds.noDeposits') || 'No deposit history found.'}</Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
                    {deposits.map((dep, idx) => (
                        <View key={dep._id || idx} style={styles.card}>
                            <View style={styles.cardRow}>
                                <Text style={styles.amount}>+₹{Number(dep.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
                                <Text style={[styles.status, { color: statusColor(dep.status) }]}>{(dep.status || '-').toUpperCase()}</Text>
                            </View>
                            <Text style={styles.date}>{formatDate(dep.createdAt)}</Text>
                            {dep.transactionId ? <Text style={styles.txnId}>TXN: {dep.transactionId}</Text> : null}
                        </View>
                    ))}
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
    title: { color: colors.text, fontSize: fontSize.xl, fontWeight: '700' },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyText: { color: '#6b7280', fontSize: fontSize.sm },
    list: { paddingHorizontal: spacing[4], gap: spacing[3], paddingBottom: 100 },
    card: { backgroundColor: '#141416', borderRadius: borderRadius['2xl'], borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', padding: spacing[4] },
    cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    amount: { color: '#34d399', fontSize: fontSize.lg, fontWeight: '700' },
    status: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
    date: { color: '#9ca3af', fontSize: fontSize.xs, marginTop: 4 },
    txnId: { color: '#6b7280', fontSize: 11, marginTop: 2, fontFamily: 'monospace' },
});

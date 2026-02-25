import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../../hooks/useTranslation';
import { API_BASE_URL } from '../../config/api';
import { storage } from '../../utils/storage';
import { colors, spacing, borderRadius, fontSize } from '../../theme';

export default function WithdrawFund() {
    const navigation = useNavigation();
    const { t } = useTranslation();
    const [user, setUser] = useState(null);
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        storage.getItem('user').then((raw) => {
            try { setUser(raw ? JSON.parse(raw) : null); } catch { setUser(null); }
        });
    }, []);

    const walletBalance = user?.wallet || user?.balance || 0;

    const handleWithdraw = async () => {
        const n = Number(amount);
        if (!n || n < 100) {
            setMessage({ type: 'error', text: t('funds.minimumWithdraw', { min: 100 }) || 'Minimum withdrawal is ₹100' });
            return;
        }
        if (n > walletBalance) {
            setMessage({ type: 'error', text: t('funds.insufficientBalance') || 'Insufficient wallet balance' });
            return;
        }
        const userId = user?._id || user?.id;
        if (!userId) {
            setMessage({ type: 'error', text: t('funds.loginRequired') || 'Login required' });
            return;
        }
        setLoading(true);
        setMessage({ type: '', text: '' });
        try {
            const res = await fetch(`${API_BASE_URL}/payments/withdraw`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, amount: n }),
            });
            const data = await res.json();
            if (data.success) {
                setMessage({ type: 'success', text: t('funds.withdrawSuccess') || 'Withdrawal request submitted!' });
                setAmount('');
            } else {
                setMessage({ type: 'error', text: data.message || t('funds.somethingWentWrong') || 'Something went wrong' });
            }
        } catch {
            setMessage({ type: 'error', text: t('funds.networkError') || 'Network error. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>
                <Text style={styles.title}>{t('funds.withdrawFund')}</Text>
            </View>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Balance info */}
                <View style={styles.balanceCard}>
                    <Text style={styles.balanceLabel}>{t('profile.walletBalance')}</Text>
                    <Text style={styles.balanceValue}>₹{Number(walletBalance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                </View>
                <View style={styles.inputCard}>
                    <Text style={styles.fieldLabel}>{t('funds.enterWithdrawAmount') || 'Withdraw Amount'} <Text style={styles.required}>*</Text></Text>
                    <View style={styles.inputRow}>
                        <Text style={styles.rupeeSign}>₹</Text>
                        <TextInput
                            style={styles.input}
                            value={amount}
                            onChangeText={setAmount}
                            placeholder="0"
                            placeholderTextColor="#6b7280"
                            keyboardType="numeric"
                        />
                    </View>
                    <Text style={styles.hint}>{t('funds.minimumWithdrawHint') || 'Minimum ₹100'}</Text>
                </View>
                {message.text ? (
                    <View style={[styles.msgBox, message.type === 'success' ? styles.msgSuccess : styles.msgError]}>
                        <Text style={[styles.msgText, message.type === 'success' ? styles.msgSuccessText : styles.msgErrorText]}>
                            {message.text}
                        </Text>
                    </View>
                ) : null}
                <TouchableOpacity onPress={handleWithdraw} style={[styles.submitBtn, loading && { opacity: 0.6 }]} activeOpacity={0.8} disabled={loading}>
                    {loading ? <ActivityIndicator size="small" color={colors.text} /> : <Text style={styles.submitText}>{t('funds.withdrawFund')}</Text>}
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.black },
    header: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingHorizontal: spacing[4], paddingTop: spacing[4], paddingBottom: spacing[3] },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    backIcon: { color: colors.text, fontSize: 20, fontWeight: '600' },
    title: { color: colors.text, fontSize: fontSize.xl, fontWeight: '700' },
    scroll: { padding: spacing[4], gap: spacing[4] },
    balanceCard: { backgroundColor: '#141416', borderRadius: borderRadius['2xl'], borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', padding: spacing[5], alignItems: 'center' },
    balanceLabel: { color: '#9ca3af', fontSize: fontSize.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
    balanceValue: { color: colors.goldText, fontSize: 32, fontWeight: '800', marginTop: 4 },
    inputCard: { backgroundColor: '#141416', borderRadius: borderRadius['2xl'], borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', padding: spacing[5], gap: spacing[3] },
    fieldLabel: { color: '#9ca3af', fontSize: fontSize.sm },
    required: { color: colors.goldLight },
    inputRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', paddingBottom: spacing[2] },
    rupeeSign: { color: '#ef4444', fontSize: 28, fontWeight: '700', marginRight: spacing[2] },
    input: { flex: 1, color: colors.text, fontSize: 32, fontWeight: '700' },
    hint: { color: '#6b7280', fontSize: 11 },
    msgBox: { padding: spacing[3], borderRadius: borderRadius.xl, borderWidth: 1 },
    msgSuccess: { backgroundColor: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.3)' },
    msgError: { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' },
    msgText: { fontSize: fontSize.sm },
    msgSuccessText: { color: '#86efac' },
    msgErrorText: { color: '#fca5a5' },
    submitBtn: { backgroundColor: '#ef4444', borderRadius: borderRadius['2xl'], paddingVertical: spacing[4], alignItems: 'center' },
    submitText: { color: colors.text, fontWeight: '700', fontSize: fontSize.base },
});

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../../hooks/useTranslation';
import { API_BASE_URL } from '../../config/api';
import { storage } from '../../utils/storage';
import { colors, spacing, borderRadius, fontSize } from '../../theme';
import { SkeletonForm } from '../../components/Skeleton';
import { haptics } from '../../utils/haptics';

export default function WithdrawFund() {
    const navigation = useNavigation();
    const { t } = useTranslation();
    const [user, setUser] = useState(null);
    const [config, setConfig] = useState(null);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [walletBalance, setWalletBalance] = useState(0);
    const [pageLoading, setPageLoading] = useState(true);
    const [amount, setAmount] = useState('');
    const [userNote, setUserNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [showNoBankModal, setShowNoBankModal] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [submittedAmount, setSubmittedAmount] = useState(0);

    const userId = user?._id || user?.id;

    useEffect(() => {
        storage.getItem('user').then((raw) => {
            try { setUser(raw ? JSON.parse(raw) : null); } catch { setUser(null); }
        });
    }, []);

    const fetchConfig = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/payments/config`);
            const data = await res.json();
            if (data.success) setConfig(data.data);
        } catch { /* ignore */ }
    }, []);

    const fetchBankAccounts = useCallback(async () => {
        if (!userId) return;
        try {
            const res = await fetch(`${API_BASE_URL}/bank-details?userId=${encodeURIComponent(userId)}`);
            const data = await res.json();
            if (data.success) {
                const accounts = data.data || [];
                setBankAccounts(accounts);
                if (accounts.length === 0) setShowNoBankModal(true);
            }
        } catch { /* ignore */ }
    }, [userId]);

    const fetchWalletBalance = useCallback(async () => {
        if (!userId) return;
        try {
            const res = await fetch(`${API_BASE_URL}/wallet/balance?userId=${encodeURIComponent(userId)}`);
            const data = await res.json();
            if (data.success) setWalletBalance(data.data?.balance ?? 0);
        } catch { /* ignore */ }
    }, [userId]);

    useEffect(() => {
        if (!userId) { setPageLoading(false); return; }
        let cancelled = false;
        setPageLoading(true);
        Promise.all([fetchConfig(), fetchBankAccounts(), fetchWalletBalance()]).finally(() => {
            if (!cancelled) setPageLoading(false);
        });
        return () => { cancelled = true; };
    }, [userId, fetchConfig, fetchBankAccounts, fetchWalletBalance]);

    const minWithdraw = config?.minWithdrawal ?? 500;
    const maxWithdraw = config?.maxWithdrawal ?? 25000;
    const selectedBank = bankAccounts.find((a) => a.isDefault) || bankAccounts[0];

    const handleSubmit = () => {
        haptics.medium();
        setMessage({ type: '', text: '' });
        if (!userId) {
            haptics.warning();
            setMessage({ type: 'error', text: t('funds.loginRequiredWithdraw') });
            return;
        }
        const numAmount = parseFloat(amount);
        if (!numAmount || numAmount < minWithdraw || numAmount > maxWithdraw) {
            haptics.warning();
            setMessage({ type: 'error', text: t('funds.amountRequiredWithdraw', { min: minWithdraw, max: maxWithdraw }) });
            return;
        }
        if (numAmount > walletBalance) {
            haptics.warning();
            setMessage({ type: 'error', text: t('funds.insufficientBalanceWithdraw') });
            return;
        }
        if (!selectedBank) {
            haptics.warning();
            setMessage({ type: 'error', text: t('funds.addBankAccountFirst') });
            return;
        }
        setShowConfirmModal(true);
    };

    const confirmWithdrawal = async () => {
        setShowConfirmModal(false);
        setLoading(true);
        setMessage({ type: '', text: '' });
        const numAmount = parseFloat(amount);
        try {
            const res = await fetch(`${API_BASE_URL}/payments/withdraw`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    amount: numAmount,
                    bankDetailId: selectedBank?._id,
                    userNote: userNote.trim(),
                }),
            });
            const data = await res.json();
            if (data.success) {
                haptics.success();
                setSubmittedAmount(numAmount);
                setShowSuccessModal(true);
                setAmount('');
                setUserNote('');
                fetchWalletBalance();
            } else {
                setMessage({ type: 'error', text: data.message || t('funds.failedToSubmitWithdraw') });
            }
        } catch {
            setMessage({ type: 'error', text: t('funds.networkErrorWithdraw') });
        } finally {
            setLoading(false);
        }
    };

    const withdrawMax = () => setAmount(String(Math.min(walletBalance, maxWithdraw)));

    if (pageLoading) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
                        <Text style={styles.backIcon}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>{t('funds.withdrawFund')}</Text>
                </View>
                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                    <SkeletonForm fields={4} />
                </ScrollView>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>
                <Text style={styles.title}>{t('funds.withdrawFund')}</Text>
            </View>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Wallet card - match frontend */}
                <View style={styles.walletCard}>
                    <View style={styles.walletCardHeader}>
                        <Text style={styles.walletCardBrand}>GoldenBets.com</Text>
                    </View>
                    <View style={styles.walletCardBalanceStrip}>
                        <View style={styles.walletRupeeCircle}>
                            <Text style={styles.walletRupeeSign}>₹</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.walletBalanceLabel}>{t('funds.availableBalance')}</Text>
                            <Text style={styles.walletBalanceText}>₹ {Number(walletBalance || 0).toLocaleString('en-IN')}</Text>
                        </View>
                    </View>
                    <View style={styles.walletCardFooter}>
                        <Text style={styles.walletUsername}>{user?.username || user?.name || 'User'}</Text>
                        <Text style={styles.walletMinMax}>Min: ₹{minWithdraw} | Max: ₹{maxWithdraw}</Text>
                    </View>
                </View>

                {/* Withdrawal info */}
                <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>{t('funds.withdrawalInfo')}:</Text>
                    <Text style={styles.infoItem}>• {t('funds.withdrawalsProcessed24h')}</Text>
                    <Text style={styles.infoItem}>• {t('funds.ensureBankDetailsCorrect')}</Text>
                    <Text style={styles.infoItem}>• {t('funds.minimumWithdrawal')}: ₹{minWithdraw}</Text>
                    <Text style={styles.infoItem}>• {t('funds.maximumWithdrawal')}: ₹{maxWithdraw}</Text>
                </View>

                {message.text ? (
                    <View style={[styles.msgBox, message.type === 'success' ? styles.msgSuccess : styles.msgError]}>
                        <Text style={[styles.msgText, message.type === 'success' ? styles.msgSuccessText : styles.msgErrorText]}>{message.text}</Text>
                    </View>
                ) : null}

                {bankAccounts.length === 0 && (
                    <View style={styles.warnBox}>
                        <Text style={styles.warnTitle}>{t('funds.noBankAccount')}</Text>
                        <Text style={styles.warnText}>{t('funds.noBankAccountMessage')}</Text>
                    </View>
                )}

                <View style={styles.inputCard}>
                    <View style={styles.amountRow}>
                        <Text style={styles.fieldLabel}>{t('funds.amount')} (₹)</Text>
                        <TouchableOpacity onPress={withdrawMax} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                            <Text style={styles.withdrawMaxText}>{t('funds.withdrawMax')} (₹{Math.min(walletBalance, maxWithdraw).toLocaleString()})</Text>
                        </TouchableOpacity>
                    </View>
                    <TextInput
                        style={styles.input}
                        value={amount}
                        onChangeText={setAmount}
                        placeholder={t('funds.enterWithdrawAmount')}
                        placeholderTextColor="#6b7280"
                        keyboardType="numeric"
                    />
                </View>

                <TouchableOpacity
                    onPress={handleSubmit}
                    style={[styles.submitBtn, (loading || bankAccounts.length === 0) && { opacity: 0.6 }]}
                    activeOpacity={0.8}
                    disabled={loading || bankAccounts.length === 0}
                >
                    {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitText}>{t('funds.submitWithdrawRequest')}</Text>}
                </TouchableOpacity>
            </ScrollView>
            </KeyboardAvoidingView>

            {/* No Bank Account Modal */}
            <Modal visible={showNoBankModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalIconWrapWarning}>
                            <Text style={styles.modalIconWarning}>⚠</Text>
                        </View>
                        <Text style={styles.modalTitle}>{t('funds.noBankAccount')}</Text>
                        <Text style={styles.modalSubtitle}>{t('funds.noBankAccountMessage')}</Text>
                        <TouchableOpacity onPress={() => { setShowNoBankModal(false); navigation.navigate('Bank'); }} style={styles.modalBtnWarning} activeOpacity={0.8}>
                            <Text style={styles.modalBtnText}>{t('funds.addBankAccountNow')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setShowNoBankModal(false)} style={styles.modalBtnSecondary} activeOpacity={0.8}>
                            <Text style={styles.modalBtnSecondaryText}>{t('common.cancel')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Confirmation Modal */}
            <Modal visible={showConfirmModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalIconWrapWarning}>
                            <Text style={styles.modalIconWarning}>?</Text>
                        </View>
                        <Text style={styles.modalTitle}>{t('funds.confirmWithdrawal')}</Text>
                        <View style={styles.confirmAmountBox}>
                            <Text style={styles.confirmAmountLabel}>{t('funds.withdrawAmount')}</Text>
                            <Text style={styles.confirmAmountValue}>₹{Number(amount || 0).toLocaleString('en-IN')}</Text>
                        </View>
                        {selectedBank && (
                            <View style={styles.confirmBankBox}>
                                <Text style={styles.confirmBankLabel}>{t('funds.bankAccountDetails')}</Text>
                                <Text style={styles.confirmBankText}>{selectedBank.accountHolderName}</Text>
                                {selectedBank.bankName ? <Text style={styles.confirmBankSub}>{t('funds.bankName')}: {selectedBank.bankName}</Text> : null}
                                {selectedBank.accountNumber ? <Text style={styles.confirmBankSub}>{t('funds.accountNumber')}: ****{String(selectedBank.accountNumber).slice(-4)}</Text> : null}
                                {selectedBank.ifscCode ? <Text style={styles.confirmBankSub}>{t('funds.ifscCode')}: {selectedBank.ifscCode}</Text> : null}
                            </View>
                        )}
                        <TouchableOpacity onPress={confirmWithdrawal} style={styles.modalBtnDanger} activeOpacity={0.8}>
                            <Text style={styles.modalBtnText}>{t('funds.confirmWithdrawButton')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setShowConfirmModal(false)} style={styles.modalBtnSecondary} activeOpacity={0.8}>
                            <Text style={styles.modalBtnSecondaryText}>{t('common.cancel')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Success Modal */}
            <Modal visible={showSuccessModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalIconWrapSuccess}>
                            <Text style={styles.modalIconSuccess}>✓</Text>
                        </View>
                        <Text style={styles.modalTitle}>{t('funds.withdrawSuccess')}</Text>
                        <View style={styles.confirmAmountBox}>
                            <Text style={styles.confirmAmountLabel}>{t('funds.amount')}</Text>
                            <Text style={styles.confirmAmountValue}>₹{submittedAmount.toLocaleString('en-IN')}</Text>
                        </View>
                        <Text style={styles.modalSubtitle}>{t('funds.withdrawNoteText')}</Text>
                        <TouchableOpacity onPress={() => setShowSuccessModal(false)} style={styles.modalBtnDanger} activeOpacity={0.8}>
                            <Text style={styles.modalBtnText}>{t('common.done')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { setShowSuccessModal(false); navigation.navigate('WithdrawFundHistory'); }} style={styles.modalBtnSecondary} activeOpacity={0.8}>
                            <Text style={styles.modalBtnSecondaryText}>{t('funds.viewHistory')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.black },
    header: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingHorizontal: spacing[4], paddingTop: spacing[4], paddingBottom: spacing[3] },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    backIcon: { color: colors.text, fontSize: 20, fontWeight: '600' },
    title: { flex: 1, color: colors.text, fontSize: fontSize.xl, fontWeight: '700' },
    scroll: { padding: spacing[4], paddingBottom: 100 },
    walletCard: { backgroundColor: '#202124', borderRadius: borderRadius['2xl'], borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', marginBottom: spacing[4] },
    walletCardHeader: { paddingHorizontal: spacing[4], paddingTop: spacing[3], paddingBottom: spacing[2], alignItems: 'center' },
    walletCardBrand: { fontSize: fontSize.sm, color: '#d1d5db', fontWeight: '600' },
    walletCardBalanceStrip: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingHorizontal: spacing[4], paddingVertical: spacing[3], backgroundColor: '#cca84d' },
    walletRupeeCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center' },
    walletRupeeSign: { fontSize: fontSize.sm, fontWeight: '800', color: colors.black },
    walletBalanceLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(0,0,0,0.7)' },
    walletBalanceText: { color: colors.black, fontWeight: '800', fontSize: fontSize.lg },
    walletCardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[4], paddingVertical: spacing[3] },
    walletUsername: { color: 'rgba(255,255,255,0.9)', fontSize: fontSize.sm },
    walletMinMax: { color: '#9ca3af', fontSize: 11 },
    infoCard: { backgroundColor: '#1a1a1a', borderRadius: borderRadius.xl, padding: spacing[4], borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: spacing[4] },
    infoTitle: { color: '#fcd34d', fontWeight: '600', marginBottom: spacing[2] },
    infoItem: { color: '#9ca3af', fontSize: fontSize.sm, marginBottom: 4 },
    msgBox: { padding: spacing[3], borderRadius: borderRadius.xl, borderWidth: 1, marginBottom: spacing[3] },
    msgSuccess: { backgroundColor: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.3)' },
    msgError: { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' },
    msgText: { fontSize: fontSize.sm },
    msgSuccessText: { color: '#86efac' },
    msgErrorText: { color: '#fca5a5' },
    warnBox: { padding: spacing[3], backgroundColor: 'rgba(234,179,8,0.15)', borderRadius: borderRadius.xl, borderWidth: 1, borderColor: 'rgba(234,179,8,0.4)', marginBottom: spacing[4] },
    warnTitle: { color: '#fcd34d', fontWeight: '600' },
    warnText: { color: 'rgba(252,211,77,0.9)', fontSize: fontSize.xs, marginTop: 4 },
    inputCard: { backgroundColor: '#141416', borderRadius: borderRadius['2xl'], borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', padding: spacing[5], marginBottom: spacing[4] },
    amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[2] },
    fieldLabel: { color: '#9ca3af', fontSize: fontSize.sm },
    withdrawMaxText: { color: '#f87171', fontSize: fontSize.sm },
    input: { backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: borderRadius.xl, paddingHorizontal: spacing[4], paddingVertical: spacing[3], color: colors.text, fontSize: fontSize.base },
    submitBtn: { backgroundColor: '#ef4444', borderRadius: borderRadius['2xl'], paddingVertical: spacing[4], alignItems: 'center' },
    submitText: { color: '#fff', fontWeight: '700', fontSize: fontSize.base },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: spacing[4] },
    modalCard: { backgroundColor: '#1a1a1a', borderRadius: borderRadius['2xl'], padding: spacing[6], width: '100%', maxWidth: 340 },
    modalIconWrapWarning: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(234,179,8,0.2)', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: spacing[4] },
    modalIconWarning: { fontSize: 36, color: '#fcd34d' },
    modalIconWrapSuccess: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(34,197,94,0.2)', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: spacing[4] },
    modalIconSuccess: { fontSize: 36, color: '#22c55e', fontWeight: '700' },
    modalTitle: { color: colors.text, fontSize: fontSize.xl, fontWeight: '700', textAlign: 'center', marginBottom: spacing[2] },
    modalSubtitle: { color: '#9ca3af', fontSize: fontSize.sm, textAlign: 'center', marginBottom: spacing[6] },
    modalBtnWarning: { backgroundColor: '#ca8a04', paddingVertical: spacing[3], borderRadius: borderRadius.xl, alignItems: 'center', marginBottom: spacing[2] },
    modalBtnDanger: { backgroundColor: '#dc2626', paddingVertical: spacing[3], borderRadius: borderRadius.xl, alignItems: 'center', marginBottom: spacing[2] },
    modalBtn: { backgroundColor: '#2563eb', paddingVertical: spacing[3], borderRadius: borderRadius.xl, alignItems: 'center', marginBottom: spacing[2] },
    modalBtnText: { color: '#fff', fontWeight: '600' },
    modalBtnSecondary: { paddingVertical: spacing[3], borderRadius: borderRadius.xl, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)' },
    modalBtnSecondaryText: { color: colors.text, fontWeight: '500' },
    confirmAmountBox: { backgroundColor: 'rgba(239,68,68,0.2)', borderRadius: borderRadius.xl, padding: spacing[4], marginBottom: spacing[3] },
    confirmAmountLabel: { color: '#9ca3af', fontSize: 12, marginBottom: 4 },
    confirmAmountValue: { color: '#f87171', fontSize: 22, fontWeight: '700' },
    confirmBankBox: { backgroundColor: 'rgba(59,130,246,0.2)', borderRadius: borderRadius.xl, padding: spacing[4], marginBottom: spacing[4] },
    confirmBankLabel: { color: '#9ca3af', fontSize: 12, marginBottom: spacing[2] },
    confirmBankText: { color: colors.text, fontWeight: '600' },
    confirmBankSub: { color: '#9ca3af', fontSize: 12, marginTop: 2 },
});

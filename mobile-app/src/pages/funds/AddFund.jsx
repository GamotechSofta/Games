import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Modal, Image, Clipboard, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from '../../hooks/useTranslation';
import { API_BASE_URL } from '../../config/api';
import { storage } from '../../utils/storage';
import { on } from '../../utils/events';
import { colors, spacing, borderRadius, fontSize } from '../../theme';
import { haptics } from '../../utils/haptics';

const QUICK_AMOUNTS_STEP1 = [200, 500, 1000, 2000];

export default function AddFund() {
    const navigation = useNavigation();
    const { t } = useTranslation();
    const [user, setUser] = useState(null);
    const [config, setConfig] = useState(null);
    const [configLoading, setConfigLoading] = useState(true);
    const [step, setStep] = useState(1);
    const [amount, setAmount] = useState('');
    const [upiTransactionId, setUpiTransactionId] = useState('');
    const [loading, setLoading] = useState(false);
    const [addCashLoading, setAddCashLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [submittedAmount, setSubmittedAmount] = useState(0);
    const [copyToast, setCopyToast] = useState(false);

    const loadUser = useCallback(() => {
        storage.getItem('user').then((raw) => {
            try { setUser(raw ? JSON.parse(raw) : null); } catch { setUser(null); }
        });
    }, []);

    useEffect(() => {
        loadUser();
        const unsub = on('userLogin', loadUser);
        return () => unsub();
    }, [loadUser]);

    useFocusEffect(loadUser);

    useEffect(() => {
        let cancelled = false;
        setConfigLoading(true);
        const userId = user?._id || user?.id;
        fetch(`${API_BASE_URL}/payments/config${userId ? `?userId=${userId}` : ''}`)
            .then((r) => r.json())
            .then((data) => { if (!cancelled && data.success) setConfig(data.data); })
            .catch(() => {})
            .finally(() => { if (!cancelled) setConfigLoading(false); });
        return () => { cancelled = true; };
    }, [user?._id, user?.id]);

    const minDeposit = config?.minDeposit ?? 100;
    const maxDeposit = config?.maxDeposit ?? 50000;
    const upiIds = (config?.upiIds?.length > 0 ? config.upiIds : config?.upiId ? [config.upiId] : []) || [];
    const qrAmount = (() => { const n = Number(amount); return Number.isFinite(n) && n > 0 ? n : null; })();
    const upiId = upiIds[0];
    const qrUrl = upiId && `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`upi://pay?pa=${upiId}&pn=${encodeURIComponent(config?.upiName || 'Golden Games')}${qrAmount != null ? `&am=${qrAmount}` : ''}&cu=INR`)}`;

    const validateAmount = () => {
        const n = Number(amount);
        if (!n || n < minDeposit || n > maxDeposit) {
            setMessage({ type: 'error', text: t('funds.amountRequired', { min: minDeposit, max: maxDeposit }) });
            return false;
        }
        return true;
    };

    const handleAddCash = () => {
        setMessage({ type: '', text: '' });
        if (!validateAmount()) { haptics.warning(); return; }
        setAddCashLoading(true);
        setTimeout(() => { setAddCashLoading(false); setStep(2); }, 400);
    };

    const handleBackToAmount = () => setStep(1);

    const copyUpi = (id) => {
        if (!id) return;
        Clipboard.setString(id);
        haptics.success();
        setCopyToast(true);
        setTimeout(() => setCopyToast(false), 3000);
    };

    const handleSubmit = async () => {
        haptics.medium();
        setMessage({ type: '', text: '' });
        const userId = user?._id || user?.id;
        if (!userId) {
            haptics.warning();
            setMessage({ type: 'error', text: t('funds.loginRequired') });
            return;
        }
        const n = Number(amount);
        if (!n || n < minDeposit || n > maxDeposit) {
            haptics.warning();
            setMessage({ type: 'error', text: t('funds.amountRequired', { min: minDeposit, max: maxDeposit }) });
            return;
        }
        const utr = String(upiTransactionId || '').trim();
        if (!utr) {
            haptics.warning();
            setMessage({ type: 'error', text: t('funds.utrRequired') });
            return;
        }
        if (!/^\d{12}$/.test(utr)) {
            haptics.warning();
            setMessage({ type: 'error', text: t('funds.utrInvalid') });
            return;
        }
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('userId', userId);
            formData.append('amount', String(n));
            formData.append('upiTransactionId', utr);
            const res = await fetch(`${API_BASE_URL}/payments/deposit`, { method: 'POST', body: formData });
            const contentType = res.headers.get('content-type');
            const isJson = contentType && contentType.includes('application/json');
            const data = isJson ? await res.json() : { success: false, message: t('funds.somethingWentWrong') };
            if (data.success) {
                haptics.success();
                setSubmittedAmount(n);
                setShowSuccessModal(true);
                setAmount('');
                setUpiTransactionId('');
                setStep(1);
            } else {
                setMessage({ type: 'error', text: data.message || t('funds.failedToSubmit') });
            }
        } catch {
            setMessage({ type: 'error', text: t('funds.networkError') });
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
                <Text style={styles.title}>{t('funds.addFund')}</Text>
            </View>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
            <ScrollView contentContainerStyle={[styles.scroll, step === 2 && { paddingBottom: 120 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {step === 2 && (
                    <TouchableOpacity onPress={handleBackToAmount} style={styles.backToAmount} activeOpacity={0.8}>
                        <Text style={styles.backToAmountIcon}>←</Text>
                        <Text style={styles.backToAmountText}>{t('funds.backToAmount')}</Text>
                    </TouchableOpacity>
                )}

                {message.text ? (
                    <View style={[styles.msgBox, message.type === 'success' ? styles.msgSuccess : styles.msgError]}>
                        <Text style={[styles.msgText, message.type === 'success' ? styles.msgSuccessText : styles.msgErrorText]}>{message.text}</Text>
                    </View>
                ) : null}

                {step === 1 ? (
                    <>
                        {!configLoading && (
                            <>
                                <View style={styles.walletCard}>
                                    <View style={styles.walletCardHeader}>
                                        <Text style={styles.walletCardBrand}>GoldenBets.com</Text>
                                    </View>
                                    <View style={styles.walletCardBalanceStrip}>
                                        <View style={styles.walletRupeeCircle}>
                                            <Text style={styles.walletRupeeSign}>₹</Text>
                                        </View>
                                        <Text style={styles.walletBalanceText}>
                                            ₹ {(Number(user?.balance ?? user?.walletBalance ?? user?.wallet ?? 0) || 0).toLocaleString('en-IN')}
                                        </Text>
                                    </View>
                                    <View style={styles.walletCardFooter}>
                                        <Text style={styles.walletUsername}>{user?.username || user?.name || 'User'}</Text>
                                        <View style={styles.walletDots}>
                                            <View style={[styles.walletDot, { backgroundColor: '#ef4444' }]} />
                                            <View style={[styles.walletDot, { backgroundColor: colors.goldLight }]} />
                                        </View>
                                    </View>
                                </View>
                                <View style={styles.inputCard}>
                                    <Text style={styles.fieldLabel}>{t('funds.enterAmount')} <Text style={styles.required}>*</Text></Text>
                                    <View style={styles.inputRow}>
                                        <Text style={styles.rupeeSign}>₹</Text>
                                        <TextInput style={styles.input} value={amount} onChangeText={setAmount} placeholder="0" placeholderTextColor="#6b7280" keyboardType="numeric" />
                                    </View>
                                    <View style={styles.quickAmounts}>
                                        {QUICK_AMOUNTS_STEP1.map((amt) => (
                                            <TouchableOpacity key={amt} onPress={() => setAmount(String(amt))} style={[styles.quickBtn, amount === String(amt) && styles.quickBtnActive]} activeOpacity={0.8}>
                                                <Text style={[styles.quickText, amount === String(amt) && styles.quickTextActive]}>{amt}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                    <TouchableOpacity onPress={handleAddCash} style={[styles.addCashBtn, addCashLoading && { opacity: 0.7 }]} activeOpacity={0.8} disabled={addCashLoading}>
                                        <Text style={styles.addCashBtnText}>{addCashLoading ? t('common.loading') : t('funds.addCash')}</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.noteBox}>
                                    <Text style={styles.noteText}>{t('funds.depositNoteText')}</Text>
                                </View>
                            </>
                        )}
                    </>
                ) : configLoading ? null : (
                    <>
                        <View style={styles.amountSummary}>
                            <View>
                                <Text style={styles.amountSummaryLabel}>{t('funds.selectedAmount')}</Text>
                                <Text style={styles.amountSummaryValue}>₹{Number(amount || 0).toLocaleString('en-IN')}</Text>
                                <Text style={styles.amountSummaryMinMax}>{t('common.min')}: ₹{minDeposit} | {t('common.max')}: ₹{maxDeposit}</Text>
                            </View>
                            <TouchableOpacity onPress={handleBackToAmount} style={styles.changeAmountBtn} activeOpacity={0.8}>
                                <Text style={styles.changeAmountBtnText}>{t('funds.changeAmount')}</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.paymentCard}>
                            <Text style={styles.paymentTitle}>{t('funds.paymentDetails')}</Text>
                            {upiId && (
                                <View style={styles.qrWrap}>
                                    <Image source={{ uri: qrUrl }} style={styles.qrImage} />
                                    <Text style={styles.qrHint}>{t('funds.scanQRCode')}</Text>
                                </View>
                            )}
                            <View style={styles.orRow}>
                                <View style={styles.orLine} />
                                <Text style={styles.orText}>{t('funds.or')}</Text>
                                <View style={styles.orLine} />
                            </View>
                            {upiIds.map((id, idx) => (
                                <View key={idx} style={styles.upiRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.upiLabel}>{t('funds.upiId')}{upiIds.length > 1 ? ` ${idx + 1}` : ''}</Text>
                                        <Text style={styles.upiValue} numberOfLines={1}>{id || t('common.loading')}</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => copyUpi(id)} style={styles.copyBtn} activeOpacity={0.8}>
                                        <Text style={styles.copyBtnText}>{t('common.copy')}</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>

                        <View style={styles.inputCard}>
                            <Text style={styles.fieldLabel}>{t('funds.utrTransactionId')} *</Text>
                            <TextInput
                                style={styles.input}
                                value={upiTransactionId}
                                onChangeText={setUpiTransactionId}
                                placeholder={t('funds.utrPlaceholder')}
                                placeholderTextColor="#6b7280"
                                keyboardType="numeric"
                                maxLength={12}
                            />
                        </View>

                        <TouchableOpacity onPress={handleSubmit} style={[styles.submitBtn, loading && { opacity: 0.6 }]} activeOpacity={0.8} disabled={loading}>
                            {loading ? <ActivityIndicator size="small" color={colors.black} /> : <Text style={styles.submitText}>{t('funds.submitDepositRequest')}</Text>}
                        </TouchableOpacity>

                        <View style={styles.instructionsBox}>
                            <Text style={styles.instructionsTitle}>{t('funds.howToAddFunds')}</Text>
                            <Text style={styles.instructionsItem}>1. {t('funds.step1')}</Text>
                            <Text style={styles.instructionsItem}>2. {t('funds.step2')}</Text>
                            <Text style={styles.instructionsItem}>3. {t('funds.step3')}</Text>
                            <Text style={styles.instructionsItem}>4. {t('funds.step4')}</Text>
                            <Text style={styles.instructionsItem}>5. {t('funds.step5')}</Text>
                        </View>
                    </>
                )}
            </ScrollView>
            </KeyboardAvoidingView>

            {copyToast && (
                <View style={styles.toast}>
                    <Text style={styles.toastText}>{t('funds.upiIdCopied')}</Text>
                </View>
            )}

            <Modal visible={showSuccessModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalIconWrap}>
                            <Text style={styles.modalIcon}>✓</Text>
                        </View>
                        <Text style={styles.modalTitle}>{t('funds.requestSubmitted')}</Text>
                        <View style={styles.modalAmountBox}>
                            <Text style={styles.modalAmountLabel}>{t('funds.selectedAmount')}</Text>
                            <Text style={styles.modalAmountValue}>₹{submittedAmount.toLocaleString('en-IN')}</Text>
                        </View>
                        <Text style={styles.modalSubtitle}>{t('funds.depositNote')}</Text>
                        <TouchableOpacity onPress={() => setShowSuccessModal(false)} style={styles.modalBtn} activeOpacity={0.8}>
                            <Text style={styles.modalBtnText}>{t('common.done')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { setShowSuccessModal(false); navigation.navigate('AddFundHistory'); }} style={styles.modalBtnSecondary} activeOpacity={0.8}>
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
    scroll: { padding: spacing[4], gap: spacing[4] },
    backToAmount: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing[2] },
    backToAmountIcon: { color: '#9ca3af', fontSize: 20 },
    backToAmountText: { color: '#9ca3af', fontSize: fontSize.sm },
    msgBox: { padding: spacing[3], borderRadius: borderRadius.xl, borderWidth: 1 },
    msgSuccess: { backgroundColor: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.3)' },
    msgError: { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' },
    msgText: { fontSize: fontSize.sm },
    msgSuccessText: { color: '#86efac' },
    msgErrorText: { color: '#fca5a5' },
    walletCard: { backgroundColor: '#202124', borderRadius: borderRadius['2xl'], borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', marginBottom: spacing[4] },
    walletCardHeader: { paddingHorizontal: spacing[4], paddingTop: spacing[3], paddingBottom: spacing[2], alignItems: 'center' },
    walletCardBrand: { fontSize: fontSize.sm, color: '#d1d5db', fontWeight: '600', letterSpacing: 0.5 },
    walletCardBalanceStrip: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingHorizontal: spacing[4], paddingVertical: spacing[3], backgroundColor: '#cca84d' },
    walletRupeeCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center' },
    walletRupeeSign: { fontSize: fontSize.sm, fontWeight: '800', color: colors.black },
    walletBalanceText: { color: colors.black, fontWeight: '800', fontSize: fontSize.base },
    walletCardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[4], paddingVertical: spacing[3] },
    walletUsername: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.9)' },
    walletDots: { flexDirection: 'row', gap: 6 },
    walletDot: { width: 12, height: 12, borderRadius: 6 },
    inputCard: { backgroundColor: '#141416', borderRadius: borderRadius['2xl'], borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', padding: spacing[5], gap: spacing[3] },
    fieldLabel: { color: '#9ca3af', fontSize: fontSize.sm },
    required: { color: colors.goldLight },
    inputRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', paddingBottom: spacing[2] },
    rupeeSign: { color: colors.goldLight, fontSize: 28, fontWeight: '700', marginRight: spacing[2] },
    input: { flex: 1, color: colors.text, fontSize: 24, fontWeight: '700' },
    quickAmounts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
    quickBtn: { paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: 8, backgroundColor: '#202124', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    quickBtnActive: { backgroundColor: colors.goldLight, borderColor: 'rgba(212,175,55,0.6)' },
    quickText: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600' },
    quickTextActive: { color: colors.black },
    addCashBtn: { backgroundColor: '#cca84d', paddingVertical: spacing[2], borderRadius: 8, alignItems: 'center', marginTop: spacing[2] },
    addCashBtnText: { color: colors.black, fontWeight: '800', fontSize: fontSize.sm },
    noteBox: { backgroundColor: '#202124', borderRadius: 8, padding: spacing[3], borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    noteText: { color: '#9ca3af', fontSize: 11 },
    amountSummary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1a1a1a', borderRadius: borderRadius['2xl'], padding: spacing[4], borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    amountSummaryLabel: { color: '#9ca3af', fontSize: fontSize.sm },
    amountSummaryValue: { color: colors.text, fontSize: fontSize.lg, fontWeight: '800', marginTop: 2 },
    amountSummaryMinMax: { color: '#6b7280', fontSize: 11, marginTop: 4 },
    changeAmountBtn: { paddingHorizontal: spacing[4], paddingVertical: spacing[2], backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: borderRadius.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    changeAmountBtnText: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600' },
    paymentCard: { backgroundColor: '#202124', borderRadius: borderRadius['2xl'], padding: spacing[5], borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    paymentTitle: { color: colors.goldLight, fontSize: fontSize.lg, fontWeight: '700', marginBottom: spacing[4] },
    qrWrap: { alignItems: 'center', marginBottom: spacing[3] },
    qrImage: { width: 180, height: 180, backgroundColor: '#fff', borderRadius: 12 },
    qrHint: { color: '#9ca3af', fontSize: fontSize.sm, marginTop: spacing[2] },
    orRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginBottom: spacing[4] },
    orLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
    orText: { color: '#6b7280', fontSize: fontSize.sm },
    upiRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: borderRadius.xl, padding: spacing[4], borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: spacing[3] },
    upiLabel: { color: '#9ca3af', fontSize: fontSize.sm },
    upiValue: { color: colors.text, fontSize: fontSize.lg, fontFamily: 'monospace', marginTop: 2 },
    copyBtn: { paddingHorizontal: spacing[4], paddingVertical: spacing[2], backgroundColor: '#cca84d', borderRadius: borderRadius.lg },
    copyBtnText: { color: colors.black, fontWeight: '800', fontSize: fontSize.sm },
    submitBtn: { backgroundColor: '#cca84d', borderRadius: borderRadius['2xl'], paddingVertical: spacing[4], alignItems: 'center' },
    submitText: { color: colors.black, fontWeight: '800', fontSize: fontSize.base },
    instructionsBox: { backgroundColor: '#1a1a1a', borderRadius: borderRadius.xl, padding: spacing[4], borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    instructionsTitle: { color: '#fcd34d', fontWeight: '600', marginBottom: spacing[2] },
    instructionsItem: { color: '#9ca3af', fontSize: fontSize.sm, marginBottom: 4 },
    toast: { position: 'absolute', bottom: 100, alignSelf: 'center', backgroundColor: '#16a34a', paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderRadius: 999 },
    toastText: { color: '#fff', fontWeight: '600', fontSize: fontSize.sm },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: spacing[4] },
    modalCard: { backgroundColor: '#1a1a1a', borderRadius: borderRadius['2xl'], padding: spacing[6], width: '100%', maxWidth: 340, borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)' },
    modalIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(34,197,94,0.2)', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: spacing[4] },
    modalIcon: { fontSize: 36, color: '#22c55e', fontWeight: '700' },
    modalTitle: { color: colors.text, fontSize: fontSize.xl, fontWeight: '700', textAlign: 'center', marginBottom: spacing[2] },
    modalAmountBox: { backgroundColor: 'rgba(34,197,94,0.2)', borderRadius: borderRadius.xl, padding: spacing[4], marginBottom: spacing[4] },
    modalAmountLabel: { color: '#9ca3af', fontSize: fontSize.sm },
    modalAmountValue: { color: '#4ade80', fontSize: 24, fontWeight: '700', marginTop: 4 },
    modalSubtitle: { color: '#9ca3af', fontSize: fontSize.sm, textAlign: 'center', marginBottom: spacing[6] },
    modalBtn: { backgroundColor: '#16a34a', paddingVertical: spacing[3], borderRadius: borderRadius.xl, alignItems: 'center', marginBottom: spacing[2] },
    modalBtnText: { color: '#fff', fontWeight: '600' },
    modalBtnSecondary: { paddingVertical: spacing[3], borderRadius: borderRadius.xl, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)' },
    modalBtnSecondaryText: { color: colors.text, fontWeight: '500' },
});

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Alert, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../../hooks/useTranslation';
import { API_BASE_URL } from '../../config/api';
import { storage } from '../../utils/storage';
import { colors, spacing, borderRadius, fontSize } from '../../theme';
import { SkeletonForm } from '../../components/Skeleton';
import { haptics } from '../../utils/haptics';

const defaultForm = { accountHolderName: '', accountNumber: '', ifscCode: '', bankName: '', upiId: '' };

export default function Bank() {
    const navigation = useNavigation();
    const { t } = useTranslation();
    const [user, setUser] = useState(null);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState(defaultForm);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [fetchingBankName, setFetchingBankName] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState({ title: '', subtitle: '' });

    const userId = user?._id || user?.id;

    useEffect(() => {
        storage.getItem('user').then((raw) => {
            try { setUser(raw ? JSON.parse(raw) : null); } catch { setUser(null); }
        });
    }, []);

    const fetchBankAccounts = useCallback(async () => {
        if (!userId) return;
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE_URL}/bank-details?userId=${encodeURIComponent(userId)}`);
            const data = await res.json();
            if (data.success) setBankAccounts(data.data || []);
        } catch {
            setMessage({ type: 'error', text: t('funds.failedToFetchBankAccounts') });
        } finally {
            setLoading(false);
        }
    }, [userId, t]);

    useEffect(() => {
        if (userId) fetchBankAccounts();
        else setLoading(false);
    }, [userId, fetchBankAccounts]);

    const resetForm = () => {
        setForm(defaultForm);
        setEditingId(null);
        setShowForm(false);
    };

    const handleEdit = (acc) => {
        setForm({
            accountHolderName: acc.accountHolderName || '',
            accountNumber: acc.accountNumber || '',
            ifscCode: acc.ifscCode || '',
            bankName: acc.bankName || '',
            upiId: acc.upiId || '',
        });
        setEditingId(acc._id);
        setShowForm(true);
    };

    const fetchBankNameFromIFSC = async (ifscCode) => {
        const clean = (ifscCode || '').trim().toUpperCase();
        if (clean.length !== 11) return;
        setFetchingBankName(true);
        try {
            const res = await fetch(`https://ifsc.razorpay.com/${clean}`);
            if (res.ok) {
                const data = await res.json();
                if (data.BANK) setForm((prev) => ({ ...prev, bankName: data.BANK }));
            }
        } catch { /* ignore */ } finally {
            setFetchingBankName(false);
        }
    };

    const handleIFSCChange = (v) => {
        const val = v.toUpperCase();
        setForm((prev) => ({ ...prev, ifscCode: val }));
        if (val.length === 11) fetchBankNameFromIFSC(val);
        else if (val.length < 11) setForm((prev) => ({ ...prev, bankName: '' }));
    };

    const handleSubmit = async () => {
        haptics.medium();
        setMessage({ type: '', text: '' });
        if (!form.accountHolderName?.trim()) {
            setMessage({ type: 'error', text: t('funds.accountHolderNameRequired') });
            return;
        }
        if (!form.accountNumber?.trim() && !form.ifscCode?.trim() && !form.upiId?.trim()) {
            setMessage({ type: 'error', text: t('funds.accountNumberAndIFSCRequired') });
            return;
        }
        setSubmitting(true);
        try {
            const url = editingId ? `${API_BASE_URL}/bank-details/${editingId}` : `${API_BASE_URL}/bank-details`;
            const method = editingId ? 'PUT' : 'POST';
            const body = {
                userId,
                accountHolderName: form.accountHolderName.trim(),
                accountNumber: form.accountNumber?.trim() || '',
                ifscCode: form.ifscCode?.trim().toUpperCase() || '',
                bankName: form.bankName?.trim() || '',
                upiId: form.upiId?.trim() || '',
            };
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            const data = await res.json();
            if (data.success) {
                haptics.success();
                setSuccessMessage({
                    title: editingId ? t('funds.bankAccountUpdated') : t('funds.bankAccountAdded'),
                    subtitle: editingId ? t('funds.bankAccountUpdatedSubtitle') : t('funds.bankAccountAddedSubtitle'),
                });
                setShowSuccessModal(true);
                resetForm();
                fetchBankAccounts();
            } else {
                setMessage({ type: 'error', text: data.message || t('funds.failedToSave') });
            }
        } catch {
            setMessage({ type: 'error', text: t('funds.networkError') });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = (id) => {
        Alert.alert(
            t('funds.confirmDeleteBankAccount') || 'Delete this bank account?',
            '',
            [
                { text: t('common.cancel') || 'Cancel', style: 'cancel' },
                {
                    text: t('common.delete') || 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const res = await fetch(`${API_BASE_URL}/bank-details/${id}`, {
                                method: 'DELETE',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ userId }),
                            });
                            const data = await res.json();
                            if (data.success) {
                                setMessage({ type: 'success', text: t('funds.bankAccountDeleted') });
                                fetchBankAccounts();
                            } else setMessage({ type: 'error', text: data.message || t('funds.failedToDelete') });
                        } catch {
                            setMessage({ type: 'error', text: t('funds.networkError') });
                        }
                    },
                },
            ]
        );
    };

    const handleSetDefault = async (id) => {
        try {
            const res = await fetch(`${API_BASE_URL}/bank-details/${id}/set-default`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            });
            const data = await res.json();
            if (data.success) {
                setMessage({ type: 'success', text: t('funds.bankAccountSetAsDefault') });
                fetchBankAccounts();
            } else setMessage({ type: 'error', text: t('funds.failedToSetDefault') });
        } catch {
            setMessage({ type: 'error', text: t('funds.networkError') });
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>
                <View style={styles.headerTitleWrap}>
                    <Text style={styles.title}>{t('funds.bankDetails')}</Text>
                    <Text style={styles.subtitle}>{bankAccounts.length}/1 {t('funds.accountAdded')}</Text>
                </View>
                {bankAccounts.length < 1 && !showForm && (
                    <TouchableOpacity onPress={() => setShowForm(true)} style={styles.addBtn} activeOpacity={0.8}>
                        <Text style={styles.addBtnText}>+ {t('funds.addBankAccount')}</Text>
                    </TouchableOpacity>
                )}
            </View>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {message.text ? (
                    <View style={[styles.msgBox, message.type === 'success' ? styles.msgSuccess : styles.msgError]}>
                        <Text style={[styles.msgText, message.type === 'success' ? styles.msgSuccessText : styles.msgErrorText]}>{message.text}</Text>
                    </View>
                ) : null}

                {showForm && (
                    <View style={styles.formCard}>
                        <Text style={styles.formTitle}>{editingId ? t('funds.editBankAccount') : t('funds.addBankAccount')}</Text>
                        <View style={styles.field}>
                            <Text style={styles.fieldLabel}>{t('funds.accountHolderName')} *</Text>
                            <TextInput style={styles.input} value={form.accountHolderName} onChangeText={(v) => setForm((p) => ({ ...p, accountHolderName: v }))} placeholder={t('funds.nameAsPerBank')} placeholderTextColor="#6b7280" />
                        </View>
                        <View style={styles.field}>
                            <Text style={styles.fieldLabel}>{t('funds.accountNumber')}</Text>
                            <TextInput style={styles.input} value={form.accountNumber} onChangeText={(v) => setForm((p) => ({ ...p, accountNumber: v }))} placeholder={t('funds.enterAccountNumber')} placeholderTextColor="#6b7280" keyboardType="numeric" />
                        </View>
                        <View style={styles.field}>
                            <Text style={styles.fieldLabel}>{t('funds.ifscCode')}</Text>
                            <TextInput style={styles.input} value={form.ifscCode} onChangeText={handleIFSCChange} placeholder={t('funds.ifscPlaceholder')} placeholderTextColor="#6b7280" maxLength={11} autoCapitalize="characters" />
                            {fetchingBankName ? <Text style={styles.fetchingText}>{t('funds.fetchingBankName')}</Text> : null}
                        </View>
                        <View style={styles.field}>
                            <Text style={styles.fieldLabel}>{t('funds.bankName')}</Text>
                            <TextInput style={styles.input} value={form.bankName} onChangeText={(v) => setForm((p) => ({ ...p, bankName: v }))} placeholder={t('funds.bankNamePlaceholder')} placeholderTextColor="#6b7280" />
                        </View>
                        <View style={styles.field}>
                            <Text style={styles.fieldLabel}>{t('funds.upiId')} (optional)</Text>
                            <TextInput style={styles.input} value={form.upiId} onChangeText={(v) => setForm((p) => ({ ...p, upiId: v }))} placeholder="name@bank" placeholderTextColor="#6b7280" autoCapitalize="none" />
                        </View>
                        <View style={styles.formButtons}>
                            <TouchableOpacity onPress={resetForm} style={styles.cancelBtn} activeOpacity={0.8}>
                                <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleSubmit} style={[styles.saveBtn, submitting && { opacity: 0.6 }]} activeOpacity={0.8} disabled={submitting}>
                                {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>{editingId ? t('common.update') : t('funds.addAccount')}</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {loading ? (
                    <SkeletonForm fields={3} />
                ) : bankAccounts.length === 0 && !showForm ? (
                    <View style={styles.emptyWrap}>
                        <Text style={styles.emptyIcon}>🏦</Text>
                        <Text style={styles.emptyText}>{t('funds.noBankAccounts')}</Text>
                        <Text style={styles.emptySub}>{t('funds.addYourFirstBankAccount')}</Text>
                        <TouchableOpacity onPress={() => setShowForm(true)} style={styles.addBtnEmpty} activeOpacity={0.8}>
                            <Text style={styles.addBtnEmptyText}>+ {t('funds.addBankAccount')}</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.list}>
                        {bankAccounts.map((acc) => (
                            <View key={acc._id} style={[styles.accCard, acc.isDefault && styles.accCardDefault]}>
                                <View style={styles.accRow}>
                                    <View style={styles.accIconWrap}>
                                        <Text style={styles.accIcon}>🏦</Text>
                                    </View>
                                    <View style={styles.accInfo}>
                                        <View style={styles.accNameRow}>
                                            <Text style={styles.accName}>{acc.accountHolderName}</Text>
                                            {acc.isDefault && <View style={styles.defaultBadge}><Text style={styles.defaultBadgeText}>{t('funds.default')}</Text></View>}
                                        </View>
                                        {acc.bankName ? <Text style={styles.accBank}>{acc.bankName}</Text> : null}
                                        {acc.accountNumber ? <Text style={styles.accMeta}>{t('funds.accountNumber')}: ****{String(acc.accountNumber).slice(-4)} | {t('funds.ifscCode')}: {acc.ifscCode}</Text> : null}
                                        {acc.upiId ? <Text style={styles.accMeta}>UPI: {acc.upiId}</Text> : null}
                                    </View>
                                </View>
                                <View style={styles.accActions}>
                                    {!acc.isDefault && (
                                        <TouchableOpacity onPress={() => handleSetDefault(acc._id)} style={styles.accActionBtn} activeOpacity={0.8}>
                                            <Text style={[styles.accActionText, { color: '#fcd34d' }]}>{t('funds.setAsDefault')}</Text>
                                        </TouchableOpacity>
                                    )}
                                    <TouchableOpacity onPress={() => handleEdit(acc)} style={styles.accActionBtn} activeOpacity={0.8}>
                                        <Text style={[styles.accActionText, { color: '#93c5fd' }]}>{t('common.edit')}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => handleDelete(acc._id)} style={styles.accActionBtn} activeOpacity={0.8}>
                                        <Text style={[styles.accActionText, { color: '#fca5a5' }]}>{t('common.delete')}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>

            <Modal visible={showSuccessModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalIconWrap}>
                            <Text style={styles.modalIcon}>✓</Text>
                        </View>
                        <Text style={styles.modalTitle}>{successMessage.title}</Text>
                        <Text style={styles.modalSubtitle}>{successMessage.subtitle}</Text>
                        <TouchableOpacity onPress={() => setShowSuccessModal(false)} style={styles.modalBtn} activeOpacity={0.8}>
                            <Text style={styles.modalBtnText}>{t('common.done')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { setShowSuccessModal(false); navigation.navigate('WithdrawFund'); }} style={styles.modalBtnSecondary} activeOpacity={0.8}>
                            <Text style={styles.modalBtnSecondaryText}>{t('funds.goToWithdraw')}</Text>
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
    headerTitleWrap: { flex: 1 },
    title: { color: colors.text, fontSize: fontSize.xl, fontWeight: '700' },
    subtitle: { color: '#9ca3af', fontSize: fontSize.xs, marginTop: 2 },
    addBtn: { paddingHorizontal: spacing[3], paddingVertical: spacing[2], backgroundColor: '#2563eb', borderRadius: borderRadius.lg },
    addBtnText: { color: '#fff', fontSize: fontSize.sm, fontWeight: '600' },
    scroll: { padding: spacing[4], paddingBottom: 100 },
    msgBox: { padding: spacing[3], borderRadius: borderRadius.xl, borderWidth: 1, marginBottom: spacing[3] },
    msgSuccess: { backgroundColor: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.3)' },
    msgError: { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' },
    msgText: { fontSize: fontSize.sm },
    msgSuccessText: { color: '#86efac' },
    msgErrorText: { color: '#fca5a5' },
    formCard: { backgroundColor: '#1a1a1a', borderRadius: borderRadius.xl, padding: spacing[5], borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)', marginBottom: spacing[4] },
    formTitle: { color: colors.text, fontSize: fontSize.base, fontWeight: '600', marginBottom: spacing[4] },
    field: { marginBottom: spacing[3] },
    fieldLabel: { color: '#9ca3af', fontSize: fontSize.sm, marginBottom: 4 },
    input: { backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: borderRadius.lg, paddingHorizontal: spacing[4], paddingVertical: spacing[2], color: colors.text, fontSize: fontSize.base },
    fetchingText: { color: '#93c5fd', fontSize: 11, marginTop: 4 },
    formButtons: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[4] },
    cancelBtn: { flex: 1, paddingVertical: spacing[3], backgroundColor: '#374151', borderRadius: borderRadius.lg, alignItems: 'center' },
    cancelBtnText: { color: '#fff', fontWeight: '600' },
    saveBtn: { flex: 1, paddingVertical: spacing[3], backgroundColor: '#2563eb', borderRadius: borderRadius.lg, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontWeight: '600' },
    emptyWrap: { alignItems: 'center', paddingVertical: spacing[8] },
    emptyIcon: { fontSize: 48, marginBottom: spacing[2] },
    emptyText: { color: '#9ca3af', fontSize: fontSize.sm },
    emptySub: { color: '#6b7280', fontSize: fontSize.xs, marginTop: 4 },
    addBtnEmpty: { marginTop: spacing[4], paddingHorizontal: spacing[4], paddingVertical: spacing[2], backgroundColor: '#2563eb', borderRadius: borderRadius.lg },
    addBtnEmptyText: { color: '#fff', fontWeight: '600' },
    list: { gap: spacing[3] },
    accCard: { backgroundColor: '#1a1a1a', borderRadius: borderRadius.xl, padding: spacing[4], borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    accCardDefault: { borderColor: 'rgba(234,179,8,0.5)' },
    accRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3] },
    accIconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(59,130,246,0.2)', alignItems: 'center', justifyContent: 'center' },
    accIcon: { fontSize: 24 },
    accInfo: { flex: 1, minWidth: 0 },
    accNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    accName: { color: colors.text, fontWeight: '600', fontSize: fontSize.base },
    defaultBadge: { paddingHorizontal: 8, paddingVertical: 2, backgroundColor: 'rgba(234,179,8,0.3)', borderRadius: 999 },
    defaultBadgeText: { color: '#fcd34d', fontSize: 10, fontWeight: '600' },
    accBank: { color: '#9ca3af', fontSize: fontSize.sm, marginTop: 2 },
    accMeta: { color: '#6b7280', fontSize: 11, marginTop: 2 },
    accActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing[3], paddingTop: spacing[3], borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
    accActionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    accActionText: { fontSize: 12, fontWeight: '500' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: spacing[4] },
    modalCard: { backgroundColor: '#1a1a1a', borderRadius: borderRadius['2xl'], padding: spacing[6], width: '100%', maxWidth: 340, borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)' },
    modalIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(34,197,94,0.2)', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: spacing[4] },
    modalIcon: { fontSize: 36, color: '#22c55e', fontWeight: '700' },
    modalTitle: { color: colors.text, fontSize: fontSize.xl, fontWeight: '700', textAlign: 'center', marginBottom: spacing[2] },
    modalSubtitle: { color: '#9ca3af', fontSize: fontSize.sm, textAlign: 'center', marginBottom: spacing[6] },
    modalBtn: { backgroundColor: '#2563eb', paddingVertical: spacing[3], borderRadius: borderRadius.xl, alignItems: 'center', marginBottom: spacing[2] },
    modalBtnText: { color: '#fff', fontWeight: '600' },
    modalBtnSecondary: { paddingVertical: spacing[3], borderRadius: borderRadius.xl, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)' },
    modalBtnSecondaryText: { color: colors.text, fontWeight: '500' },
});

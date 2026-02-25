import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../../hooks/useTranslation';
import { API_BASE_URL } from '../../config/api';
import { storage } from '../../utils/storage';
import { colors, spacing, borderRadius, fontSize } from '../../theme';

export default function Bank() {
    const navigation = useNavigation();
    const { t } = useTranslation();
    const [user, setUser] = useState(null);
    const [form, setForm] = useState({ bankName: '', accountNumber: '', ifsc: '', accountHolderName: '', upiId: '' });
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(true);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        storage.getItem('user').then((raw) => {
            try { setUser(raw ? JSON.parse(raw) : null); } catch { setUser(null); }
        });
    }, []);

    const userId = user?._id || user?.id;

    useEffect(() => {
        if (!userId) { setFetchLoading(false); return; }
        fetch(`${API_BASE_URL}/payments/bank-details?userId=${encodeURIComponent(userId)}`)
            .then((r) => r.json())
            .then((data) => {
                if (data.success && data.data) {
                    setForm({
                        bankName: data.data.bankName || '',
                        accountNumber: data.data.accountNumber || '',
                        ifsc: data.data.ifsc || '',
                        accountHolderName: data.data.accountHolderName || '',
                        upiId: data.data.upiId || '',
                    });
                }
            })
            .catch(() => { })
            .finally(() => setFetchLoading(false));
    }, [userId]);

    const handleSave = async () => {
        if (!userId) { setMessage({ type: 'error', text: 'Login required' }); return; }
        setLoading(true);
        setMessage({ type: '', text: '' });
        try {
            const res = await fetch(`${API_BASE_URL}/payments/bank-details`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, ...form }),
            });
            const data = await res.json();
            if (data.success) {
                setMessage({ type: 'success', text: t('funds.bankDetailsSaved') || 'Bank details saved!' });
            } else {
                setMessage({ type: 'error', text: data.message || 'Failed to save bank details' });
            }
        } catch {
            setMessage({ type: 'error', text: 'Network error. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    const fields = [
        { key: 'accountHolderName', label: t('funds.accountHolderName') || 'Account Holder Name', placeholder: 'John Doe' },
        { key: 'bankName', label: t('funds.bankName') || 'Bank Name', placeholder: 'State Bank of India' },
        { key: 'accountNumber', label: t('funds.accountNumber') || 'Account Number', placeholder: '1234567890', keyboardType: 'numeric' },
        { key: 'ifsc', label: t('funds.ifscCode') || 'IFSC Code', placeholder: 'SBIN0000123', autoCapitalize: 'characters' },
        { key: 'upiId', label: t('funds.upiId') || 'UPI ID (optional)', placeholder: 'name@bank' },
    ];

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>
                <Text style={styles.title}>{t('funds.bankDetails')}</Text>
            </View>
            {fetchLoading ? (
                <View style={styles.centered}><ActivityIndicator size="large" color={colors.goldLight} /></View>
            ) : (
                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    <View style={styles.card}>
                        {fields.map((field) => (
                            <View key={field.key} style={styles.field}>
                                <Text style={styles.fieldLabel}>{field.label}</Text>
                                <TextInput
                                    style={styles.input}
                                    value={form[field.key]}
                                    onChangeText={(v) => setForm((prev) => ({ ...prev, [field.key]: v }))}
                                    placeholder={field.placeholder}
                                    placeholderTextColor="#6b7280"
                                    keyboardType={field.keyboardType || 'default'}
                                    autoCapitalize={field.autoCapitalize || 'words'}
                                />
                            </View>
                        ))}
                    </View>
                    {message.text ? (
                        <View style={[styles.msgBox, message.type === 'success' ? styles.msgSuccess : styles.msgError]}>
                            <Text style={[styles.msgText, message.type === 'success' ? styles.msgSuccessText : styles.msgErrorText]}>{message.text}</Text>
                        </View>
                    ) : null}
                    <TouchableOpacity onPress={handleSave} style={[styles.submitBtn, loading && { opacity: 0.6 }]} activeOpacity={0.8} disabled={loading}>
                        {loading ? <ActivityIndicator size="small" color={colors.text} /> : <Text style={styles.submitText}>{t('funds.saveDetails') || 'Save Details'}</Text>}
                    </TouchableOpacity>
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
    scroll: { padding: spacing[4], gap: spacing[4] },
    card: { backgroundColor: '#141416', borderRadius: borderRadius['2xl'], borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', padding: spacing[5], gap: spacing[4] },
    field: { gap: spacing[1] },
    fieldLabel: { color: '#9ca3af', fontSize: fontSize.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: { color: colors.text, fontSize: fontSize.base, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', paddingVertical: spacing[2] },
    msgBox: { padding: spacing[3], borderRadius: borderRadius.xl, borderWidth: 1 },
    msgSuccess: { backgroundColor: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.3)' },
    msgError: { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' },
    msgText: { fontSize: fontSize.sm },
    msgSuccessText: { color: '#86efac' },
    msgErrorText: { color: '#fca5a5' },
    submitBtn: { backgroundColor: '#3b82f6', borderRadius: borderRadius['2xl'], paddingVertical: spacing[4], alignItems: 'center' },
    submitText: { color: colors.text, fontWeight: '700', fontSize: fontSize.base },
});

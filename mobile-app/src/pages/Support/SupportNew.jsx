import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet,
  Platform, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../../hooks/useTranslation';
import { API_BASE_URL } from '../../config/api';
import { storage } from '../../utils/storage';
import { colors, spacing, borderRadius, fontSize } from '../../theme';

export default function SupportNew() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const userId = user?._id || user?.id;

  useEffect(() => {
    storage.getItem('user').then((raw) => {
      try { setUser(raw ? JSON.parse(raw) : null); } catch { setUser(null); }
    });
  }, []);

  const handleSubmit = async () => {
    if (!userId) {
      setMessage({ type: 'error', text: t('support.loginRequired') });
      return;
    }
    if (!description.trim()) {
      setMessage({ type: 'error', text: t('support.descriptionRequired') });
      return;
    }
    setMessage({ type: '', text: '' });
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('userId', userId);
      formData.append('subject', t('support.supportRequestDefault') || 'Support Request');
      formData.append('description', description.trim());

      const response = await fetch(`${API_BASE_URL}/help-desk/tickets`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: t('support.requestSent') });
        setDescription('');
      } else {
        setMessage({ type: 'error', text: data.message || t('support.somethingWentWrong') });
      }
    } catch {
      setMessage({ type: 'error', text: t('support.networkError') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>{t('support.title')}</Text>
          <Text style={styles.subtitle}>{t('support.subtitle')}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {!userId ? (
          <View style={styles.alertBox}>
            <Text style={styles.alertText}>{t('support.loginRequired')}</Text>
          </View>
        ) : (
          <>
            {/* Description */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>
                {t('support.descriptionLabel')} <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.textarea}
                value={description}
                onChangeText={setDescription}
                placeholder={t('support.descriptionPlaceholder')}
                placeholderTextColor="#6b7280"
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </View>

            {/* Note about screenshots - not supported in basic RN without file picker lib */}
            <View style={styles.noteBox}>
              <Text style={styles.noteText}>📸 {t('support.photosLabel')}: {t('support.noFileChosen')}</Text>
              <Text style={styles.noteSubtext}>Screenshot uploads require the full app. Please describe your issue in detail.</Text>
            </View>

            {/* Message */}
            {message.text ? (
              <View style={[styles.msgBox, message.type === 'success' ? styles.msgSuccess : styles.msgError]}>
                <Text style={[styles.msgText, message.type === 'success' ? styles.msgSuccessText : styles.msgErrorText]}>
                  {message.text}
                </Text>
              </View>
            ) : null}

            {/* Submit */}
            <TouchableOpacity onPress={handleSubmit} style={[styles.submitBtn, loading && { opacity: 0.6 }]} activeOpacity={0.8} disabled={loading}>
              {loading ? (
                <ActivityIndicator size="small" color={colors.black} />
              ) : (
                <Text style={styles.submitText}>{t('support.sendRequest')}</Text>
              )}
            </TouchableOpacity>

            {/* View tickets link */}
            <TouchableOpacity onPress={() => navigation.navigate('SupportStatus')} activeOpacity={0.8} style={styles.viewTicketsBtn}>
              <Text style={styles.viewTicketsText}>{t('support.viewTickets')}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingHorizontal: spacing[4], paddingTop: spacing[4], paddingBottom: spacing[3] },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  backIcon: { color: colors.text, fontSize: 20, fontWeight: '600' },
  title: { color: colors.text, fontSize: fontSize.lg, fontWeight: '700' },
  subtitle: { color: '#6b7280', fontSize: 11 },
  scroll: { padding: spacing[4], gap: spacing[4] },
  alertBox: { padding: spacing[4], borderRadius: borderRadius['2xl'], backgroundColor: 'rgba(245,158,11,0.1)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' },
  alertText: { color: '#fde68a', fontSize: fontSize.sm, textAlign: 'center' },
  field: { gap: spacing[2] },
  fieldLabel: { color: '#9ca3af', fontSize: fontSize.sm },
  required: { color: colors.goldLight },
  textarea: { backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: borderRadius.xl, color: colors.text, padding: spacing[3], fontSize: fontSize.sm, minHeight: 120 },
  noteBox: { padding: spacing[3], backgroundColor: '#1a1a1a', borderRadius: borderRadius.xl, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  noteText: { color: '#d1d5db', fontSize: fontSize.sm },
  noteSubtext: { color: '#6b7280', fontSize: 11, marginTop: 4 },
  msgBox: { padding: spacing[3], borderRadius: borderRadius.xl, borderWidth: 1 },
  msgSuccess: { backgroundColor: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.3)' },
  msgError: { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' },
  msgText: { fontSize: fontSize.sm },
  msgSuccessText: { color: '#86efac' },
  msgErrorText: { color: '#fca5a5' },
  submitBtn: { backgroundColor: colors.goldLight, borderRadius: borderRadius.xl, paddingVertical: spacing[3], alignItems: 'center', justifyContent: 'center' },
  submitText: { color: colors.black, fontWeight: '600', fontSize: fontSize.base },
  viewTicketsBtn: { alignItems: 'center', paddingVertical: spacing[3] },
  viewTicketsText: { color: colors.goldLight, fontSize: fontSize.sm, textDecorationLine: 'underline' },
});

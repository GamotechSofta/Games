import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet,
  KeyboardAvoidingView, Platform, Image, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from '../../hooks/useTranslation';
import { API_BASE_URL } from '../../config/api';
import { storage } from '../../utils/storage';
import { colors, spacing, borderRadius, fontSize } from '../../theme';
import { SkeletonForm } from '../../components/Skeleton';
import { haptics } from '../../utils/haptics';

export default function SupportNew() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [description, setDescription] = useState('');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const userId = user?._id || user?.id;

  const pickImages = async () => {
    haptics.light();
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        t('support.photosPermissionTitle') || 'Permission needed',
        t('support.photosPermissionMessage') || 'Please allow photo library access to attach screenshots.'
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 5,
    });
    if (!result.canceled && result.assets?.length) {
      setImages((prev) => {
        const combined = [...prev, ...result.assets.map((a) => ({ uri: a.uri, mimeType: a.mimeType || 'image/jpeg' }))];
        return combined.slice(0, 5);
      });
    }
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    storage.getItem('user').then((raw) => {
      try {
        setUser(raw ? JSON.parse(raw) : null);
      } catch {
        setUser(null);
      }
      setPageLoading(false);
    });
  }, []);

  const handleSubmit = async () => {
    haptics.medium();
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
      images.forEach((img, i) => {
        formData.append('screenshots', {
          uri: img.uri,
          name: `screenshot_${i}.jpg`,
          type: img.mimeType || 'image/jpeg',
        });
      });

      const response = await fetch(`${API_BASE_URL}/help-desk/tickets`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (data.success) {
        haptics.success();
        setMessage({ type: 'success', text: t('support.requestSent') });
        setDescription('');
        setImages([]);
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
      {/* Header - match frontend: rounded-full back, title + subtitle */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => { haptics.light(); navigation.goBack(); }}
          style={styles.backBtn}
          activeOpacity={0.95}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>{t('support.title')}</Text>
          <Text style={styles.subtitle}>{t('support.subtitle')}</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {pageLoading ? (
            <View style={styles.skeletonWrap}>
              <View style={styles.skeletonBlock}>
                <SkeletonForm fields={2} />
              </View>
              <View style={styles.skeletonBlock}>
                <SkeletonForm fields={2} />
              </View>
              <View style={[styles.skeletonBlock, { marginBottom: 16 }]}>
                <SkeletonForm fields={1} />
              </View>
              <View style={{ height: 48, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12 }} />
            </View>
          ) : !userId ? (
            <View style={styles.alertBox}>
              <Text style={styles.alertText}>{t('support.loginRequired')}</Text>
            </View>
          ) : (
            <>
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
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>
                  {t('support.photosLabel')}
                </Text>
                <View style={styles.photosRow}>
                  <TouchableOpacity onPress={pickImages} style={styles.chooseFilesBtn} activeOpacity={0.8}>
                    <Text style={styles.chooseFilesBtnText}>{t('support.chooseFiles')}</Text>
                  </TouchableOpacity>
                  <Text style={styles.photosHint}>
                    {images.length > 0 ? t('support.photosAdded', { count: images.length }) : t('support.noFileChosen')}
                  </Text>
                </View>
                {images.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbnailsWrap} contentContainerStyle={styles.thumbnailsContent}>
                    {images.map((img, index) => (
                      <View key={index} style={styles.thumbWrap}>
                        <Image source={{ uri: img.uri }} style={styles.thumb} />
                        <TouchableOpacity style={styles.thumbRemove} onPress={() => removeImage(index)} hitSlop={8}>
                          <Text style={styles.thumbRemoveText}>×</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                ) : null}
                <Text style={styles.photosNote}>{t('support.noteSubtext')}</Text>
              </View>

              {message.text ? (
                <View style={[styles.msgBox, message.type === 'success' ? styles.msgSuccess : styles.msgError]}>
                  <Text style={[styles.msgText, message.type === 'success' ? styles.msgSuccessText : styles.msgErrorText]}>
                    {message.text}
                  </Text>
                </View>
              ) : null}

              <TouchableOpacity
                onPress={handleSubmit}
                style={[styles.submitBtn, loading && { opacity: 0.5 }]}
                activeOpacity={0.8}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={colors.black} />
                ) : (
                  <Text style={styles.submitText}>{t('support.sendRequest')}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigation.navigate('SupportStatus')}
                activeOpacity={0.8}
                style={styles.viewTicketsBtn}
              >
                <Text style={styles.viewTicketsText}>{t('support.viewTickets')}</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[4],
    marginBottom: spacing[2],
  },
  backBtn: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { color: colors.text, fontSize: 20, fontWeight: '600' },
  headerTextWrap: { flex: 1 },
  title: { color: colors.text, fontSize: fontSize.lg, fontWeight: '700' },
  subtitle: { color: '#6b7280', fontSize: 12 },
  scroll: { padding: spacing[4], paddingBottom: 100, gap: spacing[4] },
  skeletonWrap: { gap: spacing[4] },
  skeletonBlock: {
    borderRadius: 16,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: spacing[4],
  },
  alertBox: {
    padding: spacing[4],
    borderRadius: 16,
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
  },
  alertText: { color: '#fde68a', fontSize: fontSize.sm, textAlign: 'center' },
  field: { gap: 6 },
  fieldLabel: { color: '#9ca3af', fontSize: fontSize.sm },
  required: { color: colors.goldLight },
  textarea: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    color: colors.text,
    padding: spacing[3],
    fontSize: fontSize.sm,
    minHeight: 100,
  },
  photosRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  chooseFilesBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: colors.amber },
  chooseFilesBtnText: { color: colors.black, fontWeight: '600', fontSize: fontSize.sm },
  photosHint: { color: '#6b7280', fontSize: fontSize.sm },
  thumbnailsWrap: { marginTop: 8, maxHeight: 80 },
  thumbnailsContent: { gap: 8, paddingRight: 8 },
  thumbWrap: { position: 'relative', width: 64, height: 64, borderRadius: 8, overflow: 'hidden' },
  thumb: { width: 64, height: 64, borderRadius: 8, backgroundColor: '#1a1a1a' },
  thumbRemove: { position: 'absolute', top: 2, right: 2, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' },
  thumbRemoveText: { color: '#fff', fontSize: 16, fontWeight: '700', lineHeight: 18 },
  photosNote: { color: '#6b7280', fontSize: 11, marginTop: 4 },
  msgBox: { padding: spacing[3], borderRadius: 12, borderWidth: 1 },
  msgSuccess: { backgroundColor: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.3)' },
  msgError: { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' },
  msgText: { fontSize: fontSize.sm },
  msgSuccessText: { color: '#86efac' },
  msgErrorText: { color: '#fca5a5' },
  submitBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: { color: colors.black, fontWeight: '600', fontSize: fontSize.base },
  viewTicketsBtn: { alignItems: 'center', paddingVertical: spacing[3] },
  viewTicketsText: { color: colors.goldLight, fontSize: fontSize.sm, textDecorationLine: 'underline' },
});

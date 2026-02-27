import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../hooks/useTranslation';
import { colors, spacing, borderRadius, fontSize } from '../theme';

export default function Download() {
  const navigation = useNavigation();
  const { t } = useTranslation();

  const handleDownload = () => {
    // Replace with actual APK URL when available
    Linking.canOpenURL('https://play.google.com/store').then((supported) => {
      if (supported) {
        Linking.openURL('https://play.google.com/store');
      }
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('download.title')}</Text>
      </View>

      <View style={styles.content}>
        {/* App icon */}
        <View style={styles.appIconWrap}>
          <Text style={styles.appIcon}>📱</Text>
        </View>

        <Text style={styles.heading}>{t('download.heading')}</Text>
        <Text style={styles.subheading}>{t('download.subheading')}</Text>

        <TouchableOpacity onPress={handleDownload} style={styles.downloadBtn} activeOpacity={0.85}>
          <Text style={styles.downloadIcon}>⬇</Text>
          <Text style={styles.downloadText}>{t('download.downloadNow')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingHorizontal: spacing[4], paddingTop: spacing[4], paddingBottom: spacing[3] },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  backIcon: { color: colors.text, fontSize: 20, fontWeight: '600' },
  title: { color: colors.text, fontSize: fontSize.xl, fontWeight: '700' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[8], gap: spacing[6] },
  appIconWrap: { width: 100, height: 100, borderRadius: 24, backgroundColor: 'rgba(212,175,55,0.15)', borderWidth: 1, borderColor: 'rgba(212,175,55,0.3)', alignItems: 'center', justifyContent: 'center' },
  appIcon: { fontSize: 52 },
  heading: { color: colors.text, fontSize: fontSize['2xl'], fontWeight: '700', textAlign: 'center' },
  subheading: { color: '#9ca3af', fontSize: fontSize.base, textAlign: 'center', lineHeight: 24 },
  downloadBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], backgroundColor: colors.goldLight, borderRadius: borderRadius['2xl'], paddingVertical: spacing[4], paddingHorizontal: spacing[8] },
  downloadIcon: { color: colors.black, fontSize: 18 },
  downloadText: { color: colors.black, fontWeight: '700', fontSize: fontSize.lg },
});

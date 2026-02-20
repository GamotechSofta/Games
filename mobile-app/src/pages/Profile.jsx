import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from '../hooks/useTranslation';
import { clearUserAuth } from '../utils/auth';

export default function Profile() {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{t('profile.title')}</Text>
      <TouchableOpacity style={styles.logoutBtn} onPress={() => clearUserAuth()}>
        <Text style={styles.logoutText}>{t('header.logout')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  text: { color: '#fff', fontSize: 18, marginBottom: 16 },
  logoutBtn: { backgroundColor: '#ef4444', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  logoutText: { color: '#fff', fontWeight: '600' },
});

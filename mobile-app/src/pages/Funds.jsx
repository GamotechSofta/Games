import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from '../hooks/useTranslation';
import { haptics } from '../utils/haptics';
import { colors, spacing, borderRadius, fontSize } from '../theme';

// Match frontend Funds.jsx: same order, colors, title/subtitle keys
const FUND_ITEMS = (t) => [
  { key: 'add-fund', icon: '₹', title: t('funds.addFund'), subtitle: t('funds.addFundSubtitle'), color: '#34a853', nav: 'AddFund' },
  { key: 'withdraw-fund', icon: '↓', title: t('funds.withdrawFund'), subtitle: t('funds.withdrawFundSubtitle'), color: '#ef4444', nav: 'WithdrawFund' },
  { key: 'bank-detail', icon: '🏦', title: t('funds.bankDetail'), subtitle: t('funds.bankDetailSubtitle'), color: '#3b82f6', nav: 'Bank' },
  { key: 'add-fund-history', icon: '📋', title: t('funds.addFundHistory'), subtitle: t('funds.addFundHistorySubtitle'), color: '#1e3a8a', nav: 'AddFundHistory' },
  { key: 'withdraw-fund-history', icon: '🕐', title: t('funds.withdrawFundHistory'), subtitle: t('funds.withdrawFundHistorySubtitle'), color: '#f59e0b', nav: 'WithdrawFundHistory' },
];

export default function Funds() {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useTranslation();
  const items = FUND_ITEMS(t);

  // Support direct navigation with initial tab param (e.g., from profile quick actions)
  const initialTab = route.params?.tab;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { haptics.light(); navigation.navigate('Home'); }} style={styles.backBtn} activeOpacity={0.8}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('funds.fundsTitle')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false} removeClippedSubviews={true}>
        <View style={styles.grid}>
          {items.map((item) => (
            <TouchableOpacity
              key={item.key}
              onPress={() => { haptics.light(); navigation.navigate(item.nav); }}
              style={styles.card}
              activeOpacity={0.85}
            >
              <View style={[styles.iconWrap, { backgroundColor: item.color }]}>
                <Text style={styles.iconText}>{item.icon}</Text>
              </View>
              <Text style={styles.cardLabel} numberOfLines={1}>{item.title}</Text>
              {item.subtitle ? <Text style={styles.cardSubtitle} numberOfLines={1}>{item.subtitle}</Text> : null}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingHorizontal: spacing[4], paddingTop: spacing[4], paddingBottom: spacing[3] },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  backIcon: { color: colors.text, fontSize: 20, fontWeight: '600' },
  title: { color: colors.text, fontSize: fontSize.xl, fontWeight: '700', flex: 1 },
  list: { paddingHorizontal: spacing[4], paddingBottom: 100 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing[2], rowGap: spacing[2] },
  card: { width: '48%', backgroundColor: '#202124', borderRadius: borderRadius['2xl'], borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: spacing[3], minHeight: 88 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: spacing[2] },
  iconText: { fontSize: 22, color: '#000', fontWeight: '700' },
  cardLabel: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600' },
  cardSubtitle: { color: '#9ca3af', fontSize: 11, marginTop: 2 },
});

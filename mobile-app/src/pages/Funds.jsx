import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from '../hooks/useTranslation';
import { colors, spacing, borderRadius, fontSize } from '../theme';

const FUND_ITEMS = (t) => [
  { key: 'add-fund', icon: '₹', label: t('funds.addFund'), subtitle: t('funds.addFundSubtitle'), iconColor: '#10b981', nav: 'AddFund' },
  { key: 'withdraw-fund', icon: '↓', label: t('funds.withdrawFund'), subtitle: t('funds.withdrawFundSubtitle'), iconColor: '#ef4444', nav: 'WithdrawFund' },
  { key: 'bank-detail', icon: '🏦', label: t('funds.bankDetail'), subtitle: t('funds.bankDetailSubtitle'), iconColor: '#3b82f6', nav: 'Bank' },
  { key: 'add-fund-history', icon: '📋', label: t('funds.addFundHistory'), subtitle: t('funds.addFundHistorySubtitle'), iconColor: '#6366f1', nav: 'AddFundHistory' },
  { key: 'withdraw-fund-history', icon: '🕐', label: t('funds.withdrawFundHistory'), subtitle: t('funds.withdrawFundHistorySubtitle'), iconColor: '#f59e0b', nav: 'WithdrawFundHistory' },
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
        <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.backBtn} activeOpacity={0.8}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('funds.fundsTitle')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false} removeClippedSubviews={true}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.key}
            onPress={() => navigation.navigate(item.nav)}
            style={styles.card}
            activeOpacity={0.85}
          >
            <View style={[styles.iconWrap, { backgroundColor: `${item.iconColor}20` }]}>
              <Text style={[styles.iconText, { color: item.iconColor }]}>{item.icon}</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardLabel}>{item.label}</Text>
              {item.subtitle ? <Text style={styles.cardSubtitle}>{item.subtitle}</Text> : null}
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))}
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
  list: { paddingHorizontal: spacing[4], gap: spacing[3], paddingBottom: 100 },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing[4], backgroundColor: '#141416', borderRadius: borderRadius['2xl'], borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', padding: spacing[4] },
  iconWrap: { width: 52, height: 52, borderRadius: borderRadius['2xl'], alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  iconText: { fontSize: 24, fontWeight: '700' },
  cardContent: { flex: 1 },
  cardLabel: { color: colors.text, fontSize: fontSize.base, fontWeight: '600' },
  cardSubtitle: { color: '#9ca3af', fontSize: fontSize.xs, marginTop: 3 },
  chevron: { color: '#6b7280', fontSize: 24, fontWeight: '300' },
});

import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../hooks/useTranslation';
import { colors, spacing, borderRadius, fontSize } from '../theme';

export default function Bids() {
  const navigation = useNavigation();
  const { t } = useTranslation();

  const items = [
    { icon: '📋', label: t('bids.betHistory'), subtitle: t('bids.betHistorySubtitle'), iconColor: '#f3b61b', nav: 'BetHistory' },
    { icon: '🏆', label: t('bids.gameResults'), subtitle: t('bids.gameResultsSubtitle'), iconColor: '#25d366', nav: 'MarketResultHistory' },
    { icon: '⭐', label: t('bids.starlineBetHistory'), subtitle: t('bids.starlineBetHistorySubtitle'), iconColor: '#ef4444', nav: 'StarlineBetHistory' },
    { icon: '👑', label: t('bids.kingBazaarBetHistory'), subtitle: t('bids.kingBazaarBetHistorySubtitle'), iconColor: '#3b82f6', nav: 'KingBazaarBetHistory' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.backBtn} activeOpacity={0.8}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('bids.myBets')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.nav}
            onPress={() => navigation.navigate(item.nav)}
            style={styles.card}
            activeOpacity={0.85}
          >
            <View style={[styles.iconWrap, { backgroundColor: `${item.iconColor}20` }]}>
              <Text style={styles.iconText}>{item.icon}</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardLabel}>{item.label}</Text>
              {item.subtitle ? <Text style={styles.cardSubtitle} numberOfLines={1}>{item.subtitle}</Text> : null}
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
  iconText: { fontSize: 26 },
  cardContent: { flex: 1 },
  cardLabel: { color: colors.text, fontSize: fontSize.base, fontWeight: '600' },
  cardSubtitle: { color: '#9ca3af', fontSize: fontSize.xs, marginTop: 3 },
  chevron: { color: '#6b7280', fontSize: 24, fontWeight: '300' },
});

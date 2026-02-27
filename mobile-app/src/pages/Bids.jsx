import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../hooks/useTranslation';
import { haptics } from '../utils/haptics';
import { colors, spacing, borderRadius, fontSize } from '../theme';

export default function Bids() {
  const navigation = useNavigation();
  const { t } = useTranslation();

  // Match frontend Bids.jsx: same order, colors, title/subtitle keys
  const items = [
    { icon: '📋', title: t('bids.betHistory'), subtitle: t('bids.betHistorySubtitle'), color: '#f3b61b', nav: 'BetHistory' },
    { icon: '🏆', title: t('bids.gameResults'), subtitle: t('bids.gameResultsSubtitle'), color: '#25d366', nav: 'MarketResultHistory' },
    { icon: '⭐', title: t('bids.starlineBetHistory'), subtitle: t('bids.starlineBetHistorySubtitle'), color: '#ef4444', nav: 'StarlineBetHistory' },
    { icon: '👑', title: t('bids.kingBazaarBetHistory'), subtitle: t('bids.kingBazaarBetHistorySubtitle'), color: '#3b82f6', nav: 'KingBazaarBetHistory' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { haptics.light(); navigation.navigate('Home'); }} style={styles.backBtn} activeOpacity={0.8}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('bids.myBets')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {items.map((item) => (
            <TouchableOpacity
              key={item.nav}
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
  iconText: { fontSize: 20, color: '#000' },
  cardLabel: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600' },
  cardSubtitle: { color: '#9ca3af', fontSize: 11, marginTop: 2 },
});

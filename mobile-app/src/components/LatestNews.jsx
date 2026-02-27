import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from '../hooks/useTranslation';
import { colors, spacing, fontSize } from '../theme';

const NEWS = [
  { text: 'Congratulations to Ishana M. for winning ₹511!', icon: '🏆', amount: '₹511' },
  { text: 'Pallavi S. just won ₹701 - Amazing!', icon: '⭐', amount: '₹701' },
  { text: 'Aadi K. hit the jackpot with ₹1004!', icon: '💎', amount: '₹1004' },
  { text: 'New game results are out - Check now!', icon: '📢', amount: null },
];

// Match frontend mobile: bg gradient from-[#0a0e14] via-[#0f1419] to-[#0a0e14], border-t yellow-500/30, h-7 min-[375px]:h-8
// Label: from-[#1a2332] to-[#1f2a3a], border-r yellow-500/30, video icon + "Latest News"
// Items: icon circle (from-yellow-500/20 to-yellow-600/10 border yellow-500/30), text, amount, separator dot (w-1.5 h-1.5 bg-yellow-500/60)
export default function LatestNews() {
  const { t } = useTranslation();
  const items = [...NEWS, ...NEWS, ...NEWS];
  return (
    <View style={styles.container}>
      <View style={styles.label}>
        <Text style={styles.videoIcon}>▶</Text>
        <Text style={styles.labelText}>{t('home.latestNews')}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {items.map((item, i) => (
          <View key={i} style={styles.item}>
            <View style={styles.iconWrap}>
              <Text style={styles.itemIcon}>{item.icon}</Text>
            </View>
            <Text style={styles.itemText} numberOfLines={1}>{item.text}</Text>
            {item.amount && <Text style={styles.amount}>{item.amount}</Text>}
            <View style={styles.dot} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#0a0e14',
    borderTopWidth: 1,
    borderTopColor: 'rgba(234,179,8,0.3)',
    alignItems: 'center',
    height: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  label: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceSubHeader,
    paddingHorizontal: spacing[2],
    height: '100%',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(234,179,8,0.3)',
  },
  videoIcon: { color: colors.goldText, fontSize: 14 },
  labelText: {
    color: colors.goldText,
    fontWeight: '700',
    fontSize: fontSize['10px'],
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  scroll: { flex: 1 },
  scrollContent: { alignItems: 'center' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    gap: spacing[2],
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(234,179,8,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(234,179,8,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemIcon: { fontSize: 14 },
  itemText: { color: colors.text, fontSize: fontSize.xs, maxWidth: 180, fontWeight: '600' },
  amount: { color: colors.goldText, fontWeight: '700', fontSize: fontSize.xs },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(234,179,8,0.6)',
  },
});

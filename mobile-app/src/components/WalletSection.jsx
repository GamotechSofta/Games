import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useTranslation } from '../hooks/useTranslation';
import BannersSection from './BannersSection';
import CasinoGamesCard from './CasinoGamesCard';
import SkillsGamesCard from './SkillsGamesCard';
import StarlineCard from './StarlineCard';
import KingBazaarCard from './KingBazaarCard';
import { colors } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_MIN_375 = SCREEN_WIDTH >= 375;

// Exact same as frontend Other Games: "flex items-center justify-center mt-4 min-[375px]:mt-5 mb-4 min-[375px]:mb-5 gap-1 min-[375px]:gap-2"
// "flex-1 h-[2px] bg-white" lines, "gap-2" title row, "text-sm min-[375px]:text-base font-bold tracking-[0.15em] uppercase"
// Grid: "gap-2 min-[375px]:gap-3 max-w-lg mx-auto"
export default function WalletSection() {
  const { t } = useTranslation();
  const headerGap = IS_MIN_375 ? 8 : 4;
  const headerMt = IS_MIN_375 ? 20 : 16;
  const headerMb = IS_MIN_375 ? 20 : 16;
  const titleSize = IS_MIN_375 ? 16 : 14;
  const gridGap = IS_MIN_375 ? 12 : 8;

  return (
    <View style={styles.container}>
      <BannersSection />
      <View style={[styles.otherGamesHeader, { marginTop: headerMt, marginBottom: headerMb, gap: headerGap }]}>
        <View style={styles.line} />
        <View style={styles.titleRow}>
          <Text style={styles.star}>★</Text>
          <Text style={[styles.title, { fontSize: titleSize }]}>{t('games.otherGames').toUpperCase()}</Text>
          <Text style={styles.star}>★</Text>
        </View>
        <View style={styles.line} />
      </View>
      <View style={styles.grid}>
        <View style={[styles.gridRow, { gap: gridGap, marginBottom: gridGap }]}>
          <CasinoGamesCard />
          <SkillsGamesCard />
        </View>
        <View style={[styles.gridRow, { gap: gridGap }]}>
          <StarlineCard />
          <KingBazaarCard />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: colors.black,
    paddingTop: 6,
    paddingBottom: 4,
    paddingHorizontal: IS_MIN_375 ? 16 : 8, // px-2 min-[375px]:px-4
    maxWidth: '100%',
  },
  otherGamesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 512,
    alignSelf: 'center',
  },
  line: { flex: 1, height: 2, backgroundColor: colors.text, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  star: { color: colors.text, fontSize: 10, width: 10, height: 10, textAlign: 'center', lineHeight: 10 },
  title: {
    color: colors.text,
    fontWeight: '700',
    letterSpacing: 2.4,
  },
  grid: {
    maxWidth: 512,
    alignSelf: 'center',
    width: '100%',
  },
  gridRow: {
    flexDirection: 'row',
  },
});

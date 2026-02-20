import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import WalletSection from '../components/WalletSection';
import GamesSection from '../components/GamesSection';
import LatestNews from '../components/LatestNews';
import Section1 from '../components/Section1';
import { colors } from '../theme';

// Match frontend mobile: WalletSection (banners + 2 cards) → GamesSection → LatestNews → Section1. HeroSection hidden on mobile (md:block).
export default function Home() {
  const insets = useSafeAreaInsets();
  const bottomPad = 80 + Math.max(insets.bottom, 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPad }]}
      showsVerticalScrollIndicator={false}
    >
      <WalletSection />
      <GamesSection />
      <LatestNews />
      <Section1 />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, paddingTop: 4 },
});

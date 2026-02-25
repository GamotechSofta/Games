import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import WalletSection from '../components/WalletSection';
import Section1 from '../components/Section1';
import { colors } from '../theme';

// Exact match to frontend Home: WalletSection (banners + Other Games + 4 cards) → Section1 (Markets). No HeroSection on mobile; no GamesSection/LatestNews.
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
      <Section1 />
    </ScrollView>
  );
}

// Exact frontend mobile: min-h-screen bg-[#0a0a0a] overflow-x-hidden
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, width: '100%' },
  content: { flexGrow: 1 },
});

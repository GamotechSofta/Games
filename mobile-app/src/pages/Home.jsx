import React, { useState, useCallback } from 'react';
import { ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import WalletSection from '../components/WalletSection';
import Section1 from '../components/Section1';
import { colors } from '../theme';

// Exact match to frontend Home: WalletSection (banners + Other Games + 4 cards) → Section1 (Markets). No HeroSection on mobile; no GamesSection/LatestNews.
function Home() {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 0);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // This will trigger re-fetch in Section1 if we use a key or callback
    setRefreshKey(k => k + 1);
    // We'll give it a bit of time or handle completion via some mechanism
    // But since Section1 handles its own fetch, we just need to wait a bit or let it happen
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPad }]}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews={true}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.goldLight]}
          tintColor={colors.goldLight}
        />
      }
    >
      <WalletSection />
      <Section1 refreshKey={refreshKey} />
    </ScrollView>
  );
}
export default React.memo(Home);

// Exact frontend mobile: min-h-screen bg-[#0a0a0a] overflow-x-hidden
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, width: '100%' },
  content: { flexGrow: 1 },
});

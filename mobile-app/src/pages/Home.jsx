import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '../hooks/useTranslation';
import WalletSection from '../components/WalletSection';
import Section1 from '../components/Section1';
import { colors } from '../theme';

// Exact match to frontend Home: WalletSection (banners + Other Games + 4 cards) → Section1 (Markets).
// useTranslation() so Home re-renders on language change → header + Casino/Skills cards update
function Home() {
  useTranslation(); // subscribe to language so this screen re-renders when language changes
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshKey(k => k + 1);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  return (
    <View style={styles.container}>
      <Section1
        refreshKey={refreshKey}
        ListHeaderComponent={<WalletSection />}
        onRefresh={onRefresh}
        refreshing={refreshing}
      />
    </View>
  );
}
export default Home;

// Exact frontend mobile: min-h-screen bg-[#0a0a0a] overflow-x-hidden
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, width: '100%' },
  content: { flexGrow: 1 },
});

import React from 'react';
import { View, StyleSheet } from 'react-native';
import BannersSection from './BannersSection';
import StarlineCard from './StarlineCard';
import KingBazaarCard from './KingBazaarCard';
import { colors, spacing } from '../theme';

// Match frontend: w-full bg-black pt-1.5 pb-1 sm:pb-3 sm:pt-4 px-2 min-[375px]:px-4 sm:px-6, grid mt-4 min-[375px]:mt-5 sm:mt-6 gap-2 min-[375px]:gap-3 sm:gap-4 max-w-lg mx-auto
export default function WalletSection() {
  return (
    <View style={styles.container}>
      <BannersSection />
      <View style={styles.grid}>
        <StarlineCard />
        <KingBazaarCard />
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
    paddingHorizontal: spacing[2],
    maxWidth: '100%',
  },
  grid: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[4],
    maxWidth: 512,
    alignSelf: 'center',
    width: '100%',
  },
});

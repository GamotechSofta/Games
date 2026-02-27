import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors, spacing, borderRadius } from '../theme';

/**
 * YouTube-style shimmer skeleton. Use for loading states where backend data is fetched.
 */
export function SkeletonBox({ width, height, flex, style }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.6, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.box,
        width != null && { width: typeof width === 'number' ? width : width },
        height != null && { height: typeof height === 'number' ? height : height },
        flex != null && { flex },
        { opacity },
        style,
      ]}
    />
  );
}

/** Skeleton for a list card (e.g. bet card, deposit card) */
export function SkeletonCard({ style }) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.cardRow}>
        <SkeletonBox width={24} height={10} />
        <SkeletonBox width={40} height={10} />
      </View>
      <SkeletonBox width="60%" height={10} style={{ marginTop: 6 }} />
      <SkeletonBox width="90%" height={10} style={{ marginTop: 6 }} />
      <SkeletonBox width="70%" height={10} style={{ marginTop: 6 }} />
      <SkeletonBox width={50} height={10} style={{ marginTop: 8 }} />
    </View>
  );
}

/** Skeleton for table row (e.g. Game Rate row) */
export function SkeletonRow({ style }) {
  return (
    <View style={[styles.row, style]}>
      <SkeletonBox width={32} height={14} />
      <SkeletonBox flex={1} height={14} style={{ marginHorizontal: 8 }} />
      <SkeletonBox width={48} height={14} />
    </View>
  );
}

/** Skeleton for fund history card (deposit/withdrawal) */
export function SkeletonFundCard({ style }) {
  return (
    <View style={[styles.fundCard, style]}>
      <View style={styles.cardRow}>
        <SkeletonBox width={80} height={14} />
        <SkeletonBox width={50} height={10} />
      </View>
      <SkeletonBox width="50%" height={10} style={{ marginTop: 8 }} />
    </View>
  );
}

/** Skeleton for a list item (single line or few lines) */
export function SkeletonListItem({ lines = 2, style }) {
  return (
    <View style={[styles.listItem, style]}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBox
          key={i}
          width={i === lines - 1 && lines > 1 ? '60%' : '100%'}
          height={12}
          style={{ marginTop: i === 0 ? 0 : 6 }}
        />
      ))}
    </View>
  );
}

/** Skeleton for form fields (e.g. Bank form) */
export function SkeletonForm({ fields = 5, style }) {
  return (
    <View style={[styles.form, style]}>
      {Array.from({ length: fields }).map((_, i) => (
        <View key={i} style={styles.formField}>
          <SkeletonBox width={80} height={10} />
          <SkeletonBox width="100%" height={40} style={{ marginTop: 6 }} />
        </View>
      ))}
    </View>
  );
}

/** Grid of skeleton cards (e.g. Bet History 2-col) */
export function SkeletonCardGrid({ count = 6, columns = 2 }) {
  const rows = [];
  for (let r = 0; r < count; r += columns) {
    rows.push(Array.from({ length: columns }, (_, c) => r + c));
  }
  return (
    <View style={styles.gridWrap}>
      {rows.map((row, ri) => (
        <View key={ri} style={styles.gridRow}>
          {row.map((i) => (
            <View key={i} style={styles.gridCell}>
              <SkeletonCard />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

/** Simple list of skeleton lines (e.g. notifications) */
export function SkeletonList({ count = 8, style }) {
  return (
    <View style={[styles.skeletonList, style]}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonListItem key={i} lines={i % 2 === 0 ? 2 : 1} style={i > 0 ? { marginTop: spacing[3] } : undefined} />
      ))}
    </View>
  );
}

/** Skeleton for Home MARKETS section card (status bar + clock, time, name, result, footer) */
export function SkeletonMarketCard({ style }) {
  return (
    <View style={[styles.marketCardSkeleton, style]}>
      <SkeletonBox width="100%" height={28} style={{ borderTopLeftRadius: 8, borderTopRightRadius: 8 }} />
      <View style={styles.marketCardSkeletonContent}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 }}>
          <SkeletonBox width={14} height={14} />
          <SkeletonBox width={70} height={12} />
        </View>
        <SkeletonBox width="90%" height={14} style={{ marginBottom: 8 }} />
        <SkeletonBox width="60%" height={18} style={{ marginBottom: 8 }} />
        <SkeletonBox width={40} height={10} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

/** 2-column grid of market card skeletons for Home MARKETS section (YouTube-style, multiple rows) */
export function SkeletonMarketGrid({ count = 8, gap = 12, style }) {
  const rows = [];
  for (let r = 0; r < count; r += 2) {
    rows.push([r, r + 1].filter((i) => i < count));
  }
  return (
    <View style={[styles.marketGridWrap, { gap }, style]}>
      {rows.map((row, ri) => (
        <View key={ri} style={styles.marketGridRow}>
          {row.map((i) => (
            <View key={i} style={styles.marketGridCell}>
              <SkeletonMarketCard />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

/** Skeleton for slot card (King Bazaar / Starline market list row) */
export function SkeletonSlotCard({ style }) {
  return (
    <View style={[styles.slotCardSkeleton, style]}>
      <SkeletonBox width={60} height={20} />
      <SkeletonBox width={100} height={24} style={{ marginHorizontal: 12 }} />
      <SkeletonBox width={70} height={28} />
    </View>
  );
}

/** Skeleton for market result row (Market Result History) */
export function SkeletonResultRow({ style }) {
  return (
    <View style={[styles.resultRowSkeleton, style]}>
      <SkeletonBox flex={1} height={14} />
      <SkeletonBox width={80} height={14} style={{ marginLeft: 12 }} />
    </View>
  );
}

/** 3-column grid of group/market cards (Startline/King dashboard) */
export function SkeletonGroupGrid({ count = 9, style }) {
  const items = Array.from({ length: count });
  return (
    <View style={[styles.groupGridWrap, style]}>
      {items.map((_, i) => (
        <View key={i} style={styles.groupGridCard}>
          <SkeletonBox width={80} height={80} style={{ borderRadius: borderRadius['2xl'] }} />
          <SkeletonBox width={60} height={10} style={{ marginTop: 8 }} />
        </View>
      ))}
    </View>
  );
}

/** Passbook: balance card + transaction list */
export function SkeletonPassbook({ style }) {
  return (
    <View style={[styles.passbookWrap, style]}>
      <View style={styles.balanceCardSkeleton}>
        <SkeletonBox width={120} height={12} />
        <SkeletonBox width={100} height={28} style={{ marginTop: 8 }} />
        <View style={styles.balanceStatsRow}>
          <SkeletonBox width={80} height={12} />
          <SkeletonBox width={80} height={12} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 8 }}>
        <SkeletonBox width={70} height={32} />
        <SkeletonBox width={70} height={32} />
        <SkeletonBox width={70} height={32} />
      </View>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <SkeletonListItem key={i} lines={2} style={{ marginTop: spacing[2] }} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.surfaceCard || '#202124',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  card: {
    backgroundColor: colors.surfaceCard || '#202124',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: spacing[2],
    minHeight: 160,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fundCard: {
    backgroundColor: colors.surfaceCard || '#202124',
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  listItem: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
  },
  form: {
    padding: spacing[4],
    gap: spacing[4],
  },
  formField: {
    marginBottom: spacing[3],
  },
  gridWrap: {
    paddingHorizontal: spacing[3],
    paddingBottom: 100,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
    gap: spacing[2],
  },
  gridCell: {
    width: '48.5%',
  },
  skeletonList: {
    paddingHorizontal: spacing[4],
    paddingBottom: 100,
  },
  passbookWrap: { paddingHorizontal: spacing[4], paddingBottom: 100 },
  balanceCardSkeleton: {
    backgroundColor: colors.surfaceCard || '#202124',
    borderRadius: borderRadius['2xl'],
    padding: spacing[4],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  balanceStatsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  resultRowSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceCard || '#202124',
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    marginBottom: spacing[3],
  },
  slotCardSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.surfaceCard || '#202124',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: spacing[3],
    marginBottom: spacing[2],
  },
  marketCardSkeleton: {
    width: '100%',
    backgroundColor: colors.surfaceCard || '#202124',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  marketCardSkeletonContent: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  marketGridWrap: {
    width: '100%',
    paddingBottom: 8,
  },
  marketGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  marketGridCell: {
    width: '48.5%',
  },
  groupGridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing[4],
    paddingBottom: 100,
    gap: spacing[3],
  },
  groupGridCard: { width: '30%', alignItems: 'center' },
});

export default SkeletonBox;

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from '../hooks/useTranslation';
import { API_BASE_URL } from '../config/api';
import { isPastClosingTime } from '../utils/marketTiming';
import { useRefreshOnMarketReset } from '../hooks/useRefreshOnMarketReset';
import { navigate } from '../navigationRef';
import { colors, spacing, borderRadius, fontSize } from '../theme';

function formatTime(time24) {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function getMarketStatus(market) {
  if (isPastClosingTime(market)) return { status: 'closed', timer: null };
  const hasOpening = market.openingNumber && /^\d{3}$/.test(String(market.openingNumber));
  const hasClosing = market.closingNumber && /^\d{3}$/.test(String(market.closingNumber));
  if (hasOpening && hasClosing) return { status: 'closed', timer: null };
  if (hasOpening && !hasClosing) return { status: 'running', timer: null };
  return { status: 'open', timer: null };
}

// Clock icon component (amber)
const ClockIcon = () => (
  <View style={styles.clockWrap}>
    <Text style={styles.clockIcon}>🕐</Text>
  </View>
);

export default function Section1() {
  const { t } = useTranslation();
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMarkets = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/markets/get-markets?marketType=main`);
      const data = await res.json();
      if (data.success) {
        const mainOnly = (data.data || []).filter((m) => m.marketType !== 'startline');
        const transformed = mainOnly.map((market) => {
          const st = getMarketStatus(market);
          return {
            id: market._id,
            gameName: market.marketName,
            timeRange: `${formatTime(market.startingTime)} - ${formatTime(market.closingTime)}`,
            result: market.displayResult || '***-**-***',
            status: st.status,
            market,
          };
        });
        setMarkets(transformed);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useRefreshOnMarketReset(fetchMarkets);
  useEffect(() => {
    fetchMarkets();
  }, []);

  // Mobile header: two gold 2px lines + center MARKETS block (frontend uses SVG path)
  const MobileHeader = () => (
    <View style={styles.mobileHeader}>
      <View style={styles.goldLine} />
      <View style={styles.marketsBlock}>
        <Text style={styles.marketsTitle}>{t('markets.markets').toUpperCase()}</Text>
      </View>
      <View style={styles.goldLine} />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <MobileHeader />
        <View style={styles.skeletonGrid}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <View key={i} style={styles.skeletonCard}>
              <View style={styles.skeletonBar} />
              <View style={styles.skeletonContent}>
                <View style={styles.skeletonRow}>
                  <View style={styles.skeletonDot} />
                  <View style={[styles.skeletonBarThin, { flex: 1, maxWidth: '80%' }]} />
                </View>
                <View style={[styles.skeletonBarThin, { width: '75%' }]} />
                <View style={[styles.skeletonBarThin, { width: 96, height: 24 }]} />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MobileHeader />
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {markets.length === 0 && (
          <Text style={styles.empty}>{t('markets.noMarketsAvailable')}</Text>
        )}
        <View style={styles.cardGrid}>
          {markets.map((m) => {
            const isClickable = m.status === 'open' || m.status === 'running';
            return (
              <TouchableOpacity
                key={m.id}
                style={[styles.card, !isClickable && styles.cardClosed]}
                onPress={() => {
                  if (isClickable) navigate('BidOptions', { marketId: m.id });
                  else navigate('BidOptions', { marketId: m.id, scheduleForTomorrow: true });
                }}
                activeOpacity={0.9}
              >
                <View style={[styles.statusBar, m.status === 'closed' ? styles.statusBarClosed : styles.statusBarOpen]}>
                  <Text style={styles.statusBarText}>
                    {m.status === 'open' && t('markets.marketIsOpen')}
                    {m.status === 'running' && t('markets.closingIsRunning')}
                    {m.status === 'closed' && t('markets.marketClosed')}
                  </Text>
                </View>
                <View style={styles.cardContent}>
                  <View style={styles.timeRow}>
                    <ClockIcon />
                    <Text style={styles.time} numberOfLines={1}>{m.timeRange}</Text>
                  </View>
                  <Text style={styles.gameName} numberOfLines={1}>{m.gameName}</Text>
                  <Text style={styles.result}>{m.result}</Text>
                  <View style={styles.footer}>
                    {m.status === 'closed' ? (
                      <Text style={styles.footerLink}>{t('markets.runningForTomorrow')}</Text>
                    ) : (
                      <Text style={styles.footerLink}>{t('markets.tapToPlay')}</Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
    paddingTop: spacing[4],
    paddingBottom: 80,
    paddingHorizontal: spacing[3],
  },
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
    gap: spacing[2],
  },
  goldLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.gold,
    minWidth: 0,
  },
  marketsBlock: {
    width: 110,
    minHeight: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marketsTitle: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '700',
    letterSpacing: 1,
  },
  list: { flex: 1 },
  listContent: { paddingBottom: 100 },
  empty: { color: colors.textMuted, textAlign: 'center', padding: spacing[6] },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  card: {
    width: '48%',
    minWidth: 0,
    backgroundColor: colors.gray800,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardClosed: { opacity: 0.9 },
  statusBar: {
    paddingVertical: 6,
    paddingHorizontal: spacing[2],
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBarOpen: { backgroundColor: colors.green },
  statusBarClosed: { backgroundColor: colors.red },
  statusBarText: {
    color: colors.text,
    fontSize: fontSize['10px'],
    fontWeight: '600',
  },
  cardContent: {
    padding: spacing[3],
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  clockWrap: { width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  clockIcon: { fontSize: 12 },
  time: {
    color: 'rgba(245,158,11,0.9)',
    fontSize: fontSize['10px'],
    fontWeight: '500',
    flex: 1,
  },
  gameName: {
    color: colors.text,
    fontWeight: '700',
    fontSize: fontSize.sm,
    marginBottom: spacing[2],
  },
  result: {
    color: '#fbbf24',
    fontSize: fontSize.base,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: spacing[2],
  },
  footer: {
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  footerLink: {
    color: colors.goldText,
    fontSize: fontSize['10px'],
    fontWeight: '600',
    textAlign: 'center',
  },
  // Skeleton
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  skeletonCard: {
    width: '48%',
    minWidth: 0,
    backgroundColor: colors.gray800,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  skeletonBar: { height: 32, backgroundColor: 'rgba(255,255,255,0.1)' },
  skeletonContent: { padding: spacing[2], gap: spacing[2] },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  skeletonDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.1)' },
  skeletonBarThin: { height: 12, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.1)' },
});

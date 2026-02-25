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

// Frontend mobile: section bg-black min-[375px]:pt-4 pb-[5rem+safe], min-[375px]:px-3; header mb-4 min-[375px]:mb-6, h-[2px] bg-[#d4af37], MARKETS w-[110px] h-[24px] text-sm; grid gap-2 min-[375px]:gap-3; card rounded-lg status py-1.5 px-2 min-h-[32px], content p-3 border-t white/5
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
    paddingTop: 16,     // min-[375px]:pt-4
    paddingBottom: 80,
    paddingHorizontal: 12, // min-[375px]:px-3
  },
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,   // mb-4 min-[375px]:mb-6
    gap: 8,
  },
  goldLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#d4af37',
    minWidth: 0,
  },
  marketsBlock: {
    width: 110,        // min-[375px]:w-[140px] sm:w-[180px]
    minHeight: 24,     // min-[375px]:h-[28px] sm:h-[34px]
    alignItems: 'center',
    justifyContent: 'center',
  },
  marketsTitle: {
    color: colors.text,
    fontSize: 14,      // text-sm min-[375px]:text-base sm:text-xl
    fontWeight: '700',
    letterSpacing: 1,  // tracking-wider
  },
  list: { flex: 1 },
  listContent: { paddingBottom: 100 },
  empty: { color: colors.textMuted, textAlign: 'center', padding: spacing[6] },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,            // gap-2 min-[375px]:gap-3
  },
  card: {
    width: '48%',
    minWidth: 0,
    backgroundColor: colors.gray800, // bg-gray-800
    borderRadius: 8,   // rounded-lg
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
    paddingVertical: 6,  // py-1.5 min-[375px]:py-2
    paddingHorizontal: 8, // px-2 min-[375px]:px-3
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBarOpen: { backgroundColor: colors.green },
  statusBarClosed: { backgroundColor: colors.red },
  statusBarText: {
    color: colors.text,
    fontSize: 10,      // text-[10px] min-[375px]:text-xs sm:text-sm
    fontWeight: '600',
  },
  cardContent: {
    padding: 12,       // p-3 min-[375px]:p-3.5 sm:p-4
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,            // gap-1.5
    marginBottom: 6,   // mb-1.5 min-[375px]:mb-2
  },
  clockWrap: { width: 14, height: 14, alignItems: 'center', justifyContent: 'center' }, // w-3.5 h-3.5
  clockIcon: { fontSize: 12 },
  time: {
    color: 'rgba(245,158,11,0.9)', // text-amber-500/90
    fontSize: 10,      // text-[10px] min-[375px]:text-xs sm:text-sm
    fontWeight: '500',
    flex: 1,
  },
  gameName: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,      // text-sm min-[375px]:text-base sm:text-lg
    marginBottom: 8,   // mb-2 min-[375px]:mb-2.5
  },
  result: {
    color: '#fbbf24',  // text-amber-400
    fontSize: 16,      // text-base min-[375px]:text-lg sm:text-xl
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  footer: {
    paddingTop: 6,     // pt-1.5
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  footerLink: {
    color: colors.goldText,
    fontSize: 10,      // text-[10px] min-[375px]:text-[11px] sm:text-sm
    fontWeight: '600',
    textAlign: 'center',
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skeletonCard: {
    width: '48%',
    minWidth: 0,
    backgroundColor: colors.gray800,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  skeletonBar: { height: 32, backgroundColor: 'rgba(255,255,255,0.1)' },
  skeletonContent: { padding: 8, gap: 8 },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  skeletonDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.1)' },
  skeletonBarThin: { height: 12, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.1)' },
});

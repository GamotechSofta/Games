import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Dimensions, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '../hooks/useTranslation';
import { API_BASE_URL } from '../config/api';
import { isPastClosingTime } from '../utils/marketTiming';
import { useRefreshOnMarketReset } from '../hooks/useRefreshOnMarketReset';
import { navigate } from '../navigationRef';
import { colors, spacing, borderRadius, fontSize } from '../theme';
import { SkeletonMarketGrid } from './Skeleton';
import { haptics } from '../utils/haptics';

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

// Frontend: convert API market name to i18n key (e.g. "Milan Morning" -> "milanMorning")
function toMarketNameKey(name) {
  if (!name || typeof name !== 'string') return '';
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+(\w)/g, (_, c) => c.toUpperCase())
    .replace(/^\w/, (c) => c.toLowerCase());
}

// Memoized market card for smoother list performance
const MarketCard = React.memo(function MarketCard({ item, t }) {
  const isClickable = item.status === 'open' || item.status === 'running';
  const statusLabel = item.status === 'open' ? t('markets.marketIsOpen') : item.status === 'running' ? t('markets.closingIsRunning') : t('markets.marketClosed');
  const footerLabel = item.status === 'closed' ? t('markets.runningForTomorrow') : t('markets.tapToPlay');
  const nameKey = toMarketNameKey(item.gameName);
  const displayName = t(`markets.names.${nameKey}`) !== `markets.names.${nameKey}` ? t(`markets.names.${nameKey}`) : item.gameName;
  return (
    <TouchableOpacity
      style={[styles.card, !isClickable && styles.cardClosed]}
      onPress={() => {
        haptics.light();
        const marketWithStatus = { ...item.market, status: item.status };
        const params = { market: marketWithStatus, marketId: item.id };
        if (isClickable) navigate('BidOptions', params);
        else navigate('BidOptions', { ...params, scheduleForTomorrow: true });
      }}
      activeOpacity={0.9}
    >
      <View style={[styles.statusBar, item.status === 'closed' ? styles.statusBarClosed : styles.statusBarOpen]}>
        <Text style={styles.statusBarText}>{statusLabel}</Text>
      </View>
      <View style={styles.cardContent}>
        <View style={styles.timeRow}>
          <View style={styles.clockWrap}><Text style={styles.clockIcon}>🕐</Text></View>
          <Text style={styles.time} numberOfLines={1}>{item.timeRange}</Text>
        </View>
        <Text style={styles.gameName} numberOfLines={2}>{displayName}</Text>
        <Text style={styles.result}>{item.result}</Text>
        <View style={styles.footer}>
          <Text style={styles.footerLink}>{footerLabel}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_MIN_375 = SCREEN_WIDTH >= 375;
// Frontend mobile: gap-2 | min-[375px]:gap-3 → 8 | 12
const GRID_GAP = IS_MIN_375 ? 12 : 8;
// Frontend: mb-4 | min-[375px]:mb-6 → 16 | 24
const HEADER_MB = IS_MIN_375 ? 24 : 16;
// Frontend: MARKETS block w-[110px] min-[375px]:w-[140px], h-[24px] min-[375px]:h-[28px]
const MARKETS_BLOCK_WIDTH = IS_MIN_375 ? 140 : 110;
const MARKETS_BLOCK_HEIGHT = IS_MIN_375 ? 28 : 24;
// Frontend: status bar py-1.5 min-[375px]:py-2, px-2 min-[375px]:px-3
const STATUS_PY = IS_MIN_375 ? 8 : 6;
const STATUS_PX = IS_MIN_375 ? 12 : 8;
// Frontend: card content p-3 min-[375px]:p-3.5 → 12 | 14
const CARD_PADDING = IS_MIN_375 ? 14 : 12;
// Frontend: time row mb-1.5 min-[375px]:mb-2 → 6 | 8
const TIME_ROW_MB = IS_MIN_375 ? 8 : 6;
// Frontend: time text-[10px] min-[375px]:text-xs → 10 | 12; gameName text-sm min-[375px]:text-base → 14 | 16
const TIME_FONT = IS_MIN_375 ? 12 : 10;
const GAMENAME_FONT = IS_MIN_375 ? 16 : 14;
const GAMENAME_MB = IS_MIN_375 ? 10 : 8;
// Frontend: result text-base min-[375px]:text-lg → 16 | 18; footer text-[10px] min-[375px]:text-[11px] → 10 | 11
const RESULT_FONT = IS_MIN_375 ? 18 : 16;
const FOOTER_FONT = IS_MIN_375 ? 11 : 10;

const REFRESH_INTERVAL_MS = 30000;

// Cache: ekda load kele ki new screen var gel ki parat load/skeleton nko – cached data dikhav
let cachedMarkets = [];

function Section1({ refreshKey, ListHeaderComponent, onRefresh, refreshing }) {
  const { t, language } = useTranslation();
  const insets = useSafeAreaInsets();
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const sectionPaddingBottom = Math.max(insets.bottom, 0);
  const isInitialLoad = useRef(true);

  const fetchMarkets = useCallback(async () => {
    const showLoading = isInitialLoad.current;
    if (showLoading) setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/markets/get-markets?marketType=main`);
      const data = await response.json();

      if (data.success) {
        const mainOnly = (data.data || []).filter((m) => m.marketType !== 'startline');
        const transformedMarkets = mainOnly.map((market) => {
          const st = getMarketStatus(market);
          return {
            id: market._id,
            gameName: market.marketName,
            timeRange: `${formatTime(market.startingTime)} - ${formatTime(market.closingTime)}`,
            result: market.displayResult || '***-**-***',
            status: st.status,
            timer: st.timer,
            winNumber: market.winNumber,
            startingTime: market.startingTime,
            closingTime: market.closingTime,
            betClosureTime: market.betClosureTime ?? 0,
            openingNumber: market.openingNumber,
            closingNumber: market.closingNumber,
            market,
          };
        });
        setMarkets(transformedMarkets);
        cachedMarkets = transformedMarkets;
      }
    } catch (error) {
      console.error('Error fetching markets:', error);
    } finally {
      if (showLoading) {
        isInitialLoad.current = false;
        setLoading(false);
      }
    }
  }, []);

  const fetchMarketsRef = useRef(fetchMarkets);
  fetchMarketsRef.current = fetchMarkets;

  useEffect(() => {
    if (cachedMarkets.length > 0) {
      setMarkets(cachedMarkets);
      setLoading(false);
      isInitialLoad.current = false;
    }
    fetchMarketsRef.current?.();
    const dataInterval = setInterval(() => fetchMarketsRef.current?.(), REFRESH_INTERVAL_MS);
    return () => clearInterval(dataInterval);
  }, []);

  // Sync with Home's pull-to-refresh
  useEffect(() => {
    if (refreshKey > 0) {
      fetchMarketsRef.current?.();
    }
  }, [refreshKey]);

  useRefreshOnMarketReset(() => fetchMarketsRef.current?.());

  const mobileHeader = useMemo(() => (
    <View style={styles.mobileHeader}>
      <View style={styles.goldLine} />
      <View style={styles.marketsBlock}>
        <Text style={styles.marketsTitle}>{t('markets.markets').toUpperCase()}</Text>
      </View>
      <View style={styles.goldLine} />
    </View>
  ), [t]);

  const renderMarketItem = useCallback((item) => <MarketCard key={item.id} item={item} t={t} />, [t]);

  const listHeader = useMemo(() => {
    if (markets.length === 0 && !loading) return <Text style={styles.empty}>{t('markets.noMarketsAvailable')}</Text>;
    return null;
  }, [markets.length, loading, t]);

  // YouTube-style loading: multiple skeleton cards in 2-column grid (was single/4 – now 8 with shimmer)
  const listEmptyComponent = useMemo(
    () =>
      loading ? (
        <View style={styles.skeletonEmptyWrap}>
          <SkeletonMarketGrid count={8} gap={GRID_GAP} />
        </View>
      ) : null,
    [loading]
  );

  return (
    <FlatList
      key={`markets-${language}`}
      data={markets}
      extraData={language}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => renderMarketItem(item)}
      numColumns={2}
      columnWrapperStyle={styles.cardGrid}
      contentContainerStyle={[styles.containerExtra, { paddingBottom: sectionPaddingBottom + 100 }]}
      ListHeaderComponent={
        <React.Fragment key={language}>
          {ListHeaderComponent}
          {mobileHeader}
          {listHeader}
        </React.Fragment>
      }
      ListEmptyComponent={listEmptyComponent}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews={!loading}
      initialNumToRender={6}
      maxToRenderPerBatch={10}
      windowSize={5}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.goldLight]}
            tintColor={colors.goldLight}
          />
        ) : null
      }
    />
  );
}

// Frontend mobile: section bg-black min-[375px]:pt-4 pb-[5rem+safe], min-[375px]:px-3; header mb-4 min-[375px]:mb-6, h-[2px] bg-[#d4af37], MARKETS w-[110px] h-[24px] text-sm; grid gap-2 min-[375px]:gap-3; card rounded-lg status py-1.5 px-2 min-h-[32px], content p-3 border-t white/5
const styles = StyleSheet.create({
  containerExtra: {
    backgroundColor: colors.black,
    paddingHorizontal: IS_MIN_375 ? 12 : 8,
  },
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: HEADER_MB,
    gap: 8,
  },
  goldLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#d4af37',
    minWidth: 0,
  },
  marketsBlock: {
    width: MARKETS_BLOCK_WIDTH,
    minHeight: MARKETS_BLOCK_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marketsTitle: {
    color: colors.text,
    fontSize: GAMENAME_FONT,
    fontWeight: '700',
    letterSpacing: 1,
  },
  empty: { color: colors.textMuted, textAlign: 'center', padding: spacing[6] },
  cardGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    marginBottom: GRID_GAP,
  },
  card: {
    width: '48.5%', // Slightly less than 50% for space-between
    backgroundColor: colors.gray800,
    borderRadius: 8,
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
    paddingVertical: STATUS_PY,
    paddingHorizontal: STATUS_PX,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBarOpen: { backgroundColor: colors.green },
  statusBarClosed: { backgroundColor: colors.red },
  statusBarText: {
    color: colors.text,
    fontSize: TIME_FONT,
    fontWeight: '600',
  },
  cardContent: {
    padding: CARD_PADDING,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: TIME_ROW_MB,
  },
  clockWrap: { width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  clockIcon: { fontSize: 12 },
  time: {
    color: 'rgba(245,158,11,0.9)',
    fontSize: TIME_FONT,
    fontWeight: '500',
    flex: 1,
  },
  gameName: {
    color: colors.text,
    fontWeight: '700',
    fontSize: GAMENAME_FONT,
    marginBottom: GAMENAME_MB,
  },
  result: {
    color: '#fbbf24',
    fontSize: RESULT_FONT,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: GAMENAME_MB,
  },
  footer: {
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  footerLink: {
    color: colors.goldText,
    fontSize: FOOTER_FONT,
    fontWeight: '600',
    textAlign: 'center',
  },
  skeletonEmptyWrap: {
    width: '100%',
    paddingHorizontal: 0,
  },
});

export default Section1;

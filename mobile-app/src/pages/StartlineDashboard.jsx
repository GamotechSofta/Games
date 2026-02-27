import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../hooks/useTranslation';
import { API_BASE_URL } from '../config/api';
import { isPastClosingTime } from '../utils/marketTiming';
import { useRefreshOnMarketReset } from '../hooks/useRefreshOnMarketReset';
import { storage } from '../utils/storage';
import { colors, spacing, borderRadius, fontSize } from '../theme';
import { SkeletonGroupGrid } from '../components/Skeleton';

const STARLINE_IMG = 'https://res.cloudinary.com/dnyp5jknp/image/upload/v1770722975/Untitled_design_16_1_palesh_qef2qd.png';

const getMarketStatus = (market) => {
  if (isPastClosingTime(market)) return 'closed';
  const hasOpening = market.openingNumber && /^\d{3}$/.test(String(market.openingNumber));
  const hasClosing = market.closingNumber && /^\d{3}$/.test(String(market.closingNumber));
  const isStartline = market.marketType === 'startline';
  if (isStartline && hasOpening) return 'closed';
  if (hasOpening && hasClosing) return 'closed';
  if (hasOpening && !hasClosing) return 'running';
  return 'open';
};

export default function StartlineDashboard() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const [markets, setMarkets] = useState([]);
  const [starlineGroups, setStarlineGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [balanceText, setBalanceText] = useState('0');

  useEffect(() => {
    storage.getItem('user').then((raw) => {
      try {
        const u = raw ? JSON.parse(raw) : {};
        const b = Number(u?.balance ?? u?.walletBalance ?? u?.wallet ?? 0) || 0;
        setBalanceText(b.toLocaleString('en-IN', { maximumFractionDigits: 0 }));
      } catch { setBalanceText('0'); }
    });
  }, []);

  const fetchMarkets = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/markets/get-markets?marketType=startline`);
      const data = await res.json();
      if (data?.success && Array.isArray(data?.data)) {
        const mapped = data.data
          .map((m) => ({
            id: m._id, marketName: m.marketName, startingTime: m.startingTime,
            closingTime: m.closingTime, openingNumber: m.openingNumber || null,
            closingNumber: m.closingNumber || null, displayResult: m.displayResult || null,
            status: getMarketStatus(m),
          }))
          .sort((a, b) => String(a.startingTime || '').localeCompare(String(b.startingTime || '')));
        setMarkets(mapped);
      } else setMarkets([]);
    } catch { setMarkets([]); } finally { setLoading(false); }
  };

  const fetchStarlineGroups = async () => {
    try {
      setLoadingGroups(true);
      const res = await fetch(`${API_BASE_URL}/markets/starline-groups`);
      const data = await res.json();
      if (data?.success && Array.isArray(data?.data)) setStarlineGroups(data.data);
      else setStarlineGroups([]);
    } catch { setStarlineGroups([]); } finally { setLoadingGroups(false); }
  };

  useEffect(() => { fetchMarkets(); fetchStarlineGroups(); }, []);
  useRefreshOnMarketReset(fetchMarkets);

  const openStarlineMarket = (key, label) => {
    navigation.navigate('StarlineMarket', { marketKey: key, marketLabel: label || 'Starline' });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.backBtn} activeOpacity={0.8}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{t('startlineDashboard.title')}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Bank')} style={styles.walletBtn} activeOpacity={0.8}>
          <Text style={styles.walletIcon}>💰</Text>
          <Text style={styles.walletText}>{balanceText}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      {/* Starline Groups Grid */}
      {loadingGroups && starlineGroups.length === 0 ? (
        <SkeletonGroupGrid count={9} />
      ) : starlineGroups.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>{t('startlineDashboard.noMarkets')}</Text>
        </View>
      ) : (
      <FlatList
        data={starlineGroups}
        renderItem={({ item }) => (
          <StarlineGroupCard
            item={item}
            onPress={() => openStarlineMarket(item.key, item.label)}
          />
        )}
        keyExtractor={(item) => item.key}
        numColumns={3}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
      />
      )}
    </View>
  );
}

const StarlineGroupCard = React.memo(({ item, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    style={styles.marketCard}
    activeOpacity={0.85}
  >
    <View style={styles.marketImageWrap}>
      <View style={styles.marketImageBg}>
        <Text style={styles.marketImageText}>⭐</Text>
      </View>
    </View>
    <Text style={styles.marketLabel} numberOfLines={2}>{item.label}</Text>
  </TouchableOpacity>
));

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[4], paddingTop: spacing[3], paddingBottom: spacing[3] },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], flex: 1, minWidth: 0 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  backIcon: { color: colors.text, fontSize: 20, fontWeight: '600' },
  headerTitle: { color: colors.text, fontSize: fontSize.xl, fontWeight: '800', letterSpacing: 0.5, flex: 1 },
  walletBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], paddingHorizontal: spacing[2], paddingVertical: 6 },
  walletIcon: { fontSize: 20 },
  walletText: { color: colors.text, fontWeight: '700', fontSize: fontSize.base },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: spacing[4] },
  columnWrapper: { justifyContent: 'flex-start', gap: spacing[3] },
  grid: { padding: spacing[4], paddingBottom: 100 },
  skeletonCard: { width: '30%', height: 130, backgroundColor: '#202124', borderRadius: borderRadius['2xl'], borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  emptyBox: { flex: 1, alignItems: 'center', paddingVertical: spacing[6], width: '100%' },
  emptyText: { color: 'rgba(255,255,255,0.6)', fontSize: fontSize.sm },
  marketCard: { width: '30%', alignItems: 'center', padding: spacing[1] },
  marketImageWrap: { width: 80, height: 80, borderRadius: borderRadius['2xl'], overflow: 'hidden', marginBottom: spacing[1] },
  marketImageBg: {
    flex: 1, backgroundColor: colors.gold,
    alignItems: 'center', justifyContent: 'center',
  },
  marketImageText: { fontSize: 36 },
  marketLabel: {
    color: colors.goldText, fontSize: 11, fontWeight: '600',
    textAlign: 'center', lineHeight: 14,
  },
});

import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from '../hooks/useTranslation';
import { colors, spacing, borderRadius, fontSize } from '../theme';

const BID_ICONS = {
  'Single Digit': 'https://res.cloudinary.com/dzd47mpdo/image/upload/v1769756244/Untitled_90_x_160_px_1080_x_1080_px_1_yinraf.svg',
  'Jodi': 'https://res.cloudinary.com/dzd47mpdo/image/upload/v1769714108/Untitled_1080_x_1080_px_1080_x_1080_px_7_rpzykt.svg',
  'Single Pana': 'https://res.cloudinary.com/dzd47mpdo/image/upload/v1769714254/Untitled_1080_x_1080_px_1080_x_1080_px_8_jdbxyd.svg',
  'Double Pana': 'https://res.cloudinary.com/dzd47mpdo/image/upload/v1769713943/Untitled_1080_x_1080_px_1080_x_1080_px_6_uccv7o.svg',
  'Triple Pana': 'https://res.cloudinary.com/dzd47mpdo/image/upload/v1769714392/Untitled_1080_x_1080_px_1080_x_1080_px_9_ugcdef.svg',
  'Full Sangam': 'https://res.cloudinary.com/dzd47mpdo/image/upload/v1770033671/Untitled_design_2_kr1imj.svg',
  'Half Sangam': 'https://res.cloudinary.com/dzd47mpdo/image/upload/v1770033165/Untitled_design_c5hag8.svg',
};

// Convert SVG Cloudinary URLs to PNG for React Native
const getImageUri = (url) => {
  if (!url) return null;
  if (url.toLowerCase().endsWith('.svg') && url.includes('cloudinary'))
    return url.replace('/upload/', '/upload/f_png/').replace(/\.svg$/i, '');
  return url;
};

export default function BidOptions() {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useTranslation();

  const market = route.params?.market;
  const marketType = (route.params?.marketType || '').toString().trim().toLowerCase();
  const kingBazaarMarketKey = route.params?.kingBazaarMarketKey;
  const kingBazaarMarketLabel = route.params?.kingBazaarMarketLabel || 'King Bazaar';
  const starlineMarketKey = route.params?.starlineMarketKey;
  const starlineMarketLabel = route.params?.starlineMarketLabel || 'Starline';

  const inferredKing = (() => {
    if (marketType === 'king' || marketType === 'king-bazaar' || marketType === 'kingbazaar') return true;
    const mType = (market?.marketType || '').toString().trim().toLowerCase();
    if (mType === 'king' || mType === 'king-bazaar' || mType === 'kingbazaar') return true;
    const name = (market?.marketName || market?.gameName || '').toString().toLowerCase();
    return name.includes('king bazaar') || name.includes('king-bazaar') || name.includes('kingbazaar');
  })();
  const isKingBazaar = inferredKing;

  const inferredStarline = (() => {
    if (marketType === 'starline' || marketType === 'startline' || marketType === 'star-line') return true;
    const mType = (market?.marketType || '').toString().trim().toLowerCase();
    if (mType === 'startline' || mType === 'starline') return true;
    const name = (market?.marketName || market?.gameName || '').toString().toLowerCase();
    return name.includes('starline') || name.includes('startline') || name.includes('star line') || name.includes('start line');
  })();
  const isStarline = inferredStarline;

  useEffect(() => {
    if (!market) {
      navigation.navigate('Home');
      return;
    }
    if (isStarline && market?.status === 'closed') {
      navigation.navigate('StartlineDashboard');
    }
  }, [market]);

  if (!market) return null;

  const getGameTitle = (key) => {
    const map = {
      'Single Digit': t('gameRate.singleDigit'),
      'Single Digit Bulk': t('gameRate.singleDigitBulk'),
      'Jodi': t('gameRate.jodi'),
      'Jodi Bulk': t('gameRate.jodiBulk'),
      'Single Pana': t('gameRate.singlePana'),
      'Single Pana Bulk': t('gameRate.singlePanaBulk'),
      'Double Pana': t('gameRate.doublePana'),
      'Double Pana Bulk': t('gameRate.doublePanaBulk'),
      'Triple Pana': t('gameRate.triplePana'),
      'Full Sangam': t('gameRate.fullSangam'),
      'Half Sangam': t('gameRate.halfSangam'),
      'Half Sangam (O)': t('gameRate.halfSangamOpen'),
      'Half Sangam (C)': t('gameRate.halfSangamClose'),
    };
    return map[key] || key;
  };

  const options = [
    { id: 1, title: 'Single Digit', displayTitle: getGameTitle('Single Digit'), icon: BID_ICONS['Single Digit'] },
    { id: 2, title: 'Single Digit Bulk', displayTitle: getGameTitle('Single Digit Bulk'), icon: BID_ICONS['Single Digit'] },
    { id: 3, title: 'Jodi', displayTitle: getGameTitle('Jodi'), icon: BID_ICONS['Jodi'] },
    { id: 4, title: 'Jodi Bulk', displayTitle: getGameTitle('Jodi Bulk'), icon: BID_ICONS['Jodi'] },
    { id: 5, title: 'Single Pana', displayTitle: getGameTitle('Single Pana'), icon: BID_ICONS['Single Pana'] },
    { id: 6, title: 'Single Pana Bulk', displayTitle: getGameTitle('Single Pana Bulk'), icon: BID_ICONS['Single Pana'] },
    { id: 7, title: 'Double Pana', displayTitle: getGameTitle('Double Pana'), icon: BID_ICONS['Double Pana'] },
    { id: 8, title: 'Double Pana Bulk', displayTitle: getGameTitle('Double Pana Bulk'), icon: BID_ICONS['Double Pana'] },
    { id: 9, title: 'Triple Pana', displayTitle: getGameTitle('Triple Pana'), icon: BID_ICONS['Triple Pana'] },
    { id: 10, title: 'Full Sangam', displayTitle: getGameTitle('Full Sangam'), icon: BID_ICONS['Full Sangam'] },
    { id: 11, title: 'Half Sangam', displayTitle: getGameTitle('Half Sangam'), icon: BID_ICONS['Half Sangam'] },
  ];

  const isRunning = market.status === 'running';

  const visibleOptionsBase = isKingBazaar
    ? [
      { id: 'king-single-open', title: 'Single Digit', displayTitle: t('bidOptions.firstDigit'), sessionPreset: 'OPEN', icon: BID_ICONS['Single Digit'] },
      { id: 'king-single-close', title: 'Single Digit', displayTitle: t('bidOptions.secondDigit'), sessionPreset: 'CLOSE', icon: BID_ICONS['Single Digit'] },
      { id: 'king-jodi', title: 'Jodi', displayTitle: getGameTitle('Jodi'), icon: BID_ICONS['Jodi'] },
      { id: 'king-jodi-bulk', title: 'Jodi Bulk', displayTitle: getGameTitle('Jodi Bulk'), icon: BID_ICONS['Jodi'] },
    ]
    : isStarline
      ? options.filter((opt) => {
        const allowed = new Set(['Single Digit', 'Single Digit Bulk', 'Single Pana', 'Single Pana Bulk', 'Double Pana', 'Double Pana Bulk', 'Triple Pana', 'Half Sangam']);
        return allowed.has(opt.title);
      })
      : options;

  const visibleOptions = !isStarline && isRunning
    ? visibleOptionsBase.filter((opt) => {
      const hideWhenRunning = new Set(['jodi', 'jodi bulk', 'full sangam', 'half sangam']);
      return !hideWhenRunning.has((opt.title || '').toLowerCase().trim());
    })
    : visibleOptionsBase;

  const handleBack = () => {
    if (isStarline && starlineMarketKey != null) {
      navigation.navigate('StarlineMarket', { marketKey: starlineMarketKey, marketLabel: starlineMarketLabel });
    } else if (isStarline) {
      navigation.navigate('StartlineDashboard');
    } else if (isKingBazaar && kingBazaarMarketKey != null) {
      navigation.navigate('KingBazaarMarket', { marketKey: kingBazaarMarketKey, marketLabel: kingBazaarMarketLabel });
    } else {
      navigation.navigate('Home');
    }
  };

  const handleOptionPress = (option) => {
    navigation.navigate('GameBid', {
      market,
      betType: option.title,
      sessionPreset: option.sessionPreset,
      gameMode: (option.title || '').toLowerCase().includes('bulk') ? 'bulk' : 'easy',
      ...(route.params?.scheduleForTomorrow && { scheduleForTomorrow: true }),
      ...(isKingBazaar && kingBazaarMarketKey != null && {
        marketType: 'king', kingBazaarMarketKey, kingBazaarMarketLabel,
      }),
      ...(isStarline && starlineMarketKey != null && {
        marketType: 'starline', starlineMarketKey, starlineMarketLabel,
      }),
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.8} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {market?.gameName || t('bidOptions.selectMarket')}
          </Text>
          {isStarline && (
            <Text style={styles.headerSubtitle}>{t('bidOptions.starlineMarket')}</Text>
          )}
        </View>
      </View>

      {/* Options Grid */}
      <ScrollView
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {visibleOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={styles.card}
            onPress={() => handleOptionPress(option)}
            activeOpacity={0.85}
          >
            <View style={styles.iconWrap}>
              {option.icon ? (
                <Image
                  source={{ uri: getImageUri(option.icon) }}
                  style={styles.iconImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.iconPlaceholder} />
              )}
            </View>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {(option.displayTitle || option.title || '').toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingTop: spacing[4],
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
    gap: spacing[3],
  },
  backBtn: {
    minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center',
  },
  backIcon: { color: '#9ca3af', fontSize: 22, fontWeight: '600' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: {
    color: colors.text,
    fontSize: fontSize.base,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    borderBottomWidth: 2,
    borderBottomColor: colors.goldLight,
    paddingBottom: 2,
  },
  headerSubtitle: {
    color: colors.goldText,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginTop: 6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing[3],
    gap: spacing[3],
    paddingBottom: 100,
  },
  card: {
    width: '47%',
    minHeight: 120,
    backgroundColor: '#15171b',
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  iconWrap: { width: 80, height: 80 },
  iconImage: { width: '100%', height: '100%' },
  iconPlaceholder: { width: 80, height: 80, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: borderRadius.xl },
  cardTitle: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    textAlign: 'center',
    lineHeight: 14,
  },
});

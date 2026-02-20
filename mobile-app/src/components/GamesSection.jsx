import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from '../hooks/useTranslation';
import { GAMES } from '../config/games';
import * as WebBrowser from 'expo-web-browser';
import { colors, spacing, borderRadius, fontSize } from '../theme';

// React Native Image doesn't support SVG; Cloudinary can serve PNG via f_png transformation
function getImageUri(uri) {
  if (!uri) return null;
  if (typeof uri !== 'string') return uri;
  if (uri.toLowerCase().endsWith('.svg') && uri.includes('cloudinary')) {
    return uri.replace('/upload/', '/upload/f_png/').replace(/\.svg$/i, '');
  }
  return uri;
}

const StarIcon = () => (
  <View style={styles.starWrap}>
    <Text style={styles.starIcon}>★</Text>
  </View>
);

export default function GamesSection() {
  const { t } = useTranslation();
  const gamesToShow = GAMES || [];
  const [failedImages, setFailedImages] = useState(new Set());

  const handleGamePress = (game) => {
    if (game.external && game.url) WebBrowser.openBrowserAsync(game.url);
  };

  const markImageFailed = (gameId) => {
    setFailedImages((prev) => new Set(prev).add(gameId));
  };

  if (!gamesToShow.length) return null;

  const edgePadding = spacing[3];
  const cardWidth = 120;
  const cardHeight = 64;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.line, styles.lineLeft]} />
        <View style={styles.titleRow}>
          <StarIcon />
          <Text style={styles.title}>{t('games.otherGames')}</Text>
          <StarIcon />
        </View>
        <View style={[styles.line, styles.lineRight]} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingLeft: edgePadding, paddingRight: edgePadding }]}
        style={[styles.scroll, { marginHorizontal: -edgePadding }]}
      >
        {gamesToShow.map((game) => {
          const isUpcoming = game.upcoming || !game.url;
          const imageUri = game.image ? getImageUri(game.image) : null;
          const showImage = imageUri && !failedImages.has(game.id);

          return (
            <TouchableOpacity
              key={game.id}
              style={[
                styles.card,
                { width: cardWidth, height: cardHeight },
                isUpcoming && styles.cardUpcoming,
                isUpcoming && styles.cardOpacity,
              ]}
              onPress={() => !isUpcoming && handleGamePress(game)}
              disabled={isUpcoming}
              activeOpacity={0.98}
            >
              {/* Image / content - absolute inset-0 like frontend */}
              <View style={styles.cardContent}>
                {showImage ? (
                  <Image
                    source={{ uri: imageUri }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    onError={() => markImageFailed(game.id)}
                  />
                ) : (
                  <View style={[styles.iconBg, isUpcoming && styles.iconBgUpcoming]}>
                    <Text
                      style={[
                        styles.icon,
                        isUpcoming && styles.iconUpcoming,
                        isUpcoming && styles.iconUpcomingShadow,
                      ]}
                    >
                      {game.icon}
                    </Text>
                  </View>
                )}
              </View>

              {/* Bottom overlay: gradient from-black/85 via-black/30 to-transparent, text at bottom (frontend exact) */}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.85)']}
                style={styles.bottomStrip}
              >
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {isUpcoming ? t('games.comingSoon') : game.name}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: colors.black,
    paddingTop: spacing[2],
    paddingBottom: 32,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[4],
    gap: spacing[2],
    paddingHorizontal: spacing[3],
  },
  line: { flex: 1, height: 1, minWidth: 20 },
  lineLeft: { backgroundColor: 'rgba(255,255,255,0.5)' },
  lineRight: { backgroundColor: 'rgba(255,255,255,0.5)' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], flexShrink: 0 },
  starWrap: { width: 10, height: 10, alignItems: 'center', justifyContent: 'center' },
  starIcon: { color: 'rgba(255,255,255,0.7)', fontSize: 10 },
  title: {
    color: colors.text,
    fontSize: fontSize.base,
    fontWeight: '700',
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(255,255,255,0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  scroll: {},
  scrollContent: { flexDirection: 'row', gap: spacing[2], paddingBottom: spacing[2] },
  card: {
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: colors.text,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  cardUpcoming: { backgroundColor: colors.black },
  cardOpacity: { opacity: 0.75 },
  cardContent: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBgUpcoming: { backgroundColor: colors.black },
  icon: { fontSize: 36 },
  iconUpcoming: { fontSize: 28 },
  iconUpcomingShadow: {
    textShadowColor: 'rgba(212,175,55,0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  bottomStrip: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 24,
    paddingBottom: 10,
    paddingHorizontal: 10,
    justifyContent: 'flex-end',
    minHeight: 44,
  },
  cardTitle: {
    color: colors.text,
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    lineHeight: 16,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

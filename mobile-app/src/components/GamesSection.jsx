import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useTranslation } from '../hooks/useTranslation';
import { GAMES } from '../config/games';
import * as WebBrowser from 'expo-web-browser';
import { colors, spacing, borderRadius, fontSize } from '../theme';

// Star path for header (frontend: w-2.5 h-2.5 text-white/70)
const StarSvg = () => (
  <View style={styles.starWrap}>
    <Text style={styles.starIcon}>★</Text>
  </View>
);

export default function GamesSection() {
  const { t } = useTranslation();
  const gamesToShow = GAMES || [];

  const handleGamePress = (game) => {
    if (game.external && game.url) WebBrowser.openBrowserAsync(game.url);
  };

  if (!gamesToShow.length) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.line, styles.lineLeft]} />
        <View style={styles.titleRow}>
          <StarSvg />
          <Text style={styles.title}>{t('games.otherGames')}</Text>
          <StarSvg />
        </View>
        <View style={[styles.line, styles.lineRight]} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {gamesToShow.map((game) => {
          const isUpcoming = game.upcoming || !game.url;
          return (
            <TouchableOpacity
              key={game.id}
              style={[styles.card, isUpcoming && styles.cardUpcoming]}
              onPress={() => !isUpcoming && handleGamePress(game)}
              disabled={isUpcoming}
              activeOpacity={0.98}
            >
              <View style={styles.cardContent}>
                {game.image ? (
                  <Image source={{ uri: game.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                ) : (
                  <View style={[styles.iconBg, isUpcoming && styles.iconBgUpcoming]}>
                    <Text style={[styles.icon, isUpcoming && styles.iconUpcoming]}>{game.icon}</Text>
                  </View>
                )}
              </View>
              <View style={styles.bottomStrip}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {isUpcoming ? t('games.comingSoon') : game.name}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const CARD_W = 120;
const CARD_H = 56;

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: colors.black,
    paddingTop: spacing[2],
    paddingBottom: spacing[6],
    paddingHorizontal: spacing[3],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[4],
    gap: spacing[2],
  },
  line: {
    flex: 1,
    height: 1,
    minWidth: 20,
  },
  lineLeft: { backgroundColor: 'rgba(255,255,255,0.5)' },
  lineRight: { backgroundColor: 'rgba(255,255,255,0.5)' },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flexShrink: 0,
  },
  starWrap: { width: 10, height: 10, alignItems: 'center', justifyContent: 'center' },
  starIcon: { color: 'rgba(255,255,255,0.7)', fontSize: 10 },
  title: {
    color: colors.text,
    fontSize: fontSize.base,
    fontWeight: '700',
    letterSpacing: 2.4,
    textTransform: 'uppercase',
  },
  scroll: { flexDirection: 'row', gap: spacing[2], paddingBottom: spacing[2] },
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: colors.text,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  cardUpcoming: { backgroundColor: colors.black },
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
  icon: { fontSize: 28 },
  iconUpcoming: { fontSize: 24 },
  bottomStrip: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 32,
    paddingBottom: 10,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  cardTitle: {
    color: colors.text,
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

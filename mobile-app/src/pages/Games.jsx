import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import { GAMES } from '../config/games';
import { colors, spacing, borderRadius, fontSize } from '../theme';

function getImageUri(uri) {
  if (!uri || typeof uri !== 'string') return null;
  if (uri.toLowerCase().endsWith('.svg') && uri.includes('cloudinary'))
    return uri.replace('/upload/', '/upload/f_png/').replace(/\.svg$/i, '');
  return uri;
}

// Match frontend Games page: filter by category (highEarning | upcoming | all), open game URL in browser
export default function Games() {
  const route = useRoute();
  const navigation = useNavigation();
  const category = route.params?.category || 'all';

  const filteredGames = GAMES.filter((game) => {
    if (category === 'highEarning') return game.highEarning;
    if (category === 'upcoming') return game.upcoming;
    if (category === 'other') return !game.highEarning && !game.upcoming;
    return true;
  });

  const title =
    category === 'highEarning'
      ? 'Casino Games'
      : category === 'upcoming'
        ? 'Skills Games'
        : 'All Games';

  const handleGamePress = (game) => {
    if (game.upcoming) return;
    if (game.url) WebBrowser.openBrowserAsync(game.url);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {filteredGames.map((game) => {
          const isUpcoming = game.upcoming || !game.url;
          const imageUri = getImageUri(game.image);
          return (
            <TouchableOpacity
              key={game.id}
              style={[styles.card, isUpcoming && styles.cardDisabled]}
              onPress={() => handleGamePress(game)}
              disabled={isUpcoming}
              activeOpacity={0.9}
            >
              <View style={styles.cardImageWrap}>
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.cardImage} resizeMode="cover" />
                ) : (
                  <View style={styles.cardIconWrap}>
                    <Text style={styles.cardIcon}>{game.icon}</Text>
                  </View>
                )}
                {isUpcoming && (
                  <View style={styles.comingSoonOverlay}>
                    <Text style={styles.comingSoonText}>Coming Soon</Text>
                  </View>
                )}
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName} numberOfLines={1}>{game.name}</Text>
                <Text style={styles.cardProvider}>DPBOSS KING</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black, paddingHorizontal: spacing[3], paddingTop: spacing[4] },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginBottom: spacing[4] },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { color: colors.text, fontSize: 20 },
  title: { color: colors.text, fontSize: fontSize.xl, fontWeight: '700', flex: 1 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    paddingBottom: 100,
  },
  card: {
    width: '47%',
    borderRadius: borderRadius['2xl'],
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.text,
    backgroundColor: colors.black,
  },
  cardDisabled: { opacity: 0.8 },
  cardImageWrap: { aspectRatio: 4 / 3, backgroundColor: colors.black, position: 'relative', overflow: 'hidden' },
  cardImage: { width: '100%', height: '100%' },
  cardIconWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cardIcon: { fontSize: 48 },
  comingSoonOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  comingSoonText: {
    color: colors.amberText,
    fontSize: fontSize.xs,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 4,
  },
  cardInfo: { padding: spacing[3], backgroundColor: colors.surfaceCard },
  cardName: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600' },
  cardProvider: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: 2 },
});

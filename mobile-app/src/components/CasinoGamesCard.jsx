import React from 'react';
import { View, Text, TouchableOpacity, ImageBackground, StyleSheet } from 'react-native';
import { useTranslation } from '../hooks/useTranslation';
import { navigate } from '../navigationRef';
import { colors, spacing, borderRadius, fontSize } from '../theme';

const CASINO_BG =
  'https://res.cloudinary.com/dnyp5jknp/image/upload/v1771607262/Yellow_and_Brown_Illustrated_Dice_Casino_Logo_1_p0rjs1.png';

// Match frontend: rounded-2xl border-2 border-white bg-cover, two lines uppercase text (casinoGamesLine1, casinoGamesLine2), navigates to games?category=highEarning
export default function CasinoGamesCard() {
  const { t } = useTranslation();
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigate('Games', { category: 'highEarning' })}
      activeOpacity={0.95}
    >
      <ImageBackground source={{ uri: CASINO_BG }} style={styles.bg} imageStyle={styles.bgImage}>
        <View style={styles.overlay} />
        <View style={styles.content}>
          <Text style={styles.line1}>{t('markets.casinoGamesLine1')}</Text>
          <Text style={styles.line2}>{t('markets.casinoGamesLine2')}</Text>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
}

// Frontend mobile: rounded-2xl border-2 border-white py-5 px-3 min-[375px]:py-6 min-[375px]:px-4, text-xs min-[375px]:text-sm font-bold uppercase tracking-wide
const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    borderRadius: 16,   // rounded-2xl
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.text,
  },
  bg: { flex: 1, backgroundColor: colors.black },
  bgImage: { resizeMode: 'cover' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 20,  // py-5
    paddingHorizontal: 12, // px-3
  },
  line1: {
    color: colors.text,
    fontSize: 12,       // text-xs min-[375px]:text-sm
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5, // tracking-wide
  },
  line2: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
});

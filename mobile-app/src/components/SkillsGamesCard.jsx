import React from 'react';
import { View, Text, TouchableOpacity, ImageBackground, StyleSheet } from 'react-native';
import { useTranslation } from '../hooks/useTranslation';
import { navigate } from '../navigationRef';
import { colors, spacing, borderRadius, fontSize } from '../theme';

const SKILLS_BG =
  'https://res.cloudinary.com/dnyp5jknp/image/upload/v1771608382/Yellow_and_Brown_Illustrated_Dice_Casino_Logo_2_n2nfdl.png';

// Match frontend: rounded-2xl border-2 border-white bg-cover, two lines uppercase (skillsGamesLine1, skillsGamesLine2), navigates to games?category=upcoming
export default function SkillsGamesCard() {
  const { t } = useTranslation();
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigate('Games', { category: 'upcoming' })}
      activeOpacity={0.95}
    >
      <ImageBackground source={{ uri: SKILLS_BG }} style={styles.bg} imageStyle={styles.bgImage}>
        <View style={styles.overlay} />
        <View style={styles.content}>
          <Text style={styles.line1}>{t('markets.skillsGamesLine1')}</Text>
          <Text style={styles.line2}>{t('markets.skillsGamesLine2')}</Text>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
}

// Frontend mobile: same as CasinoGamesCard – rounded-2xl border-2 border-white py-5 px-3, text-xs min-[375px]:text-sm
const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    borderRadius: 16,
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
    paddingVertical: 20,
    paddingHorizontal: 12,
  },
  line1: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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

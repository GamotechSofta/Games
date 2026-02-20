import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useTranslation } from '../hooks/useTranslation';
import { navigate } from '../navigationRef';
import { colors, spacing, borderRadius, fontSize } from '../theme';

const KING_IMAGE = 'https://res.cloudinary.com/dnyp5jknp/image/upload/v1771486141/Yellow_and_Black_Illustrative_Esports_The_Lion_King_Logo_1_chmwuq.png';

export default function KingBazaarCard() {
  const { t } = useTranslation();
  return (
    <TouchableOpacity style={styles.card} onPress={() => navigate('KingBazaarMarket')} activeOpacity={0.95}>
      <View style={styles.inner}>
        <View style={styles.iconBox}>
          <Image source={{ uri: KING_IMAGE }} style={styles.icon} resizeMode="contain" />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.title}>{t('markets.kingBazaar')}</Text>
          <Text style={styles.sub}>{t('markets.tapToPlay')}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    borderRadius: borderRadius['2xl'],
    backgroundColor: colors.black,
    borderWidth: 2,
    borderColor: colors.amber,
    overflow: 'hidden',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: spacing[2],
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  icon: { width: '100%', height: '100%' },
  textWrap: { flex: 1, minWidth: 0 },
  title: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sub: { color: colors.amberText, fontSize: fontSize['10px'], fontWeight: '600', marginTop: 2 },
});

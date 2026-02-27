import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useTranslation } from '../hooks/useTranslation';
import { navigate } from '../navigationRef';
import { haptics } from '../utils/haptics';
import { colors, spacing, borderRadius, fontSize } from '../theme';

const KING_IMAGE = 'https://res.cloudinary.com/dnyp5jknp/image/upload/v1771486141/Yellow_and_Black_Illustrative_Esports_The_Lion_King_Logo_1_chmwuq.png';

export default function KingBazaarCard() {
  const { t } = useTranslation();
  return (
    <TouchableOpacity style={styles.card} onPress={() => { haptics.light(); navigate('KingBazaarMarket'); }} activeOpacity={0.95}>
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

// Frontend mobile: same as StarlineCard – rounded-2xl border-2 border-amber-500 py-3 px-3 min-[375px]:py-4 px-4, icon h-9 w-9 min-[375px]:h-10 w-10
const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    borderRadius: 16,
    backgroundColor: colors.black,
    borderWidth: 2,
    borderColor: colors.amber,
    overflow: 'hidden',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  icon: { width: '100%', height: '100%' },
  textWrap: { flex: 1, minWidth: 0 },
  title: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sub: { color: colors.amberText, fontSize: 9, fontWeight: '600', marginTop: 2 },
});

import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useTranslation } from '../hooks/useTranslation';
import { navigate } from '../navigationRef';
import { colors, spacing, borderRadius, fontSize } from '../theme';

const STARLINE_IMAGE = 'https://res.cloudinary.com/dnyp5jknp/image/upload/v1771486283/Black_and_White_Vintage_Star_Company_Logo_nbhlfi.png';

// Match frontend: rounded-2xl sm:rounded-3xl bg-black border-2 border-amber-500, gap-2 min-[375px]:gap-2.5, py-1.5 px-2 min-[375px]:py-2 min-[375px]:px-3, h-9 w-9 min-[375px]:h-10 min-[375px]:w-10 rounded-lg min-[375px]:rounded-xl
export default function StarlineCard() {
  const { t } = useTranslation();
  return (
    <TouchableOpacity style={styles.card} onPress={() => navigate('StartlineDashboard')} activeOpacity={0.95}>
      <View style={styles.inner}>
        <View style={styles.iconBox}>
          <Image source={{ uri: STARLINE_IMAGE }} style={styles.icon} resizeMode="contain" />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.title}>{t('markets.starline')}</Text>
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

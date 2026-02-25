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

// Frontend mobile: rounded-2xl border-2 border-amber-500 py-3 px-3 min-[375px]:py-4 px-4 gap-2 min-[375px]:gap-2.5, icon h-9 w-9 min-[375px]:h-10 w-10 rounded-lg min-[375px]:rounded-xl, text-xs min-[375px]:text-sm, sub text-[9px] min-[375px]:text-[10px]
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
    gap: 8,           // gap-2 min-[375px]:gap-2.5
    paddingVertical: 12,  // py-3 min-[375px]:py-4
    paddingHorizontal: 12, // px-3 min-[375px]:px-4
  },
  iconBox: {
    width: 36,        // h-9 w-9 min-[375px]:h-10 w-10
    height: 36,
    borderRadius: 8,   // rounded-lg min-[375px]:rounded-xl
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  icon: { width: '100%', height: '100%' },
  textWrap: { flex: 1, minWidth: 0 },
  title: {
    color: colors.text,
    fontSize: 12,     // text-xs min-[375px]:text-sm
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sub: { color: colors.amberText, fontSize: 9, fontWeight: '600', marginTop: 2 }, // text-[9px] min-[375px]:text-[10px]
});

import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from '../hooks/useTranslation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, fontSize } from '../theme';

// Match frontend BottomNavbar: same Cloudinary icons, center Home elevated (-mt-4), active gold, rounded-2xl border gray-700
const NAV_ICONS = {
  Bids: 'https://res.cloudinary.com/dzd47mpdo/image/upload/v1769777192/auction_ofhpps.png',
  Funds: 'https://res.cloudinary.com/dzd47mpdo/image/upload/v1769777500/funding_zjmbzp.png',
  Home: 'https://res.cloudinary.com/dzd47mpdo/image/upload/v1769777716/home_pvawyw.png',
  Support: 'https://res.cloudinary.com/dnyp5jknp/image/upload/v1770900219/customer-support_1_bibfxx.png',
  Profile: 'https://res.cloudinary.com/dnyp5jknp/image/upload/v1770900013/user_bsay8i.png',
};

const NAV_ITEMS = [
  { id: 'my-bids', labelKey: 'navigation.myBets', name: 'Bids' },
  { id: 'funds', labelKey: 'navigation.funds', name: 'Funds' },
  { id: 'home', labelKey: 'navigation.home', name: 'Home', isCenter: true },
  { id: 'support', labelKey: 'navigation.support', name: 'Support' },
  { id: 'profile', labelKey: 'navigation.profile', name: 'Profile' },
];

function BottomNavbar() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const isActive = (name) => {
    if (name === 'Home') return route.name === 'Home';
    if (name === 'Support') return route.name === 'Support' || route.name === 'SupportNew' || route.name === 'SupportStatus';
    return route.name === name;
  };

  // Frontend: paddingBottom max(0.375rem, safe-area), paddingLeft/Right max(0.5rem, safe-area)
  const paddingBottom = Math.max(6, insets.bottom);
  const paddingLeft = Math.max(8, insets.left);
  const paddingRight = Math.max(8, insets.right);

  return (
    <View style={[styles.container, { paddingBottom, paddingLeft, paddingRight }]}>
      <View style={styles.backplate} />
      <View style={styles.inner}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.name);
          if (item.isCenter) {
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.centerBtn, active && styles.centerBtnActive]}
                onPress={() => navigation.navigate(item.name)}
                activeOpacity={0.9}
              >
                <View style={[styles.centerIconWrap, active && styles.centerIconWrapActive]}>
                  <Image
                    source={{ uri: NAV_ICONS.Home }}
                    style={[styles.centerIcon, active && styles.centerIconActive]}
                    resizeMode="contain"
                  />
                </View>
                <Text style={[styles.label, styles.centerLabel, active && styles.labelActive]}>{t(item.labelKey)}</Text>
              </TouchableOpacity>
            );
          }
          return (
            <TouchableOpacity
              key={item.id}
              style={styles.tab}
              onPress={() => navigation.navigate(item.name)}
              activeOpacity={0.95}
            >
              <Image
                source={{ uri: NAV_ICONS[item.name] }}
                style={[styles.tabIcon, active && styles.tabIconActive]}
                resizeMode="contain"
              />
              <View style={styles.dotWrap}>
                {active && <View style={styles.dot} />}
              </View>
              <Text style={[styles.label, active && styles.labelActive]}>{t(item.labelKey)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: spacing[2],
    zIndex: 9999,
    elevation: 9999,
  },
  backplate: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.black,
  },
  // Frontend: relative bg-black rounded-2xl border border-gray-700 shadow-[0_2px_12px_rgba(0,0,0,0.4)] flex items-end justify-around px-0.5 py-1.5 min-h-[52px]
  inner: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    backgroundColor: colors.black,
    borderRadius: 16, // rounded-2xl
    borderWidth: 1,
    borderColor: '#374151', // border-gray-700
    paddingVertical: 6,   // py-1.5
    paddingHorizontal: 2, // px-0.5
    minHeight: 52,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  // Frontend: flex flex-col items-center justify-center gap-0.5 px-1 py-1 rounded-lg min-w-[48px]
  tab: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,       // gap-0.5
    paddingVertical: 4,   // py-1
    paddingHorizontal: 4, // px-1
    borderRadius: 8,      // rounded-lg
    minWidth: 48,
  },
  tabIcon: {
    width: 20,    // w-5 h-5
    height: 20,
    opacity: 0.9,
    tintColor: colors.text, // inactive: white (brightness(0)_invert(1))
  },
  tabIconActive: {
    opacity: 1,
    tintColor: colors.goldLight, // active: gold
    transform: [{ scale: 1.05 }], // scale-105
  },
  // Frontend: h-1 w-full flex justify-center for active dot
  dotWrap: {
    height: 4,   // h-1
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 4,      // w-1 h-1 rounded-full bg-[#f3b61b]
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.goldLight,
  },
  // Frontend: text-[9px] font-bold, active text-[#f3b61b] else text-white
  label: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.text,
  },
  labelActive: {
    color: colors.goldLight,
  },
  // Frontend: -mt-4 relative z-10 for center button
  centerBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -16, // -mt-4
  },
  centerBtnActive: {},
  // Frontend: w-12 h-12 rounded-full, active: bg-[#f3b61b] ring-2 ring-[#f3b61b]/60 ring-offset-1, inactive: bg-gray-800 border border-gray-700, shadow-[0_2px_8px_rgba(0,0,0,0.35)]
  centerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.gray800,
    borderWidth: 1,
    borderColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  centerIconWrapActive: {
    backgroundColor: colors.goldLight, // #f3b61b
    borderWidth: 2,
    borderColor: 'rgba(243,182,27,0.6)', // ring-[#f3b61b]/60
    shadowColor: colors.goldLight,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
    transform: [{ scale: 1.05 }], // scale-105
  },
  centerIcon: {
    width: 20,    // match frontend w-5 h-5 inside circle
    height: 20,
    tintColor: colors.text, // inactive: white
  },
  centerIconActive: {
    tintColor: colors.black, // active: brightness(0) on yellow bg
  },
  // Frontend: center label mt-0.5
  centerLabel: {
    marginTop: 2,
  },
});
export default React.memo(BottomNavbar);

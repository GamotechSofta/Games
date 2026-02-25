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
  SupportNew: 'https://res.cloudinary.com/dnyp5jknp/image/upload/v1770900219/customer-support_1_bibfxx.png',
  Profile: 'https://res.cloudinary.com/dnyp5jknp/image/upload/v1770900013/user_bsay8i.png',
};

const NAV_ITEMS = [
  { id: 'my-bids', labelKey: 'navigation.myBets', name: 'Bids' },
  { id: 'funds', labelKey: 'navigation.funds', name: 'Funds' },
  { id: 'home', labelKey: 'navigation.home', name: 'Home', isCenter: true },
  { id: 'support', labelKey: 'navigation.support', name: 'SupportNew' },
  { id: 'profile', labelKey: 'navigation.profile', name: 'Profile' },
];

export default function BottomNavbar() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const isActive = (name) => {
    if (name === 'Home') return route.name === 'Home';
    return route.name === name;
  };

  const paddingBottom = Math.max(6, insets.bottom);
  const paddingHorizontal = Math.max(8, insets.left);

  return (
    <View style={[styles.container, { paddingBottom, paddingLeft: paddingHorizontal, paddingRight: paddingHorizontal }]}>
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
                <Text style={[styles.label, active && styles.labelActive]}>{t(item.labelKey)}</Text>
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
  inner: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    backgroundColor: colors.black,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: '#374151',
    paddingVertical: 6,
    paddingHorizontal: 2,
    minHeight: 52,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    minWidth: 48,
  },
  tabIcon: {
    width: 20,
    height: 20,
    marginBottom: 2,
    opacity: 0.9,
    tintColor: colors.text,
  },
  tabIconActive: {
    opacity: 1,
    tintColor: colors.goldLight,
  },
  dotWrap: {
    height: 4,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.goldLight,
  },
  label: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.text,
  },
  labelActive: {
    color: colors.goldLight,
  },
  centerBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -16,
  },
  centerBtnActive: {},
  centerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.gray800,
    borderWidth: 1,
    borderColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerIconWrapActive: {
    backgroundColor: '#f3b61b',
    borderWidth: 2,
    borderColor: 'rgba(243,182,27,0.6)',
    shadowColor: '#f3b61b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  centerIcon: {
    width: 22,
    height: 22,
    tintColor: colors.text,
  },
  centerIconActive: {
    tintColor: colors.black,
  },
});

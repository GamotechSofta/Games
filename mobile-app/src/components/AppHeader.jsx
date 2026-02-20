import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../hooks/useTranslation';
import { getBalance, updateUserBalance } from '../api/bets';
import { getNotificationUnreadCount } from '../utils/notificationCount';
import { storage } from '../utils/storage';
import { on } from '../utils/events';
import LanguageSwitcher from './LanguageSwitcher';
import { colors, spacing, borderRadius, fontSize } from '../theme';

const LOGO_URL = 'https://res.cloudinary.com/dzd47mpdo/image/upload/v1770208855/copy_of_7db585f9-9318-4d5b-af85-3239bd0ae2be_1b90b5.png';

export default function AppHeader() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(null);
  const [notificationCount, setNotificationCount] = useState(0);

  const refreshNotificationCount = useCallback(() => {
    getNotificationUnreadCount().then(setNotificationCount);
  }, []);

  const loadUser = useCallback(async () => {
    const userStr = await storage.getItem('user');
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch {
        setUser(null);
      }
    } else {
      setUser(null);
      setNotificationCount(0);
    }
  }, []);

  const loadBalance = useCallback(async () => {
    const userStr = await storage.getItem('user');
    if (!userStr) return;
    const u = JSON.parse(userStr);
    const b = u?.balance ?? u?.walletBalance ?? u?.wallet ?? 0;
    setBalance(Number(b));
  }, []);

  useEffect(() => {
    loadUser();
    loadBalance();
    const fetchBalance = async () => {
      const userStr = await storage.getItem('user');
      if (!userStr) return;
      const res = await getBalance();
      if (res.success && res.data?.balance != null) {
        await updateUserBalance(res.data.balance);
        setBalance(res.data.balance);
      }
    };
    fetchBalance();
    refreshNotificationCount();

    const unsubLogin = on('userLogin', () => {
      loadUser();
      loadBalance();
      refreshNotificationCount();
    });
    const unsubLogout = on('userLogout', () => {
      setUser(null);
      setBalance(0);
      setNotificationCount(0);
    });
    const unsubNotif = on('notificationsSeen', refreshNotificationCount);

    return () => {
      unsubLogin();
      unsubLogout();
      unsubNotif();
    };
  }, [loadUser, loadBalance, refreshNotificationCount]);

  const displayBalance = balance != null ? Number(balance) : 0;
  const formattedBalance = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(displayBalance);

  return (
    <View style={[styles.container, { paddingTop: Math.max(8, insets.top) }]}>
      <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.navigate('Profile')} activeOpacity={0.9}>
        <View style={styles.menuLines}>
          <View style={styles.line} />
          <View style={[styles.line, styles.lineShort]} />
          <View style={[styles.line, styles.lineShorter]} />
        </View>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.logoWrap} activeOpacity={0.9}>
        <Image source={{ uri: LOGO_URL }} style={styles.logo} resizeMode="contain" />
      </TouchableOpacity>
      <View style={styles.right}>
        <LanguageSwitcher />
        <TouchableOpacity style={styles.downloadBtn} onPress={() => navigation.navigate('Download')} activeOpacity={0.9}>
          <Text style={styles.downloadText}>{t('header.downloadApp')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Notifications')} activeOpacity={0.9}>
          <Text style={styles.iconText}>🔔</Text>
          {notificationCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{notificationCount > 99 ? '99+' : notificationCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        {user && (
          <TouchableOpacity style={styles.walletBtn} onPress={() => navigation.navigate('Funds')} activeOpacity={0.9}>
            <Text style={styles.walletText}>₹{formattedBalance}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.black,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: Math.max(12, spacing[3]),
    paddingVertical: 6,
  },
  menuBtn: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLines: { gap: 4 },
  line: { width: 16, height: 2, backgroundColor: colors.text, borderRadius: 1 },
  lineShort: { width: 12 },
  lineShorter: { width: 10 },
  logoWrap: {},
  logo: { width: 100, height: 28 },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  downloadBtn: {
    backgroundColor: colors.goldLight,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: borderRadius.lg,
    minWidth: 36,
    minHeight: 36,
    justifyContent: 'center',
  },
  downloadText: { color: colors.black, fontWeight: '700', fontSize: fontSize.xs },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: { fontSize: 16 },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.red,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: colors.text, fontSize: fontSize['9px'], fontWeight: '700' },
  walletBtn: {
    backgroundColor: colors.surfaceCard,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: borderRadius.lg,
  },
  walletText: { color: colors.text, fontWeight: '700', fontSize: fontSize.sm },
});

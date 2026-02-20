import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../hooks/useTranslation';
import { getNotificationUnreadCount } from '../utils/notificationCount';
import { storage } from '../utils/storage';
import { on } from '../utils/events';
import LanguageSwitcher from './LanguageSwitcher';
import { colors, spacing, borderRadius, fontSize } from '../theme';

// Match frontend AppHeader (mobile): hamburger + logo (Brown_Mascot_Lion), Language, Download (gradient), Notification (#202124, bell, badge)
const LOGO_URL = 'https://res.cloudinary.com/dnyp5jknp/image/upload/v1771571553/Brown_Mascot_Lion_Free_Logo_sfqwsj.png';

export default function AppHeader() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
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

  useEffect(() => {
    loadUser();
    refreshNotificationCount();

    const unsubLogin = on('userLogin', () => {
      loadUser();
      refreshNotificationCount();
    });
    const unsubLogout = on('userLogout', () => {
      setUser(null);
      setNotificationCount(0);
    });
    const unsubNotif = on('notificationsSeen', refreshNotificationCount);

    return () => {
      unsubLogin();
      unsubLogout();
      unsubNotif();
    };
  }, [loadUser, refreshNotificationCount]);

  return (
    <View style={[styles.container, { paddingTop: Math.max(8, insets.top), paddingHorizontal: Math.max(8, insets.left) }]}>
      <View style={styles.left}>
        <TouchableOpacity
          style={styles.menuBtn}
          onPress={() => navigation.navigate('Profile')}
          activeOpacity={0.95}
        >
          <View style={styles.menuLines}>
            <View style={styles.menuLine1} />
            <View style={styles.menuLine2} />
            <View style={styles.menuLine3} />
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.logoWrap} activeOpacity={0.95}>
          <Image source={{ uri: LOGO_URL }} style={styles.logo} resizeMode="contain" />
        </TouchableOpacity>
      </View>
      <View style={styles.right}>
        <LanguageSwitcher />
        <TouchableOpacity style={styles.downloadBtn} onPress={() => navigation.navigate('Download')} activeOpacity={0.95}>
          <Text style={styles.downloadIcon}>↓</Text>
          <Text style={styles.downloadText}>{t('header.downloadApp')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.notifBtn} onPress={() => navigation.navigate('Notifications')} activeOpacity={0.95}>
          <Text style={styles.notifIcon}>🔔</Text>
          {notificationCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{notificationCount > 99 ? '99+' : notificationCount}</Text>
            </View>
          )}
        </TouchableOpacity>
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
    borderBottomColor: 'rgba(255,255,255,0.05)',
    paddingBottom: 6,
    paddingRight: Math.max(8, 12),
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
    minWidth: 0,
  },
  menuBtn: {
    width: 36,
    height: 36,
    minWidth: 36,
    minHeight: 36,
    borderRadius: borderRadius.lg,
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: 'rgba(55,65,81,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLines: { gap: 4 },
  menuLine1: { width: 16, height: 2, backgroundColor: colors.text, borderRadius: 1 },
  menuLine2: { width: 14, height: 2, backgroundColor: colors.text, borderRadius: 1 },
  menuLine3: { width: 12, height: 2, backgroundColor: colors.text, borderRadius: 1 },
  logoWrap: { flexShrink: 0 },
  logo: { height: 28, width: 80 },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
    minWidth: 0,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: borderRadius.lg,
    minWidth: 36,
    minHeight: 36,
    justifyContent: 'center',
    backgroundColor: colors.goldLight,
  },
  downloadIcon: { fontSize: 16, color: colors.black },
  downloadText: { color: colors.black, fontWeight: '700', fontSize: fontSize.xs },
  notifBtn: {
    width: 36,
    height: 36,
    minWidth: 36,
    minHeight: 36,
    borderRadius: borderRadius.lg,
    backgroundColor: '#202124',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifIcon: { fontSize: 16 },
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
});

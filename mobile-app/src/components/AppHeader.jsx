import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Modal, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../hooks/useTranslation';
import { getNotificationUnreadCount } from '../utils/notificationCount';
import { storage } from '../utils/storage';
import { on, emit } from '../utils/events';
import { clearUserAuth } from '../utils/auth';
import LanguageSwitcher from './LanguageSwitcher';
import { colors, spacing, borderRadius, fontSize } from '../theme';

// Match frontend AppHeader: hamburger opens drawer with profile + menu items (My Bets, Funds, Game Rate, Telegram, Help Desk, Share App, Logout)
const LOGO_URL = 'https://res.cloudinary.com/dnyp5jknp/image/upload/v1771571553/Brown_Mascot_Lion_Free_Logo_sfqwsj.png';
const ICON_TELEGRAM = 'https://res.cloudinary.com/dzd47mpdo/image/upload/v1769797952/telegram_yw9hf1.png';
const ICON_MY_BETS = 'https://res.cloudinary.com/dzd47mpdo/image/upload/v1769777192/auction_ofhpps.png';
const ICON_FUNDS = 'https://res.cloudinary.com/dzd47mpdo/image/upload/v1769777500/funding_zjmbzp.png';
const ICON_HELP = 'https://res.cloudinary.com/dzd47mpdo/image/upload/v1769777618/customer-support_du0zcj.png';
const ICON_SHARE = 'https://res.cloudinary.com/dzd47mpdo/image/upload/v1769798998/share_a6shgt.png';
const ICON_LOGOUT = 'https://res.cloudinary.com/dzd47mpdo/image/upload/v1769798997/logout_mttqvy.png';

function AppHeader() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

  const closeMenu = useCallback(() => setIsMenuOpen(false), []);

  const displayName = user?.username || user?.name || t('header.signIn');
  const displayPhone = user?.phone || user?.mobile || user?.mobileNumber || user?.phoneNumber || user?.email || '-';
  const sinceDateRaw = user?.createdAt || user?.created_at;
  const sinceDate = sinceDateRaw ? new Date(sinceDateRaw) : null;
  const sinceText = sinceDate && !Number.isNaN(sinceDate.getTime())
    ? `${t('header.since')} ${sinceDate.toLocaleDateString('en-GB')}`
    : `${t('header.since')} -`;
  const avatarInitial = displayName ? String(displayName).charAt(0).toUpperCase() : 'U';

  const handleProfilePress = () => {
    closeMenu();
    navigation.navigate(user ? 'Profile' : 'Login');
  };

  const handleMenuAction = (item) => {
    closeMenu();
    if (item.key === 'logout') {
      emit('userLogout');
      clearUserAuth();
      return;
    }
    if (item.screen) navigation.navigate(item.screen);
  };

  // Menu items matching frontend hamburger: My Bets, Funds, Update Rate, Telegram, Help Desk, Share App, Logout
  const menuItems = [
    { key: 'myBets', label: t('header.myBets'), screen: 'Bids', icon: 'image', uri: ICON_MY_BETS },
    { key: 'funds', label: t('header.funds'), screen: 'Funds', icon: 'image', uri: ICON_FUNDS },
    { key: 'updateRate', label: t('header.updateRate'), screen: 'GameRate', icon: 'svg' },
    { key: 'telegramChannel', label: t('header.telegramChannel'), screen: 'Support', icon: 'image', uri: ICON_TELEGRAM },
    { key: 'helpDesk', label: t('header.helpDesk'), screen: 'Support', icon: 'image', uri: ICON_HELP },
    { key: 'shareApp', label: t('header.shareApp'), screen: 'Support', icon: 'image', uri: ICON_SHARE },
    { key: 'logout', label: t('header.logout'), screen: null, icon: 'image', uri: ICON_LOGOUT },
  ];

  return (
    <>
      <View style={[styles.container, { paddingTop: Math.max(8, insets.top), paddingHorizontal: Math.max(8, insets.left) }]}>
        <View style={styles.left}>
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => setIsMenuOpen(true)}
            activeOpacity={0.95}
            accessibilityLabel={t('header.openMenu')}
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

      {/* Hamburger drawer - same items as frontend */}
      <Modal visible={isMenuOpen} transparent animationType="fade" onRequestClose={closeMenu}>
        <View style={styles.drawerOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeMenu} />
          <View style={[styles.drawerPanel, { paddingTop: Math.max(16, insets.top) }]}>
            {/* Profile section */}
            <View style={styles.profileSection}>
              <TouchableOpacity style={styles.profileRow} onPress={handleProfilePress} activeOpacity={0.9}>
                <View style={styles.avatarWrap}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{avatarInitial}</Text>
                  </View>
                  {user && <View style={styles.avatarOnline} />}
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName} numberOfLines={1}>{displayName}</Text>
                  <Text style={styles.profilePhone} numberOfLines={1}>{displayPhone}</Text>
                  <Text style={styles.profileSince}>{sinceText}</Text>
                  {user && (
                    <Text style={styles.profileBalance}>
                      ₹ {(Number(user?.balance ?? user?.walletBalance ?? user?.wallet ?? 0) || 0).toLocaleString('en-IN')}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeBtn} onPress={closeMenu} activeOpacity={0.8}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Menu items */}
            <ScrollView style={styles.menuScroll} showsVerticalScrollIndicator={false}>
              {menuItems.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={styles.menuItem}
                  onPress={() => handleMenuAction(item)}
                  activeOpacity={0.9}
                >
                  <View style={styles.menuItemIcon}>
                    {item.icon === 'image' && item.uri ? (
                      <Image source={{ uri: item.uri }} style={styles.menuItemImg} resizeMode="contain" />
                    ) : item.key === 'updateRate' ? (
                      <Text style={styles.menuItemSvg}>₹</Text>
                    ) : null}
                  </View>
                  <Text style={styles.menuItemLabel}>{item.label}</Text>
                  <Text style={styles.menuItemArrow}>›</Text>
                </TouchableOpacity>
              ))}
              <Text style={styles.versionText}>{t('header.version')}</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
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
    paddingVertical: 6,
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
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  drawerPanel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '75%',
    maxWidth: 280,
    backgroundColor: '#0a0a0a',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.05)',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(26,26,26,0.5)',
  },
  profileRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1e1e1e',
    borderWidth: 2,
    borderColor: 'rgba(212,175,55,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: colors.text, fontSize: 18, fontWeight: '700' },
  avatarOnline: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: colors.black,
  },
  profileInfo: { flex: 1, minWidth: 0 },
  profileName: { color: colors.text, fontSize: 14, fontWeight: '700' },
  profilePhone: { color: '#9ca3af', fontSize: 11, marginTop: 2 },
  profileSince: { color: '#6b7280', fontSize: 11, marginTop: 2 },
  profileBalance: { color: colors.goldLight, fontSize: 12, fontWeight: '700', marginTop: 4 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: { color: '#9ca3af', fontSize: 16, fontWeight: '600' },
  menuScroll: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemImg: { width: 22, height: 22 },
  menuItemSvg: { color: colors.text, fontSize: 18, fontWeight: '700' },
  menuItemLabel: { flex: 1, color: colors.text, fontSize: 13, fontWeight: '600' },
  menuItemArrow: { color: 'rgba(255,255,255,0.3)', fontSize: 20, fontWeight: '300' },
  versionText: { textAlign: 'center', color: '#6b7280', fontSize: 10, marginTop: 8, marginBottom: 16 },
});
export default React.memo(AppHeader);

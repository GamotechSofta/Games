import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Clipboard, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation, getLocaleForIntl } from '../hooks/useTranslation';
import { storage } from '../utils/storage';
import { clearUserAuth } from '../utils/auth';
import { colors, spacing, borderRadius, fontSize } from '../theme';

const pick = (obj, keys) => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return '';
};

export default function Profile() {
  const navigation = useNavigation();
  const { t, language } = useTranslation();
  const [user, setUser] = useState(null);
  const [toast, setToast] = useState('');
  const [copiedField, setCopiedField] = useState('');

  useEffect(() => {
    storage.getItem('user').then((raw) => {
      try {
        const u = raw ? JSON.parse(raw) : null;
        if (u) setUser(u);
      } catch { /* ignore */ }
    });
  }, []);

  const form = useMemo(() => {
    const u = user || {};
    return {
      username: pick(u, ['username', 'name', 'fullName']),
      phone: pick(u, ['phone', 'mobile', 'mobileNumber', 'phoneNumber']),
      email: pick(u, ['email']),
      role: pick(u, ['role']),
    };
  }, [user]);

  const walletValue = useMemo(() => {
    const v = pick(user || {}, ['wallet', 'balance', 'points', 'walletAmount', 'amount']);
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }, [user]);

  const userId = user?.id || user?._id || t('profile.na');
  const avatarInitial = (form.username || 'U').charAt(0).toUpperCase();
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(getLocaleForIntl(language), { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  const showToast = (msg) => {
    setToast(msg);
    const timer = setTimeout(() => setToast(''), 2200);
    return () => clearTimeout(timer);
  };

  const handleCopy = (text, label) => {
    if (!text || text === t('profile.notSet') || text === t('profile.na')) return;
    Clipboard.setString(String(text));
    setCopiedField(label);
    setTimeout(() => setCopiedField(''), 1500);
  };

  const handleLogout = () => {
    Alert.alert(
      t('header.logout'),
      t('profile.confirmLogout') || 'Are you sure you want to sign out?',
      [
        { text: t('common.cancel') || 'Cancel', style: 'cancel' },
        { text: t('header.logout'), style: 'destructive', onPress: () => clearUserAuth() },
      ]
    );
  };

  const quickActions = [
    { icon: '+', label: t('funds.addFund'), nav: 'AddFund', iconColor: '#10b981' },
    { icon: '↓', label: t('funds.withdrawFund'), nav: 'WithdrawFund', iconColor: '#3b82f6' },
    { icon: '📖', label: t('passbook.title'), nav: 'Passbook', iconColor: '#8b5cf6' },
    { icon: '📋', label: t('bids.betHistory'), nav: 'BetHistory', iconColor: '#f59e0b' },
  ];

  const menuItems = [
    { icon: '🏦', label: t('funds.bankDetails'), desc: t('profile.managePaymentMethods'), nav: 'Bank' },
    { icon: '❓', label: t('header.helpDesk'), desc: t('profile.getHelpWithAccount'), nav: 'Support' },
  ];

  const infoFields = [
    { icon: '👤', label: t('profile.username'), value: form.username || t('profile.notSet'), copyable: true },
    { icon: '📧', label: t('profile.email'), value: form.email || t('profile.notSet'), copyable: true },
    { icon: '📱', label: t('profile.phone'), value: form.phone || t('profile.notSet'), copyable: true },
    { icon: '⭐', label: t('profile.role'), value: form.role || t('profile.user'), capitalize: true },
  ];

  return (
    <View style={styles.container}>
      {/* Toast */}
      {toast ? (
        <View style={styles.toastWrap} pointerEvents="none">
          <View style={styles.toast}>
            <Text style={styles.toastText}>{toast}</Text>
          </View>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{avatarInitial}</Text>
              </View>
              <View style={styles.onlineDot} />
            </View>
            <View style={styles.heroInfo}>
              <Text style={styles.heroName} numberOfLines={1}>{form.username || t('profile.user')}</Text>
              <View style={styles.badgeRow}>
                <View style={styles.badgeActive}>
                  <Text style={styles.badgeActiveText}>{t('profile.active')}</Text>
                </View>
                {form.role ? (
                  <View style={styles.badgeRole}>
                    <Text style={styles.badgeRoleText}>{form.role === 'User' || form.role === 'user' ? t('profile.user') : form.role}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          {/* Wallet balance */}
          <View style={styles.walletBox}>
            <View>
              <Text style={styles.walletLabel}>{t('profile.walletBalance')}</Text>
              <Text style={styles.walletValue}>
                ₹{walletValue !== null ? walletValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
              </Text>
            </View>
            <View style={styles.walletIcon}>
              <Text style={{ fontSize: 22 }}>💰</Text>
            </View>
          </View>

          {/* Logout button */}
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.8}>
            <Text style={styles.logoutIcon}>→</Text>
            <Text style={styles.logoutText}>{t('header.logout')}</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.label}
              onPress={() => navigation.navigate(action.nav)}
              style={styles.quickBtn}
              activeOpacity={0.8}
            >
              <View style={[styles.quickIconWrap, { backgroundColor: `${action.iconColor}20` }]}>
                <Text style={[styles.quickIconText, { color: action.iconColor }]}>{action.icon}</Text>
              </View>
              <Text style={styles.quickLabel} numberOfLines={2}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Account Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.accountInformation')}</Text>

          {/* User ID */}
          <TouchableOpacity onPress={() => handleCopy(String(userId), t('profile.userId'))} style={styles.infoRow} activeOpacity={0.7}>
            <View style={[styles.infoIcon, { backgroundColor: 'rgba(107,114,128,0.1)' }]}>
              <Text style={{ fontSize: 18 }}>🪪</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t('profile.userId')}</Text>
              <Text style={[styles.infoValue, { fontFamily: 'monospace' }]} numberOfLines={1}>{userId}</Text>
            </View>
            <Text style={[styles.copyIcon, copiedField === t('profile.userId') && { color: '#34d399' }]}>
              {copiedField === t('profile.userId') ? '✓' : '⎘'}
            </Text>
          </TouchableOpacity>

          {infoFields.map((field) => (
            <TouchableOpacity
              key={field.label}
              onPress={() => field.copyable && handleCopy(field.value, field.label)}
              style={styles.infoRow}
              activeOpacity={field.copyable ? 0.7 : 1}
            >
              <View style={styles.infoIcon}>
                <Text style={{ fontSize: 18 }}>{field.icon}</Text>
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{field.label}</Text>
                <Text style={[styles.infoValue, field.capitalize && { textTransform: 'capitalize' }]} numberOfLines={1}>
                  {field.value}
                </Text>
              </View>
              {field.copyable && field.value !== t('profile.notSet') && (
                <Text style={[styles.copyIcon, copiedField === field.label && { color: '#34d399' }]}>
                  {copiedField === field.label ? '✓' : '⎘'}
                </Text>
              )}
            </TouchableOpacity>
          ))}

          {memberSince && (
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: 'rgba(236,72,153,0.1)' }]}>
                <Text style={{ fontSize: 18 }}>📅</Text>
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{t('profile.memberSince')}</Text>
                <Text style={styles.infoValue}>{memberSince}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.settings')}</Text>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.label}
              onPress={() => item.nav ? navigation.navigate(item.nav) : item.onPress?.()}
              style={styles.menuRow}
              activeOpacity={0.8}
            >
              <View style={styles.menuIcon}>
                <Text style={{ fontSize: 20 }}>{item.icon}</Text>
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuDesc}>{item.desc}</Text>
              </View>
              <Text style={styles.menuChevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0b' },
  toastWrap: { position: 'absolute', top: 60, left: 0, right: 0, zIndex: 100, alignItems: 'center' },
  toast: { backgroundColor: 'rgba(0,0,0,0.9)', borderWidth: 1, borderColor: 'rgba(212,175,55,0.3)', borderRadius: borderRadius['2xl'], paddingHorizontal: spacing[4], paddingVertical: spacing[3] },
  toastText: { color: '#fde68a', fontSize: fontSize.sm, textAlign: 'center' },
  scroll: { paddingHorizontal: spacing[4], paddingTop: spacing[4] },
  heroCard: { backgroundColor: '#141416', borderRadius: borderRadius['3xl'], borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', padding: spacing[5], marginBottom: spacing[4] },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing[4], marginBottom: spacing[5] },
  avatarWrap: { position: 'relative' },
  avatar: { width: 64, height: 64, borderRadius: borderRadius['2xl'], backgroundColor: colors.goldLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.black, fontSize: 28, fontWeight: '700' },
  onlineDot: { position: 'absolute', bottom: -2, right: -2, width: 16, height: 16, borderRadius: 8, backgroundColor: '#10b981', borderWidth: 2, borderColor: '#141416' },
  heroInfo: { flex: 1 },
  heroName: { color: colors.text, fontSize: fontSize.xl, fontWeight: '700', lineHeight: 24 },
  badgeRow: { flexDirection: 'row', gap: spacing[1], marginTop: spacing[1], flexWrap: 'wrap' },
  badgeActive: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: borderRadius.full, backgroundColor: 'rgba(16,185,129,0.15)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)' },
  badgeActiveText: { color: '#34d399', fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  badgeRole: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: borderRadius.full, backgroundColor: 'rgba(59,130,246,0.15)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)' },
  badgeRoleText: { color: '#60a5fa', fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  walletBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1a1a1a', borderRadius: borderRadius['2xl'], borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', padding: spacing[4], marginBottom: spacing[4] },
  walletLabel: { color: '#9ca3af', fontSize: 10, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  walletValue: { color: colors.goldText, fontSize: 28, fontWeight: '800' },
  walletIcon: { width: 48, height: 48, borderRadius: borderRadius['2xl'], backgroundColor: 'rgba(242,193,78,0.1)', borderWidth: 1, borderColor: 'rgba(242,193,78,0.2)', alignItems: 'center', justifyContent: 'center' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], paddingVertical: spacing[3], borderRadius: borderRadius['2xl'], backgroundColor: '#141416', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  logoutIcon: { color: '#f87171', fontSize: 18 },
  logoutText: { color: '#f87171', fontWeight: '600', fontSize: fontSize.sm },
  quickActions: { flexDirection: 'row', gap: spacing[2], marginBottom: spacing[4] },
  quickBtn: { flex: 1, alignItems: 'center', gap: spacing[2], paddingVertical: spacing[3] },
  quickIconWrap: { width: 44, height: 44, borderRadius: borderRadius.xl, alignItems: 'center', justifyContent: 'center' },
  quickIconText: { fontSize: 22 },
  quickLabel: { color: '#d1d5db', fontSize: 11, fontWeight: '500', lineHeight: 13, textAlign: 'center' },
  section: { backgroundColor: '#141416', borderRadius: borderRadius['3xl'], borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden', marginBottom: spacing[4] },
  sectionTitle: { color: colors.text, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: spacing[5], paddingTop: spacing[5], paddingBottom: spacing[2] },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingHorizontal: spacing[3], paddingVertical: spacing[3] },
  infoIcon: { width: 40, height: 40, borderRadius: borderRadius.xl, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)', flexShrink: 0 },
  infoContent: { flex: 1, minWidth: 0 },
  infoLabel: { color: '#6b7280', fontSize: 10, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { color: colors.text, fontSize: fontSize.sm, fontWeight: '500', marginTop: 2 },
  copyIcon: { color: '#6b7280', fontSize: 18, paddingHorizontal: spacing[1] },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingHorizontal: spacing[3], paddingVertical: spacing[3] },
  menuIcon: { width: 40, height: 40, borderRadius: borderRadius.xl, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)', flexShrink: 0 },
  menuContent: { flex: 1 },
  menuLabel: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600' },
  menuDesc: { color: '#6b7280', fontSize: 12, marginTop: 2 },
  menuChevron: { color: '#6b7280', fontSize: 22, fontWeight: '300' },
});

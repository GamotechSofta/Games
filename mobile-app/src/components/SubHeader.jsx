import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getBalance, updateUserBalance } from '../api/bets';
import { storage } from '../utils/storage';
import { on } from '../utils/events';
import { useTranslation } from '../hooks/useTranslation';
import { colors, spacing, borderRadius, fontSize } from '../theme';

// Match frontend SubHeader (mobile): wallet icon + balance (left), single "Deposit/Withdrawal" button (right), border-t amber-500/60
const WALLET_ICON = 'https://res.cloudinary.com/dnyp5jknp/image/upload/v1771394532/wallet_n1oyef.png';

function SubHeader() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const [balance, setBalance] = useState(null);

  const loadBalance = useCallback(async () => {
    const userStr = await storage.getItem('user');
    if (!userStr) return;
    const u = JSON.parse(userStr);
    const b = u?.balance ?? u?.walletBalance ?? u?.wallet ?? 0;
    setBalance(Number(b));
  }, []);

  const fetchBalanceFromApi = useCallback(async () => {
    const userStr = await storage.getItem('user');
    if (!userStr) return;
    const res = await getBalance();
    if (res.success && res.data?.balance != null) {
      await updateUserBalance(res.data.balance);
      setBalance(res.data.balance);
    }
  }, []);

  useEffect(() => {
    loadBalance();
    fetchBalanceFromApi();
    const unsub = on('userLogin', () => {
      loadBalance();
      fetchBalanceFromApi();
    });
    return () => unsub();
  }, [loadBalance, fetchBalanceFromApi]);

  const displayBalance = balance != null ? Number(balance) : 0;
  const formattedBalance = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(displayBalance);

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Image source={{ uri: WALLET_ICON }} style={styles.walletIcon} resizeMode="contain" />
        <Text style={styles.balance} numberOfLines={1}>{formattedBalance}</Text>
      </View>
      <TouchableOpacity
        style={styles.actionBtn}
        onPress={() => navigation.navigate('Funds')}
        activeOpacity={0.98}
      >
        <Text style={styles.actionText}>{t('header.depositWithdrawal')}</Text>
      </TouchableOpacity>
    </View>
  );
}

// Frontend: h-10 sm:h-11, border-t amber-500/60, wallet w-6 h-6, button rounded-lg bg-[#1a1a1a] border-2 border-amber-400/90
const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.black,
    borderTopWidth: 1,
    borderTopColor: 'rgba(245,158,11,0.6)',
    paddingHorizontal: Math.max(12, spacing[3]),
    paddingVertical: 6,
    minHeight: 40,
    height: 40,
    gap: spacing[2],
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
    minWidth: 0,
  },
  walletIcon: { width: 24, height: 24 },
  balance: { color: colors.text, fontWeight: '700', fontSize: fontSize.sm },
  actionBtn: {
    flexShrink: 0,
    borderRadius: borderRadius.lg,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: 'rgba(251,191,36,0.9)',
    paddingHorizontal: spacing[3],
    paddingVertical: 6,
  },
  actionText: {
    color: colors.text,
    fontSize: fontSize['10px'],
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
export default React.memo(SubHeader);

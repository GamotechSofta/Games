import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getBalance, updateUserBalance } from '../api/bets';
import { storage } from '../utils/storage';
import { on } from '../utils/events';
import { useTranslation } from '../hooks/useTranslation';
import { colors, spacing, borderRadius, fontSize } from '../theme';

const WALLET_ICON = 'https://res.cloudinary.com/dnyp5jknp/image/upload/v1771394532/wallet_n1oyef.png';

export default function SubHeader() {
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

  useEffect(() => {
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
    const unsub = on('userLogin', loadBalance);
    return () => unsub();
  }, [loadBalance]);

  const displayBalance = balance != null ? Number(balance) : 0;
  const formattedBalance = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(displayBalance);

  return (
    <View style={styles.container}>
      <Image source={{ uri: WALLET_ICON }} style={styles.walletIcon} />
      <Text style={styles.balance} numberOfLines={1}>₹{formattedBalance}</Text>
      <View style={styles.spacer} />
      <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Funds')} activeOpacity={0.9}>
        <Text style={styles.actionText}>DEPOSIT</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Funds')} activeOpacity={0.9}>
        <Text style={styles.actionText}>WITHDRAWAL</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.black,
    borderTopWidth: 1,
    borderTopColor: colors.borderAmberStrong,
    paddingHorizontal: Math.max(12, spacing[3]),
    paddingVertical: 6,
    height: 40,
    gap: spacing[2],
  },
  walletIcon: { width: 24, height: 24 },
  balance: { color: colors.text, fontWeight: '700', fontSize: fontSize.sm, flex: 0, maxWidth: 100 },
  spacer: { flex: 1 },
  actionBtn: {
    paddingHorizontal: spacing[3],
    paddingVertical: 6,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.amberBorder,
  },
  actionText: { color: colors.text, fontSize: fontSize['10px'], fontWeight: '700', letterSpacing: 0.5 },
});

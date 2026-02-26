import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../hooks/useTranslation';
import { getRatesCurrent } from '../api/bets';
import { colors, spacing, borderRadius, fontSize } from '../theme';

const DEFAULT_RATES = {
  single: 10, jodi: 100, singlePatti: 150, doublePatti: 300,
  triplePatti: 1000, halfSangam: 5000, fullSangam: 10000,
};

export default function GameRate() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const [rates, setRates] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const GAME_LABELS = [
    { key: 'single', label: t('gameRate.singleDigit') },
    { key: 'jodi', label: t('gameRate.jodi') },
    { key: 'singlePatti', label: t('gameRate.singlePatti') },
    { key: 'doublePatti', label: t('gameRate.doublePatti') },
    { key: 'triplePatti', label: t('gameRate.triplePatti') },
    { key: 'halfSangam', label: t('gameRate.halfSangam') },
    { key: 'fullSangam', label: t('gameRate.fullSangam') },
  ];

  useEffect(() => {
    const fetchRates = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await getRatesCurrent();
        if (res.success && res.data) setRates(res.data);
        else setRates(DEFAULT_RATES);
      } catch { setRates(DEFAULT_RATES); } finally { setLoading(false); }
    };
    fetchRates();
  }, []);

  const rateMap = rates || DEFAULT_RATES;
  const rows = GAME_LABELS.map((g, idx) => ({
    srNo: idx + 1, game: g.label, rate: rateMap[g.key] ?? DEFAULT_RATES[g.key],
  }));

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>{t('header.updateRate')}</Text>
          <Text style={styles.subtitle}>Payout rate per 1 unit bet (1 =)</Text>
        </View>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.goldLight} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.tableWrap} showsVerticalScrollIndicator={false} removeClippedSubviews={true}>
          <View style={styles.table}>
            {/* Header Row */}
            <View style={[styles.tableRow, styles.tableHeaderRow]}>
              <Text style={[styles.tableHeaderCell, { width: 44 }]}>Sr No</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Game</Text>
              <Text style={[styles.tableHeaderCell, { width: 80, textAlign: 'right' }]}>Rate (1 =)</Text>
            </View>
            {/* Data Rows */}
            {rows.map((row, idx) => (
              <View key={row.game} style={[styles.tableRow, idx < rows.length - 1 && styles.tableRowBorder]}>
                <Text style={[styles.tableCell, styles.srNoCell, { width: 44 }]}>{row.srNo}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>{row.game}</Text>
                <Text style={[styles.tableCell, styles.rateCell, { width: 80, textAlign: 'right' }]}>{row.rate}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black, paddingHorizontal: spacing[3] },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingTop: spacing[4], paddingBottom: spacing[2] },
  backBtn: { minWidth: 44, minHeight: 44, borderRadius: borderRadius.xl, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  backIcon: { color: colors.text, fontSize: 20, fontWeight: '600' },
  title: { color: colors.text, fontSize: fontSize.xl, fontWeight: '700' },
  subtitle: { color: '#6b7280', fontSize: fontSize.xs, marginTop: 2 },
  errorBox: { marginTop: spacing[4], padding: spacing[3], borderRadius: borderRadius.xl, backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  errorText: { color: '#f87171', fontSize: fontSize.sm },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tableWrap: { paddingTop: spacing[4], paddingBottom: 100 },
  table: { borderRadius: borderRadius['2xl'], borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.04)' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing[3], paddingHorizontal: spacing[4] },
  tableHeaderRow: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.2)' },
  tableRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  tableHeaderCell: { color: colors.gold, fontWeight: '700', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  tableCell: { color: colors.text, fontSize: fontSize.sm, fontWeight: '500' },
  srNoCell: { color: '#9ca3af' },
  rateCell: { color: colors.gold, fontWeight: '600' },
});

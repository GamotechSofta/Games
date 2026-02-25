import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from '../hooks/useTranslation';
import { API_BASE_URL } from '../config/api';
import { colors, spacing, borderRadius, fontSize } from '../theme';
import { useRefreshOnMarketReset } from '../hooks/useRefreshOnMarketReset';

const toDateKeyIST = (d) => {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(d);
  } catch { return ''; }
};

export default function MarketResultHistory() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const [results, setResults] = useState([]);
  const [resultsLoading, setResultsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const todayKey = useMemo(() => toDateKeyIST(new Date()), []);

  const selectedKey = toDateKeyIST(selectedDate);
  const displayDateStr = selectedDate.toLocaleDateString('en-GB');

  const fetchResults = async () => {
    try {
      setResultsLoading(true);
      const dateKey = toDateKeyIST(selectedDate) || todayKey;
      const res = await fetch(`${API_BASE_URL}/markets/result-history?date=${encodeURIComponent(dateKey)}`);
      const data = await res.json();
      if (data?.success && Array.isArray(data?.data)) setResults(data.data);
    } catch { /* ignore */ } finally {
      setResultsLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    setResultsLoading(true);
    const run = async () => { if (alive) await fetchResults(); };
    run();
    const id = setInterval(run, 30000);
    return () => { alive = false; clearInterval(id); };
  }, [selectedDate]);

  useRefreshOnMarketReset(fetchResults);

  // Clamp future date to today
  const goToPrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  };
  const goToNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    if (toDateKeyIST(d) <= todayKey) setSelectedDate(d);
  };
  const goToToday = () => setSelectedDate(new Date());
  const canGoNext = selectedKey < todayKey;

  const rows = useMemo(() => {
    const list = Array.isArray(results) ? results : [];
    const mapped = list.map((x) => ({
      id: x?._id || `${x?.marketId || ''}-${x?.dateKey || ''}`,
      name: (x?.marketName || '').toString().trim(),
      result: (x?.displayResult || '***-**-***').toString().trim(),
    }));
    mapped.sort((a, b) => a.name.localeCompare(b.name));
    return mapped.filter((x) => x.name);
  }, [results]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Bids')} style={styles.backBtn} activeOpacity={0.8}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>MARKET RESULT HISTORY</Text>
      </View>

      {/* Date Picker Row */}
      <View style={styles.datePicker}>
        <TouchableOpacity onPress={goToPrevDay} style={styles.dateBtnArrow} activeOpacity={0.8}>
          <Text style={styles.dateArrowText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.dateCenter}>
          <Text style={styles.dateLabel}>{t('bids.selectDate')}</Text>
          <Text style={styles.dateValue}>{displayDateStr}</Text>
        </View>
        <TouchableOpacity onPress={canGoNext ? goToNextDay : undefined} style={[styles.dateBtnArrow, !canGoNext && { opacity: 0.3 }]} activeOpacity={0.8} disabled={!canGoNext}>
          <Text style={styles.dateArrowText}>›</Text>
        </TouchableOpacity>
        {selectedKey !== todayKey && (
          <TouchableOpacity onPress={goToToday} style={styles.todayBtn} activeOpacity={0.8}>
            <Text style={styles.todayText}>Today</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Results */}
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {resultsLoading ? (
          [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <View key={i} style={styles.skeletonCard} />
          ))
        ) : rows.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>{t('bids.noMarketsFound')}</Text>
          </View>
        ) : (
          rows.map((r) => (
            <View key={r.id} style={styles.resultCard}>
              <Text style={styles.marketName} numberOfLines={1}>{r.name.toUpperCase()}</Text>
              <Text style={styles.resultValue}>{r.result}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingHorizontal: spacing[3], paddingTop: spacing[3], paddingBottom: spacing[3] },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  backIcon: { color: colors.text, fontSize: 20, fontWeight: '600' },
  title: { color: colors.text, fontSize: fontSize.lg, fontWeight: '800', letterSpacing: 0.5, flex: 1 },
  datePicker: { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing[3], marginBottom: spacing[3], backgroundColor: '#202124', borderRadius: borderRadius['2xl'], borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: spacing[3] },
  dateBtnArrow: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  dateArrowText: { color: colors.text, fontSize: 28, fontWeight: '300', lineHeight: 32 },
  dateCenter: { flex: 1, alignItems: 'center' },
  dateLabel: { color: '#9ca3af', fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  dateValue: { color: colors.text, fontSize: fontSize.base, fontWeight: '700', marginTop: 2 },
  todayBtn: { marginLeft: spacing[2], paddingHorizontal: spacing[3], paddingVertical: 6, borderRadius: borderRadius.full, backgroundColor: 'rgba(212,175,55,0.2)', borderWidth: 1, borderColor: 'rgba(212,175,55,0.3)' },
  todayText: { color: colors.goldText, fontSize: fontSize.xs, fontWeight: '600' },
  list: { paddingHorizontal: spacing[3], gap: spacing[3], paddingBottom: 100 },
  skeletonCard: { height: 56, borderRadius: borderRadius['2xl'], backgroundColor: '#202124', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  emptyBox: { borderRadius: borderRadius['2xl'], borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: '#202124', padding: spacing[6], alignItems: 'center' },
  emptyText: { color: '#d1d5db', fontSize: fontSize.sm },
  resultCard: { backgroundColor: '#202124', borderRadius: borderRadius['2xl'], borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingHorizontal: spacing[5], paddingVertical: spacing[4], flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[4] },
  marketName: { color: colors.text, fontWeight: '800', letterSpacing: 0.5, flex: 1 },
  resultValue: { color: colors.gold, fontWeight: '800', letterSpacing: 0.5, flexShrink: 0 },
});

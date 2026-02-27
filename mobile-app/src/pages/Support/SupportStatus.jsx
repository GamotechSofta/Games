import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../../hooks/useTranslation';
import { API_BASE_URL } from '../../config/api';
import { storage } from '../../utils/storage';
import { colors, spacing, borderRadius, fontSize } from '../../theme';
import { SkeletonList } from '../../components/Skeleton';
import { haptics } from '../../utils/haptics';

const getStatusColors = (status) => {
  const map = {
    open: { bg: 'rgba(59,130,246,0.2)', text: '#93c5fd', border: 'rgba(59,130,246,0.4)' },
    'in-progress': { bg: 'rgba(245,158,11,0.2)', text: '#fcd34d', border: 'rgba(245,158,11,0.4)' },
    resolved: { bg: 'rgba(34,197,94,0.2)', text: '#86efac', border: 'rgba(34,197,94,0.4)' },
    closed: { bg: 'rgba(107,114,128,0.2)', text: '#9ca3af', border: 'rgba(107,114,128,0.4)' },
  };
  return map[status] || map.closed;
};

const getStatusLabelKey = (status) => {
  const map = { open: 'statusOpen', 'in-progress': 'statusInProgress', resolved: 'statusResolved', closed: 'statusClosed' };
  return map[status] || null;
};

export default function SupportStatus() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [myTickets, setMyTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const userId = user?._id || user?.id;

  useEffect(() => {
    storage.getItem('user').then((raw) => {
      try { setUser(raw ? JSON.parse(raw) : null); } catch { setUser(null); }
    });
  }, []);

  useEffect(() => {
    if (!userId) { setMyTickets([]); return; }
    setLoading(true);
    fetch(`${API_BASE_URL}/help-desk/my-tickets?userId=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((data) => { if (data.success) setMyTickets(data.data || []); })
      .catch(() => setMyTickets([]))
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <View style={styles.container}>
      {/* Header - match frontend: rounded-full back, myTickets + statusAndReplies */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => { haptics.light(); navigation.goBack(); }}
          style={styles.backBtn}
          activeOpacity={0.95}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>{t('support.myTickets')}</Text>
          <Text style={styles.subtitle}>{t('support.statusAndReplies')}</Text>
        </View>
      </View>

      {!userId ? (
        <View style={styles.alertBox}>
          <Text style={styles.alertText}>{t('support.loginRequiredForTickets')}</Text>
        </View>
      ) : loading ? (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          <SkeletonList count={6} />
        </ScrollView>
      ) : myTickets.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>{t('support.noTicketsYet')}</Text>
          <Text style={styles.emptySubtext}>{t('support.sendRequestFromSupport')}</Text>
          <TouchableOpacity
            onPress={() => { haptics.light(); navigation.navigate('Support'); }}
            style={styles.submitBtn}
            activeOpacity={0.8}
          >
            <Text style={styles.submitText}>{t('support.askForHelp')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {myTickets.map((ticket) => {
            const sc = getStatusColors(ticket.status);
            const statusKey = getStatusLabelKey(ticket.status);
            return (
              <View key={ticket._id} style={styles.ticketCard}>
                <View style={styles.ticketTop}>
                  <Text style={styles.ticketSubject} numberOfLines={1}>{ticket.subject}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: sc.bg, borderColor: sc.border }]}>
                    <Text style={[styles.statusText, { color: sc.text }]}>
                      {statusKey ? t(`support.${statusKey}`) : ticket.status}
                    </Text>
                  </View>
                </View>
                {ticket.createdAt ? (
                  <Text style={styles.ticketTime}>
                    {new Date(ticket.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                ) : null}
                <Text style={styles.ticketDesc} numberOfLines={3}>{ticket.description}</Text>
                {ticket.adminResponse ? (
                  <View style={styles.replyBox}>
                    <Text style={styles.replyLabel}>{t('support.replyFromSupport')}</Text>
                    <Text style={styles.replyText}>{ticket.adminResponse}</Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingHorizontal: spacing[4], paddingTop: spacing[4], paddingBottom: spacing[4], marginBottom: spacing[2] },
  backBtn: { minWidth: 44, minHeight: 44, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  backIcon: { color: colors.text, fontSize: 20, fontWeight: '600' },
  headerTextWrap: { flex: 1 },
  title: { color: colors.text, fontSize: fontSize.lg, fontWeight: '700' },
  subtitle: { color: '#6b7280', fontSize: 12 },
  alertBox: { margin: spacing[4], padding: spacing[4], borderRadius: borderRadius['2xl'], backgroundColor: 'rgba(245,158,11,0.1)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' },
  alertText: { color: '#fde68a', fontSize: fontSize.sm, textAlign: 'center' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyBox: { margin: spacing[4], backgroundColor: '#1a1a1a', borderRadius: borderRadius['2xl'], borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: spacing[8], alignItems: 'center', gap: spacing[2] },
  emptyTitle: { color: '#9ca3af', fontSize: fontSize.sm, fontWeight: '500' },
  emptySubtext: { color: '#6b7280', fontSize: fontSize.xs, textAlign: 'center' },
  submitBtn: { marginTop: spacing[4], width: '100%', paddingVertical: spacing[3], borderRadius: borderRadius.xl, backgroundColor: colors.goldLight, alignItems: 'center' },
  submitText: { color: colors.black, fontWeight: '600', fontSize: fontSize.sm },
  list: { paddingHorizontal: spacing[4], gap: spacing[3], paddingBottom: 100 },
  ticketCard: { backgroundColor: '#1a1a1a', borderRadius: borderRadius['2xl'], borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: spacing[4] },
  ticketTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[2] },
  ticketSubject: { color: colors.text, fontWeight: '500', fontSize: fontSize.sm, flex: 1 },
  statusBadge: { paddingHorizontal: spacing[2], paddingVertical: 4, borderRadius: borderRadius.lg, borderWidth: 1, flexShrink: 0 },
  statusText: { fontSize: 11, fontWeight: '600' },
  ticketTime: { color: '#6b7280', fontSize: 11, marginTop: 4 },
  ticketDesc: { color: '#9ca3af', fontSize: fontSize.sm, marginTop: spacing[2], lineHeight: 20 },
  replyBox: { marginTop: spacing[3], paddingTop: spacing[3], borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  replyLabel: { color: '#6b7280', fontSize: 11, marginBottom: 4 },
  replyText: { color: 'rgba(134,239,172,0.9)', fontSize: fontSize.sm, lineHeight: 20 },
});

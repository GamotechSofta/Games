import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../../hooks/useTranslation';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, fontSize } from '../../theme';
import { haptics } from '../../utils/haptics';

// Match frontend SupportLanding: two options with gradient accent, icon box, title, subtitle, chevron; footer hint
const OPTIONS = [
  {
    id: 'new',
    titleKey: 'support.raiseHelpTicket',
    subtitleKey: 'support.submitNewProblem',
    screen: 'SupportNew',
    gradient: ['#f59e0b', '#ea580c'],
    gradientAccent: ['#f59e0b', '#ea580c'],
  },
  {
    id: 'status',
    titleKey: 'support.checkPreviousStatus',
    subtitleKey: 'support.seeStatusAndReply',
    screen: 'SupportStatus',
    gradient: ['#10b981', '#0d9488'],
    gradientAccent: ['#10b981', '#0d9488'],
  },
];

export default function Support() {
  const navigation = useNavigation();
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      {/* Header - match frontend */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => { haptics.light(); navigation.goBack(); }}
          style={styles.backBtn}
          activeOpacity={0.8}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>{t('support.helpDesk')}</Text>
          <Text style={styles.subtitle}>{t('support.chooseOptionBelow')}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.id}
            style={styles.card}
            activeOpacity={0.98}
            onPress={() => { haptics.light(); navigation.navigate(opt.screen); }}
          >
            <LinearGradient
              colors={[opt.gradientAccent[0], opt.gradientAccent[1]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.cardAccent}
            />
            <View style={styles.cardInner}>
              <LinearGradient
                colors={opt.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconWrap}
              >
                <Text style={styles.icon}>{opt.id === 'new' ? '➕' : '📋'}</Text>
              </LinearGradient>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{t(opt.titleKey)}</Text>
                <Text style={styles.cardSubtitle}>{t(opt.subtitleKey)}</Text>
              </View>
              <View style={styles.chevronWrap}>
                <Text style={styles.chevron}>›</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        <Text style={styles.footerHint}>{t('support.responseWithin24h')}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundAlt || '#0a0a0b' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
  },
  backBtn: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { color: colors.text, fontSize: 20, fontWeight: '600' },
  headerTextWrap: { flex: 1, minWidth: 0 },
  title: { color: colors.text, fontSize: fontSize.xl, fontWeight: '700' },
  subtitle: { color: '#6b7280', fontSize: 12, marginTop: 2 },
  scroll: {
    paddingHorizontal: spacing[4],
    paddingTop: 40,
    paddingBottom: 100,
    gap: 20,
  },
  card: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 24,
    paddingHorizontal: spacing[5],
    overflow: 'hidden',
  },
  cardAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    opacity: 0.6,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  icon: { fontSize: 28 },
  cardContent: { flex: 1, minWidth: 0 },
  cardTitle: { color: colors.text, fontSize: fontSize.base, fontWeight: '600' },
  cardSubtitle: { color: '#6b7280', fontSize: fontSize.sm, marginTop: 4, lineHeight: 20 },
  chevronWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: { color: '#9ca3af', fontSize: 22, fontWeight: '300' },
  footerHint: {
    marginTop: 32,
    textAlign: 'center',
    fontSize: 12,
    color: '#4b5563',
  },
});

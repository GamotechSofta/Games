import React from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../../hooks/useTranslation';
import { colors, spacing, borderRadius, fontSize } from '../../theme';

export default function Support() {
    const navigation = useNavigation();
    const { t } = useTranslation();

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>
                <View>
                    <Text style={styles.title}>{t('header.helpDesk')}</Text>
                    <Text style={styles.subtitle}>{t('support.subtitle')}</Text>
                </View>
            </View>
            <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
                <TouchableOpacity onPress={() => navigation.navigate('SupportNew')} style={styles.card} activeOpacity={0.85}>
                    <View style={[styles.iconWrap, { backgroundColor: 'rgba(212,175,55,0.15)' }]}>
                        <Text style={styles.icon}>✉️</Text>
                    </View>
                    <View style={styles.cardContent}>
                        <Text style={styles.cardLabel}>{t('support.title')}</Text>
                        <Text style={styles.cardSubtitle}>{t('support.subtitle')}</Text>
                    </View>
                    <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('SupportStatus')} style={styles.card} activeOpacity={0.85}>
                    <View style={[styles.iconWrap, { backgroundColor: 'rgba(59,130,246,0.15)' }]}>
                        <Text style={styles.icon}>🎫</Text>
                    </View>
                    <View style={styles.cardContent}>
                        <Text style={styles.cardLabel}>{t('support.myTickets')}</Text>
                        <Text style={styles.cardSubtitle}>{t('support.statusAndReplies')}</Text>
                    </View>
                    <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.black },
    header: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingHorizontal: spacing[4], paddingTop: spacing[4], paddingBottom: spacing[3] },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    backIcon: { color: colors.text, fontSize: 20, fontWeight: '600' },
    title: { color: colors.text, fontSize: fontSize.xl, fontWeight: '700' },
    subtitle: { color: '#6b7280', fontSize: 11 },
    list: { paddingHorizontal: spacing[4], gap: spacing[3], paddingBottom: 100 },
    card: { flexDirection: 'row', alignItems: 'center', gap: spacing[4], backgroundColor: '#141416', borderRadius: borderRadius['2xl'], borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', padding: spacing[4] },
    iconWrap: { width: 52, height: 52, borderRadius: borderRadius['2xl'], alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    icon: { fontSize: 26 },
    cardContent: { flex: 1 },
    cardLabel: { color: colors.text, fontSize: fontSize.base, fontWeight: '600' },
    cardSubtitle: { color: '#9ca3af', fontSize: fontSize.xs, marginTop: 3 },
    chevron: { color: '#6b7280', fontSize: 24, fontWeight: '300' },
});

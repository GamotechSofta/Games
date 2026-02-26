import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, Modal, StyleSheet, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '../../hooks/useTranslation';
import { useBettingWindow } from './BettingWindowContext';
import { colors, spacing, borderRadius, fontSize } from '../../theme';
import { storage } from '../../utils/storage';

const WALLET_ICON = 'https://res.cloudinary.com/dnyp5jknp/image/upload/v1771394532/wallet_n1oyef.png';

const getWalletFromStorage = async () => {
    try {
        const s = await storage.getItem('user');
        const u = s ? JSON.parse(s) : null;
        const val = u?.wallet || u?.balance || u?.points || u?.walletAmount || u?.amount || 0;
        const n = Number(val);
        return Number.isFinite(n) ? n : 0;
    } catch {
        return 0;
    }
};

const BidLayout = ({
    market,
    title,
    children,
    bidsCount,
    totalPoints,
    showDateSession = true,
    extraHeader,
    session = 'OPEN',
    setSession = () => { },
    sessionRightSlot = null,
    slotBetweenDateSession = null,
    sessionOptionsOverride = null,
    lockSessionSelect = false,
    hideSessionSelectCaret = false,
    dateSessionControlClassName = '',
    displayDate = null,
    hideFooter = false,
    walletBalance,
    onSubmit = () => { },
    showFooterStats = true,
    submitLabel = 'Submit Bets',
}) => {
    const navigation = useNavigation();
    const route = useRoute();
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const scrollViewRef = useRef(null);
    const { allowed: bettingAllowed, message: bettingMessage } = useBettingWindow();

    const todayDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    const [wallet, setWallet] = React.useState(0);

    useEffect(() => {
        if (Number.isFinite(Number(walletBalance))) {
            setWallet(Number(walletBalance));
        } else {
            getWalletFromStorage().then(setWallet);
        }
    }, [walletBalance]);

    const marketStatus = market?.status;
    const isRunning = marketStatus === 'running';

    const sessionOptions = Array.isArray(sessionOptionsOverride) && sessionOptionsOverride.length
        ? sessionOptionsOverride
        : (isRunning ? ['CLOSE'] : ['OPEN', 'CLOSE']);

    useEffect(() => {
        if (Array.isArray(sessionOptionsOverride) && sessionOptionsOverride.length) {
            const desired = sessionOptionsOverride[0];
            if (desired && session !== desired) setSession(desired);
            return;
        }
        if (isRunning && session !== 'CLOSE') {
            setSession('CLOSE');
        }
    }, [isRunning, session, setSession, sessionOptionsOverride]);

    const handleBack = () => {
        if (!market) {
            if (navigation.canGoBack()) navigation.goBack();
            else navigation.navigate('Home');
            return;
        }
        navigation.navigate('BidOptions', {
            market,
            marketType: route.params?.marketType,
            kingBazaarMarketKey: route.params?.kingBazaarMarketKey,
            starlineMarketKey: route.params?.starlineMarketKey,
        });
    };

    const headerTitle = market?.gameName ? `${market.gameName} - ${title}` : title;

    return (
        <View style={[styles.container, { paddingTop: Math.max(insets.top, 10), paddingLeft: Math.max(insets.left, 0), paddingRight: Math.max(insets.right, 0) }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Text style={styles.backBtnIcon}>←</Text>
                </TouchableOpacity>
                <Text style={styles.title} numberOfLines={1}>{headerTitle?.toUpperCase()}</Text>
                <View style={styles.walletPill}>
                    <Image source={{ uri: WALLET_ICON }} style={styles.walletIcon} resizeMode="contain" />
                    <Text style={styles.walletText}>{wallet.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 0 })}</Text>
                </View>
            </View>

            {/* Error Message */}
            {!bettingAllowed && bettingMessage && (
                <View style={styles.errorBox}>
                    <Text style={styles.errorText}>⚠ {bettingMessage}</Text>
                </View>
            )}

            {extraHeader}

            {/* Date & Session */}
            {showDateSession && (
                <View style={styles.dateSessionRow}>
                    <View style={styles.dateInputWrap}>
                        <Text style={styles.dateIcon}>📅</Text>
                        <Text style={styles.dateText}>{displayDate || todayDate}</Text>
                        {displayDate && displayDate !== todayDate && (
                            <View style={styles.scheduledBadge}>
                                <Text style={styles.scheduledText}>{t('gameBid.scheduled')}</Text>
                            </View>
                        )}
                    </View>

                    {slotBetweenDateSession && (
                        <View style={{ marginHorizontal: 4 }}>
                            {slotBetweenDateSession}
                        </View>
                    )}

                    {!slotBetweenDateSession && (
                        <View style={[styles.sessionWrap, (lockSessionSelect || isRunning) && { opacity: 0.8 }]}>
                            <Modal transparent visible={false}>
                                {/* Replace with picker if needed or custom action sheet. Since this is exact copy, we will use a row of touchables if lockSessionSelect is false, or just a touchable that cycles / shows custom options */}
                            </Modal>
                            {/* For simplicity as RN <select> alternative, we map buttons or toggle if 2 options. The frontend relies on native select. */}
                            {sessionOptions.length === 1 ? (
                                <View style={styles.sessionBtn}>
                                    <Text style={styles.sessionBtnText}>
                                        {session === 'OPEN' ? t('gameBid.open') : session === 'CLOSE' ? t('gameBid.close') : session}
                                    </Text>
                                    {!hideSessionSelectCaret && <Text style={styles.caret}>▼</Text>}
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={styles.sessionBtn}
                                    onPress={() => setSession(session === 'OPEN' ? 'CLOSE' : 'OPEN')}
                                    disabled={lockSessionSelect || isRunning}
                                >
                                    <Text style={styles.sessionBtnText}>
                                        {session === 'OPEN' ? t('gameBid.open') : session === 'CLOSE' ? t('gameBid.close') : session}
                                    </Text>
                                    {!hideSessionSelectCaret && <Text style={styles.caret}>▼</Text>}
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    {sessionRightSlot}
                </View>
            )}

            {/* Content List */}
            <ScrollView
                ref={scrollViewRef}
                style={styles.contentScroll}
                contentContainerStyle={[styles.contentInner, { paddingBottom: hideFooter ? 24 : 140 + Math.max(insets.bottom, 0) }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {children}
            </ScrollView>

            {/* Sticky Footer */}
            {!hideFooter && (
                <View style={[styles.footerContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
                    <View style={[styles.footerCard, !showFooterStats && styles.footerCardNoBg]}>
                        {showFooterStats && (
                            <View style={styles.statsWrap}>
                                <View style={styles.statBlock}>
                                    <Text style={styles.statLabel}>{t('gameBid.bets')}</Text>
                                    <Text style={styles.statVal}>{bidsCount || 0}</Text>
                                </View>
                                <View style={styles.statBlock}>
                                    <Text style={styles.statLabel}>{t('gameBid.points')}</Text>
                                    <Text style={styles.statVal}>{totalPoints || 0}</Text>
                                </View>
                            </View>
                        )}
                        <TouchableOpacity
                            style={[styles.submitBtn, (!bidsCount || !bettingAllowed) && styles.submitBtnDisabled]}
                            onPress={onSubmit}
                            disabled={!bidsCount || !bettingAllowed}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.submitBtnText}>
                                {submitLabel === 'Submit Bets' ? t('gameBid.submitBets') : submitLabel === 'Submit Bet' ? t('gameBid.submitBet') : submitLabel}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.black },
    header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#202124', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    backBtnIcon: { color: colors.white, fontSize: 20 },
    title: { flex: 1, color: colors.white, fontSize: 13, fontWeight: '700', textAlign: 'center', marginHorizontal: 8 },
    walletPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4 },
    walletIcon: { width: 22, height: 22, marginRight: 6 },
    walletText: { color: colors.white, fontSize: 13, fontWeight: '700' },
    errorBox: { marginHorizontal: 16, marginTop: 8, padding: 12, borderRadius: 12, backgroundColor: 'rgba(127,29,29,0.4)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.6)' },
    errorText: { color: '#fecaca', fontSize: 13, fontWeight: '500' },
    dateSessionRow: { flexDirection: 'row', flexWrap: 'nowrap', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16, gap: 10 },
    dateInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#202124', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 24, paddingLeft: 12, paddingRight: 10, minHeight: 44 },
    dateIcon: { fontSize: 16, marginRight: 8, color: '#9ca3af' },
    dateText: { flex: 1, color: colors.white, fontSize: 13, fontWeight: '700', textAlign: 'center' },
    scheduledBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: 'rgba(245,158,11,0.2)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.4)', marginLeft: 6 },
    scheduledText: { color: '#fbbf24', fontSize: 10, fontWeight: '600' },
    sessionWrap: { flex: 1 },
    sessionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#202124', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 24, minHeight: 44, paddingHorizontal: 16 },
    sessionBtnText: { color: colors.white, fontSize: 13, fontWeight: '700', textAlign: 'center', flex: 1 },
    caret: { color: '#9ca3af', fontSize: 10, marginLeft: 8 },
    contentScroll: { flex: 1 },
    contentInner: { paddingHorizontal: 16 },
    footerContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 12, backgroundColor: 'transparent' },
    footerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(32,33,36,0.95)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: 16 },
    footerCardNoBg: { backgroundColor: 'transparent', borderWidth: 0, padding: 0 },
    statsWrap: { flexDirection: 'row', gap: 24, marginRight: 16 },
    statBlock: { alignItems: 'center' },
    statLabel: { color: '#9ca3af', fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
    statVal: { color: '#f2c14e', fontSize: 16, fontWeight: '700' },
    submitBtn: { flex: 1, backgroundColor: '#d4af37', borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
    submitBtnDisabled: { opacity: 0.5 },
    submitBtnText: { color: '#4b3608', fontSize: 14, fontWeight: '700' },
});

export default BidLayout;

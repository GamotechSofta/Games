import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from '../../../hooks/useTranslation';
import { useScheduling } from '../BettingWindowContext';
import BidLayout from '../BidLayout';
import BidReviewModal from './BidReviewModal';
import { getTomorrowIST, isPastClosingTime, formatDateDisplay } from '../../../utils/marketTiming';
import { useFocusEffect } from '@react-navigation/native';
import { placeBet, updateUserBalance, getBalanceForDisplay } from '../../../api/bets';
import { storage } from '../../../utils/storage';
import { SINGLE_PANA_BY_SUM } from '../panaRules';

const sanitizePoints = (v) => (v ?? '').toString().replace(/\D/g, '').slice(0, 6);
const buildSinglePanas = () => Object.keys(SINGLE_PANA_BY_SUM).sort().flatMap((k) => SINGLE_PANA_BY_SUM[k]);

const getWalletFromStorage = async () => {
    try {
        const s = await storage.getItem('user');
        const u = s ? JSON.parse(s) : null;
        const val = u?.wallet || u?.balance || u?.points || u?.amount || 0;
        return Number.isFinite(Number(val)) ? Number(val) : 0;
    } catch {
        return 0;
    }
};

const SinglePanaBulkBid = ({ market, title, scheduleForTomorrow }) => {
    const { t } = useTranslation();
    const { setSelectedDateIST } = useScheduling();
    const [session, setSession] = useState(() => (market?.status === 'running' ? 'CLOSE' : 'OPEN'));
    const [warning, setWarning] = useState('');
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [reviewRows, setReviewRows] = useState([]);
    const [walletBefore, setWalletBefore] = useState(0);
    const [selectedDate, setSelectedDate] = useState(() => {
        if (scheduleForTomorrow) return getTomorrowIST();
        return new Date().toISOString().split('T')[0];
    });

    const showWarning = (msg) => {
        setWarning(msg);
        if (showWarning._t) clearTimeout(showWarning._t);
        showWarning._t = setTimeout(() => setWarning(''), 2200);
    };

    const isRunning = market?.status === 'running';
    useEffect(() => {
        if (isRunning) setSession('CLOSE');
    }, [isRunning]);
    useEffect(() => {
        setSelectedDateIST(selectedDate || null);
    }, [selectedDate, setSelectedDateIST]);
    useEffect(() => {
        getWalletFromStorage().then(setWalletBefore);
    }, []);
    useFocusEffect(React.useCallback(() => { getWalletFromStorage().then(setWalletBefore); }, []));

    const singlePanas = useMemo(() => buildSinglePanas(), []);
    const [specialInputs, setSpecialInputs] = useState(() => Object.fromEntries(singlePanas.map((n) => [n, ''])));
    const [groupBulk, setGroupBulk] = useState(() => Object.fromEntries([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => [String(d), ''])));

    const panasBySumDigit = useMemo(() => ({ ...SINGLE_PANA_BY_SUM }), []);
    const specialCount = useMemo(() => Object.values(specialInputs).filter((v) => Number(v) > 0).length, [specialInputs]);
    const canSubmit = specialCount > 0;
    const totalPoints = useMemo(() => reviewRows.reduce((sum, b) => sum + Number(b.points || 0), 0), [reviewRows]);

    const clearAll = () => {
        setIsReviewOpen(false);
        setReviewRows([]);
        setSpecialInputs(Object.fromEntries(singlePanas.map((n) => [n, ''])));
        setGroupBulk(Object.fromEntries([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => [String(d), ''])));
        setSelectedDate(new Date().toISOString().split('T')[0]);
    };

    const applyGroup = (groupKey, pts) => {
        const p = sanitizePoints(pts);
        const n = Number(p);
        if (!n || n <= 0) { showWarning('Please enter points.'); return; }
        const list = panasBySumDigit[groupKey] || [];
        setSpecialInputs((prev) => {
            const next = { ...prev };
            for (const num of list) {
                const cur = Number(next[num] || 0) || 0;
                next[num] = String(cur + n);
            }
            return next;
        });
        setGroupBulk((prev) => ({ ...prev, [groupKey]: '' }));
    };

    const openReview = async () => {
        const rows = Object.entries(specialInputs)
            .filter(([, pts]) => Number(pts) > 0)
            .map(([num, pts]) => ({ id: `${num}-${pts}-${session}`, number: num, points: String(pts), type: session }));
        if (!rows.length) { showWarning('Please enter points for at least one Single Panna.'); return; }
        setReviewRows(rows);
        const w = await getBalanceForDisplay();
        setWalletBefore(w);
        setIsReviewOpen(true);
    };

    const handleSubmit = async () => {
        const marketId = market?._id || market?.id;
        if (!marketId) throw new Error('Market not found');
        const payload = reviewRows.map((r) => ({
            betType: 'panna',
            betNumber: String(r.number),
            amount: Number(r.points) || 0,
            betOn: String(r?.type || session).toUpperCase() === 'CLOSE' ? 'close' : 'open',
        }));
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedDateObj = new Date(selectedDate);
        selectedDateObj.setHours(0, 0, 0, 0);
        let scheduledDate = selectedDateObj > today ? selectedDate : null;
        if (!scheduledDate && market && isPastClosingTime(market)) scheduledDate = getTomorrowIST();
        const result = await placeBet(marketId, payload, scheduledDate);
        if (!result.success) throw new Error(result.message);
        if (result.data?.newBalance != null) updateUserBalance(result.data.newBalance);
    };

    const marketTitle = market?.gameName || market?.marketName || title;
    const dateText = selectedDate ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/') : new Date().toLocaleDateString('en-GB');

    return (
        <BidLayout market={market} title={title} bidsCount={reviewRows.length} totalPoints={totalPoints} session={session} setSession={setSession} displayDate={formatDateDisplay(selectedDate)} walletBalance={walletBefore} hideFooter onSubmit={openReview} showDateSession>
            <View style={s.content}>
                {warning ? <View style={s.warnBox}><Text style={s.warnText}>{warning}</Text></View> : null}
                <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => {
                        const groupKey = String(d);
                        const list = panasBySumDigit[groupKey] || [];
                        if (!list.length) return null;
                        return (
                            <View key={groupKey} style={s.group}>
                                <View style={s.groupHeader}>
                                    <View style={s.groupLabel}><Text style={s.groupLabelText}>{groupKey}</Text></View>
                                    <TextInput
                                        style={s.groupInput}
                                        value={groupBulk[groupKey]}
                                        onChangeText={(v) => setGroupBulk((p) => ({ ...p, [groupKey]: sanitizePoints(v) }))}
                                        onBlur={() => groupBulk[groupKey] && applyGroup(groupKey, groupBulk[groupKey])}
                                        placeholder={t('gameBid.allPts')}
                                        placeholderTextColor="#6b7280"
                                    />
                                    <TouchableOpacity style={s.applyBtn} onPress={() => groupBulk[groupKey] && applyGroup(groupKey, groupBulk[groupKey])}>
                                        <Text style={s.applyBtnText}>{t('gameBid.apply')}</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={s.panaRow}>
                                    {list.map((num) => (
                                        <View key={num} style={s.panaCell}>
                                            <View style={s.panaLabel}><Text style={s.panaLabelText}>{num}</Text></View>
                                            <TextInput
                                                style={s.panaInput}
                                                value={specialInputs[num]}
                                                onChangeText={(v) => setSpecialInputs((p) => ({ ...p, [num]: sanitizePoints(v) }))}
                                                placeholder={t('gameBid.pts')}
                                                placeholderTextColor="#6b7280"
                                            />
                                        </View>
                                    ))}
                                </View>
                            </View>
                        );
                    })}
                </ScrollView>
                <TouchableOpacity style={[s.submitBtn, !canSubmit && s.submitBtnDisabled]} onPress={openReview} disabled={!canSubmit}>
                    <Text style={s.submitBtnText}>{t('gameBid.submitBet')}</Text>
                </TouchableOpacity>
            </View>
            <BidReviewModal open={isReviewOpen} onClose={clearAll} onSubmit={handleSubmit} marketTitle={marketTitle} dateText={dateText} labelKey={t('gameBid.pana')} rows={reviewRows} walletBefore={walletBefore} totalBids={reviewRows.length} totalAmount={totalPoints} />
        </BidLayout>
    );
};

const s = StyleSheet.create({
    content: { paddingVertical: 8 },
    warnBox: { marginBottom: 12, backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', borderRadius: 12, padding: 12 },
    warnText: { color: '#fca5a5', fontSize: 13 },
    scroll: { maxHeight: 340 },
    group: { marginBottom: 16 },
    groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    groupLabel: { width: 36, height: 36, backgroundColor: '#202124', borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    groupLabelText: { color: '#f2c14e', fontWeight: '700', fontSize: 12 },
    groupInput: { width: 80, height: 36, backgroundColor: '#202124', borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', color: '#fff', textAlign: 'center', fontSize: 12 },
    applyBtn: { paddingHorizontal: 12, height: 36, backgroundColor: '#202124', borderRadius: 6, borderWidth: 1, borderColor: 'rgba(212,175,55,0.4)', alignItems: 'center', justifyContent: 'center' },
    applyBtnText: { color: '#f2c14e', fontWeight: '700', fontSize: 12 },
    panaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    panaCell: { flexDirection: 'row', alignItems: 'center', width: '30%', minWidth: 90 },
    panaLabel: { width: 40, height: 36, backgroundColor: '#202124', borderTopLeftRadius: 6, borderBottomLeftRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    panaLabelText: { color: '#f2c14e', fontWeight: '700', fontSize: 11 },
    panaInput: { flex: 1, height: 36, backgroundColor: '#202124', borderTopRightRadius: 6, borderBottomRightRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', color: '#fff', textAlign: 'center', fontSize: 12 },
    submitBtn: { backgroundColor: '#d4af37', borderRadius: 12, height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
    submitBtnDisabled: { opacity: 0.5 },
    submitBtnText: { color: '#4b3608', fontWeight: '700' },
});

export default SinglePanaBulkBid;

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from '../../../hooks/useTranslation';
import { useScheduling } from '../BettingWindowContext';
import BidLayout from '../BidLayout';
import BidReviewModal from './BidReviewModal';
import { getTomorrowIST, isPastClosingTime, formatDateDisplay } from '../../../utils/marketTiming';
import { useFocusEffect } from '@react-navigation/native';
import { placeBet, updateUserBalance, getBalanceForDisplay } from '../../../api/bets';
import { storage } from '../../../utils/storage';

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const sanitizePoints = (v) => (v ?? '').toString().replace(/\D/g, '').slice(0, 6);

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

const JodiBulkBid = ({ market, title, scheduleForTomorrow }) => {
    const { t } = useTranslation();
    const { setSelectedDateIST } = useScheduling();
    const [session, setSession] = useState('OPEN');
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [warning, setWarning] = useState('');
    const [walletBefore, setWalletBefore] = useState(0);
    const [selectedDate, setSelectedDate] = useState(() => {
        if (scheduleForTomorrow) return getTomorrowIST();
        return new Date().toISOString().split('T')[0];
    });

    const showWarning = (msg) => {
        setWarning(msg);
        if (showWarning._t) clearTimeout(showWarning._t);
        showWarning._t = setTimeout(() => setWarning(''), 2400);
    };

    useEffect(() => {
        if (session !== 'OPEN') setSession('OPEN');
    }, [session]);

    useEffect(() => {
        setSelectedDateIST(selectedDate || null);
    }, [selectedDate, setSelectedDateIST]);

    useEffect(() => {
        getWalletFromStorage().then(setWalletBefore);
    }, []);
    useFocusEffect(React.useCallback(() => { getWalletFromStorage().then(setWalletBefore); }, []));

    const [cells, setCells] = useState(() => {
        const o = {};
        for (const r of DIGITS) for (const c of DIGITS) o[`${r}${c}`] = '';
        return o;
    });

    const rows = useMemo(() => {
        const out = [];
        for (const r of DIGITS) {
            for (const c of DIGITS) {
                const key = `${r}${c}`;
                const pts = Number(cells[key] || 0);
                if (pts > 0) out.push({ id: `${key}-${pts}`, number: key, points: String(pts), type: session });
            }
        }
        return out;
    }, [cells, session]);

    const totalPoints = useMemo(() => rows.reduce((sum, b) => sum + Number(b.points || 0), 0), [rows]);
    const canSubmit = rows.length > 0;
    const marketTitle = market?.gameName || market?.marketName || title;
    const dateText = selectedDate ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/') : new Date().toLocaleDateString('en-GB');

    const clearAll = () => {
        setIsReviewOpen(false);
        setCells(() => {
            const o = {};
            for (const r of DIGITS) for (const c of DIGITS) o[`${r}${c}`] = '';
            return o;
        });
        setSelectedDate(new Date().toISOString().split('T')[0]);
    };

    const handleOpenReview = async () => {
        if (!rows.length) { showWarning('Please enter points for at least one Jodi.'); return; }
        const w = await getBalanceForDisplay();
        setWalletBefore(w);
        setIsReviewOpen(true);
    };

    const handleConfirmReview = async () => {
        const marketId = market?._id || market?.id;
        if (!marketId) throw new Error('Market not found');
        const payload = rows.map((r) => ({ betType: 'jodi', betNumber: String(r.number), amount: Number(r.points) || 0, betOn: 'open' }));
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

    return (
        <BidLayout
            market={market}
            title={title}
            bidsCount={rows.length}
            totalPoints={totalPoints}
            session={session}
            setSession={setSession}
            sessionOptionsOverride={['OPEN']}
            lockSessionSelect
            hideSessionSelectCaret
            displayDate={formatDateDisplay(selectedDate)}
            walletBalance={walletBefore}
            hideFooter
            onSubmit={handleOpenReview}
        >
            <View style={s.content}>
                {warning ? <View style={s.warnBox}><Text style={s.warnText}>{warning}</Text></View> : null}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.scroll}>
                    <View style={s.grid}>
                        <View style={s.headerRow}>
                            <View style={s.corner} />
                            {DIGITS.map((c) => <Text key={c} style={s.headerCell}>{c}</Text>)}
                        </View>
                        {DIGITS.map((r) => (
                            <View key={r} style={s.row}>
                                <Text style={s.rowLabel}>{r}</Text>
                                {DIGITS.map((c) => {
                                    const key = `${r}${c}`;
                                    return (
                                        <TextInput
                                            key={key}
                                            style={s.cell}
                                            value={cells[key]}
                                            onChangeText={(v) => setCells((p) => ({ ...p, [key]: sanitizePoints(v) }))}
                                            placeholder={t('gameBid.pts')}
                                            placeholderTextColor="rgba(255,255,255,0.3)"
                                            keyboardType="number-pad"
                                        />
                                    );
                                })}
                            </View>
                        ))}
                    </View>
                </ScrollView>
                <TouchableOpacity style={[s.submitBtn, !canSubmit && s.submitBtnDisabled]} onPress={handleOpenReview} disabled={!canSubmit}>
                    <Text style={s.submitBtnText}>{t('gameBid.submitBet')}</Text>
                </TouchableOpacity>
            </View>
            <BidReviewModal open={isReviewOpen} onClose={clearAll} onSubmit={handleConfirmReview} marketTitle={marketTitle} dateText={dateText} labelKey="Jodi" rows={rows} walletBefore={walletBefore} totalBids={rows.length} totalAmount={totalPoints} />
        </BidLayout>
    );
};

const s = StyleSheet.create({
    content: { paddingVertical: 8 },
    warnBox: { marginBottom: 12, backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', borderRadius: 12, padding: 12 },
    warnText: { color: '#fca5a5', fontSize: 13 },
    scroll: { marginBottom: 16 },
    grid: { padding: 4 },
    headerRow: { flexDirection: 'row', marginBottom: 4 },
    corner: { width: 24, height: 28 },
    headerCell: { width: 32, height: 28, textAlign: 'center', color: '#f2c14e', fontWeight: '700', fontSize: 11 },
    row: { flexDirection: 'row', marginBottom: 4, alignItems: 'center' },
    rowLabel: { width: 24, color: '#f2c14e', fontWeight: '700', fontSize: 11, textAlign: 'center' },
    cell: { width: 32, height: 28, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 4, color: '#fff', fontSize: 10, textAlign: 'center', marginHorizontal: 1 },
    submitBtn: { backgroundColor: '#d4af37', borderRadius: 12, height: 48, alignItems: 'center', justifyContent: 'center' },
    submitBtnDisabled: { opacity: 0.5 },
    submitBtnText: { color: '#4b3608', fontWeight: '700' },
});

export default JodiBulkBid;

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { useTranslation } from '../../../hooks/useTranslation';
import { useScheduling } from '../BettingWindowContext';
import BidLayout from '../BidLayout';
import BidReviewModal from './BidReviewModal';
import { getTomorrowIST, isPastClosingTime, formatDateDisplay } from '../../../utils/marketTiming';
import { useFocusEffect } from '@react-navigation/native';
import { placeBet, updateUserBalance, getBalanceForDisplay } from '../../../api/bets';
import { isValidAnyPana } from '../panaRules';
import { storage } from '../../../utils/storage';

const sanitizeDigits = (v, maxLen) => (v ?? '').toString().replace(/\D/g, '').slice(0, maxLen);
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

const FullSangamBid = ({ market, title, scheduleForTomorrow }) => {
    const { t } = useTranslation();
    const { setSelectedDateIST } = useScheduling();
    const [session, setSession] = useState('OPEN');
    const [openPana, setOpenPana] = useState('');
    const [closePana, setClosePana] = useState('');
    const [points, setPoints] = useState('');
    const [openPanaInvalid, setOpenPanaInvalid] = useState(false);
    const [closePanaInvalid, setClosePanaInvalid] = useState(false);
    const [bids, setBids] = useState([]);
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [warning, setWarning] = useState('');
    const [walletBefore, setWalletBefore] = useState(0);
    const [selectedDate, setSelectedDate] = useState(() => scheduleForTomorrow ? getTomorrowIST() : new Date().toISOString().split('T')[0]);

    const showWarning = (msg) => {
        setWarning(msg);
        if (showWarning._t) clearTimeout(showWarning._t);
        showWarning._t = setTimeout(() => setWarning(''), 2200);
    };

    useEffect(() => setSelectedDateIST(selectedDate || null), [selectedDate, setSelectedDateIST]);
    useEffect(() => { getWalletFromStorage().then(setWalletBefore); }, []);
    useFocusEffect(React.useCallback(() => { getWalletFromStorage().then(setWalletBefore); }, []));

    const totalPoints = useMemo(() => bids.reduce((sum, b) => sum + Number(b.points || 0), 0), [bids]);
    const marketTitle = market?.gameName || market?.marketName || title;
    const dateText = selectedDate ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/') : new Date().toLocaleDateString('en-GB');

    const clearAll = () => {
        setIsReviewOpen(false);
        setOpenPana('');
        setClosePana('');
        setPoints('');
        setBids([]);
        setSelectedDate(new Date().toISOString().split('T')[0]);
    };

    const handleSubmitBet = async () => {
        const marketId = market?._id || market?.id;
        if (!marketId) throw new Error('Market not found');
        if (!bids.length) throw new Error('No bets to place');
        const payload = bids.map((b) => ({
            betType: 'full-sangam',
            betNumber: String(b?.number ?? '').trim(),
            amount: Number(b?.points) || 0,
            betOn: 'open',
        })).filter((b) => b.betNumber && b.amount > 0);
        if (!payload.length) throw new Error('No valid bets');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedDateObj = new Date(selectedDate);
        selectedDateObj.setHours(0, 0, 0, 0);
        let scheduledDate = selectedDateObj > today ? selectedDate : null;
        if (!scheduledDate && market && isPastClosingTime(market)) scheduledDate = getTomorrowIST();
        const result = await placeBet(marketId, payload, scheduledDate);
        if (!result.success) throw new Error(result.message);
        if (result.data?.newBalance != null) updateUserBalance(result.data.newBalance);
        // Modal shows success screen; closing and clearAll happen when user taps OK (onClose)
    };

    const handleAdd = () => {
        const pts = Number(points);
        if (!pts || pts <= 0) { showWarning('Please enter points.'); return; }
        if (!isValidAnyPana(openPana)) { showWarning('Open Pana must be a valid Single/Double/Triple Pana (3 digits).'); return; }
        if (!isValidAnyPana(closePana)) { showWarning('Close Pana must be a valid Single/Double/Triple Pana (3 digits).'); return; }
        const numberKey = `${openPana}-${closePana}`;
        setBids((prev) => {
            const idx = prev.findIndex((b) => String(b.number) === numberKey && String(b.type) === session);
            if (idx >= 0) {
                const next = [...prev];
                next[idx] = { ...next[idx], points: String((Number(next[idx].points) || 0) + pts) };
                return next;
            }
            return [...prev, { id: Date.now() + Math.random(), number: numberKey, points: String(pts), type: session }];
        });
        setOpenPana('');
        setClosePana('');
        setPoints('');
    };

    const handleDelete = (id) => setBids((prev) => prev.filter((b) => b.id !== id));
    const openReview = async () => { if (!bids.length) { showWarning('Please add at least one Sangam.'); return; } const w = await getBalanceForDisplay(); setWalletBefore(w); setIsReviewOpen(true); };

    return (
        <BidLayout market={market} title={title} bidsCount={bids.length} totalPoints={totalPoints} showDateSession session={session} setSession={setSession} sessionOptionsOverride={['OPEN']} lockSessionSelect displayDate={formatDateDisplay(selectedDate)} walletBalance={walletBefore} hideFooter onSubmit={openReview}>
            <View style={s.content}>
                {warning ? <View style={s.warnBox}><Text style={s.warnText}>{warning}</Text></View> : null}
                <View style={s.inputRow}>
                    <Text style={s.label}>{t('gameBid.enterOpenPana')}:</Text>
                    <TextInput style={[s.input, openPanaInvalid && s.inputInvalid]} value={openPana} onChangeText={(v) => { const next = sanitizeDigits(v, 3); setOpenPana(next); setOpenPanaInvalid(!!next && next.length === 3 && !isValidAnyPana(next)); }} placeholder={t('gameBid.pana')} placeholderTextColor="#6b7280" maxLength={3} keyboardType="numeric" />
                </View>
                <View style={s.inputRow}>
                    <Text style={s.label}>{t('gameBid.enterClosePana')}:</Text>
                    <TextInput style={[s.input, closePanaInvalid && s.inputInvalid]} value={closePana} onChangeText={(v) => { const next = sanitizeDigits(v, 3); setClosePana(next); setClosePanaInvalid(!!next && next.length === 3 && !isValidAnyPana(next)); }} placeholder={t('gameBid.pana')} placeholderTextColor="#6b7280" maxLength={3} keyboardType="numeric" />
                </View>
                <View style={s.inputRow}>
                    <Text style={s.label}>{t('gameBid.enterPoints')}:</Text>
                    <TextInput style={s.input} value={points} onChangeText={(v) => setPoints(sanitizePoints(v))} placeholder={t('gameBid.point')} placeholderTextColor="#6b7280" keyboardType="numeric" />
                </View>
                <View style={s.btnRow}>
                    <TouchableOpacity style={s.addBtn} onPress={handleAdd}><Text style={s.addBtnText}>{t('gameBid.addToList')}</Text></TouchableOpacity>
                    <TouchableOpacity style={[s.submitBtn, !bids.length && s.submitBtnDisabled]} onPress={openReview} disabled={!bids.length}><Text style={s.submitBtnText}>{t('gameBid.submitBet')}</Text></TouchableOpacity>
                </View>
                {bids.length > 0 && (
                    <View style={s.list}>
                        {bids.map((b) => (
                            <View key={b.id} style={s.listRow}>
                                <Text style={s.listCell}>{b.number}</Text>
                                <Text style={s.listCellGold}>{b.points}</Text>
                                <TouchableOpacity onPress={() => handleDelete(b.id)}><Text style={s.deleteText}>✕</Text></TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}
            </View>
            <BidReviewModal open={isReviewOpen} onClose={clearAll} onSubmit={handleSubmitBet} marketTitle={marketTitle} dateText={dateText} labelKey="Sangam" rows={bids} walletBefore={walletBefore} totalBids={bids.length} totalAmount={totalPoints} />
        </BidLayout>
    );
};

const s = StyleSheet.create({
    content: { paddingHorizontal: 12, paddingTop: 16, paddingBottom: 24 },
    warnBox: { marginBottom: 12, backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', borderRadius: 12, padding: 12 },
    warnText: { color: '#fca5a5', fontSize: 13 },
    inputRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    label: { color: '#9ca3af', fontSize: 13, width: 130 },
    input: { flex: 1, minHeight: 40, backgroundColor: '#202124', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', color: '#fff', textAlign: 'center', fontSize: 13, paddingHorizontal: 12 },
    inputInvalid: { borderColor: '#ef4444' },
    btnRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
    addBtn: { flex: 1, backgroundColor: '#d4af37', borderRadius: 12, height: 48, alignItems: 'center', justifyContent: 'center' },
    addBtnText: { color: '#4b3608', fontWeight: '700' },
    submitBtn: { flex: 1, backgroundColor: '#d4af37', borderRadius: 12, height: 48, alignItems: 'center', justifyContent: 'center' },
    submitBtnDisabled: { opacity: 0.5 },
    submitBtnText: { color: '#4b3608', fontWeight: '700' },
    list: { marginTop: 16 },
    listRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#202124', borderRadius: 8, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    listCell: { flex: 1, color: '#fff', fontSize: 12 },
    listCellGold: { flex: 1, color: '#f2c14e', fontSize: 12, fontWeight: '600' },
    deleteText: { color: '#f87171', padding: 4 },
});

export default FullSangamBid;

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from '../../../hooks/useTranslation';
import BidLayout from '../BidLayout';
import BidReviewModal from './BidReviewModal';
import { getTomorrowIST, isPastClosingTime, formatDateDisplay } from '../../../utils/marketTiming';
import { useFocusEffect } from '@react-navigation/native';
import { placeBet, updateUserBalance, getBalanceForDisplay } from '../../../api/bets';
import { storage } from '../../../utils/storage';

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

const EasyModeBid = ({
    market,
    title,
    label,
    maxLength = 3,
    validateInput,
    showBidsList = false,
    openReviewOnAdd = true,
    showInlineSubmit = false,
    showModeTabs = false,
    specialModeType = null,
    validDoublePanas = [],
    validSinglePanas = [],
    scheduleForTomorrow,
}) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState('easy');
    const lockSessionToOpen = specialModeType === 'jodi';
    const [session, setSession] = useState(() => (lockSessionToOpen ? 'OPEN' : (market?.status === 'running' ? 'CLOSE' : 'OPEN')));
    const [bids, setBids] = useState([]);
    const [reviewRows, setReviewRows] = useState([]);
    const [inputNumber, setInputNumber] = useState('');
    const [inputPoints, setInputPoints] = useState('');
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [warning, setWarning] = useState('');
    const [walletBefore, setWalletBefore] = useState(0);

    const showWarning = (msg) => {
        setWarning(msg);
        if (showWarning._t) clearTimeout(showWarning._t);
        showWarning._t = setTimeout(() => setWarning(''), 2200);
    };

    const isRunning = market?.status === 'running';
    useEffect(() => {
        if (lockSessionToOpen && session !== 'OPEN') setSession('OPEN');
        else if (isRunning) setSession('CLOSE');
    }, [isRunning, lockSessionToOpen, session]);

    useEffect(() => {
        getWalletFromStorage().then(setWalletBefore);
    }, []);
    useFocusEffect(React.useCallback(() => { getWalletFromStorage().then(setWalletBefore); }, []));

    const jodiNumbers = useMemo(() => Array.from({ length: 100 }, (_, i) => String(i).padStart(2, '0')), []);
    const isPanaSumMode = specialModeType === 'doublePana' || specialModeType === 'singlePana';
    const validPanasForSumMode = specialModeType === 'doublePana' ? validDoublePanas : (specialModeType === 'singlePana' ? validSinglePanas : []);

    const [specialInputs, setSpecialInputs] = useState(() => {
        if (specialModeType === 'jodi') return Object.fromEntries(jodiNumbers.map((n) => [n, '']));
        if (isPanaSumMode && validPanasForSumMode?.length) return Object.fromEntries(validPanasForSumMode.map((p) => [p, '']));
        return {};
    });

    const openReviewWithRows = async (rows) => {
        setReviewRows(rows || bids);
        const w = await getBalanceForDisplay();
        setWalletBefore(w);
        setIsReviewOpen(true);
    };

    const defaultValidate = (n) => n && String(n).trim();
    const isValid = validateInput || defaultValidate;

    const mergeBids = (prev, incoming) => {
        const map = new Map();
        for (const b of prev || []) {
            const num = String(b?.number ?? '').trim();
            const type = String(b?.type ?? '').trim();
            map.set(`${num}__${type}`, { ...b, number: num, type, points: String(Number(b?.points || 0) || 0) });
        }
        for (const b of incoming || []) {
            const num = String(b?.number ?? '').trim();
            const type = String(b?.type ?? '').trim();
            const key = `${num}__${type}`;
            const pts = Number(b?.points || 0) || 0;
            const existing = map.get(key);
            if (existing) existing.points = String((Number(existing.points || 0) || 0) + pts);
            else map.set(key, { id: b?.id ?? `${Date.now()}-${Math.random()}`, number: num, points: String(pts), type });
        }
        return Array.from(map.values());
    };

    const handleAddBid = () => {
        const pts = Number(inputPoints);
        const n = (inputNumber ?? '').toString().trim();
        if (!pts || pts <= 0) { showWarning(t('gameBid.pleaseEnterPoints')); return; }
        if (!n) { showWarning(maxLength === 2 ? t('gameBid.pleaseEnterDigit') : `Please enter ${label}.`); return; }
        if (maxLength === 2 && n.length !== 2) { showWarning('Please enter 2-digit (00-99).'); return; }
        if (!isValid(n)) { showWarning(maxLength === 2 ? t('gameBid.invalidDigit') : 'Invalid number.'); return; }
        const bid = { id: Date.now() + Math.random(), number: n, points: String(pts), type: session };
        setBids((prev) => {
            const next = mergeBids(prev, [bid]);
            if (openReviewOnAdd) openReviewWithRows(next);
            return next;
        });
        setInputNumber('');
        setInputPoints('');
    };

    const handleDeleteBid = (id) => setBids((prev) => prev.filter((b) => b.id !== id));

    const handleAddSpecialToList = () => {
        const toAdd = Object.entries(specialInputs)
            .filter(([, pts]) => Number(pts) > 0)
            .map(([num, pts]) => ({ id: Date.now() + Math.random(), number: num, points: String(pts), type: session }));
        if (!toAdd.length) {
            showWarning(specialModeType === 'jodi' ? 'Please enter points for at least one Jodi.' : 'Please enter points for at least one Pana.');
            return;
        }
        setBids((prev) => mergeBids(prev, toAdd));
        if (specialModeType === 'jodi') setSpecialInputs(Object.fromEntries(jodiNumbers.map((n) => [n, ''])));
        else if (validPanasForSumMode?.length) setSpecialInputs(Object.fromEntries(validPanasForSumMode.map((n) => [n, ''])));
    };

    const handleSubmitFromSpecial = () => {
        const toAdd = Object.entries(specialInputs)
            .filter(([, pts]) => Number(pts) > 0)
            .map(([num, pts]) => ({ id: Date.now() + Math.random(), number: num, points: String(pts), type: session }));
        if (!toAdd.length && bids.length === 0) {
            showWarning('Please enter points for at least one.');
            return;
        }
        setBids((prev) => {
            const next = mergeBids(prev, toAdd);
            openReviewWithRows(next);
            return next;
        });
        if (specialModeType === 'jodi') setSpecialInputs(Object.fromEntries(jodiNumbers.map((n) => [n, ''])));
        else if (validPanasForSumMode?.length) setSpecialInputs(Object.fromEntries(validPanasForSumMode.map((n) => [n, ''])));
    };

    const clearAll = () => {
        setIsReviewOpen(false);
        setBids([]);
        setReviewRows([]);
        setInputNumber('');
        setInputPoints('');
        if (specialModeType === 'jodi') setSpecialInputs(Object.fromEntries(jodiNumbers.map((n) => [n, ''])));
        else if (specialModeType === 'doublePana' && validDoublePanas?.length) setSpecialInputs(Object.fromEntries(validDoublePanas.map((n) => [n, ''])));
        else if (specialModeType === 'singlePana' && validSinglePanas?.length) setSpecialInputs(Object.fromEntries(validSinglePanas.map((n) => [n, ''])));
    };

    const handleSubmitBet = async () => {
        const marketId = market?._id || market?.id;
        if (!marketId) throw new Error('Market not found');
        const rows = bids.length ? bids : reviewRows;
        if (!rows.length) throw new Error('No bets to place');
        const betType = specialModeType === 'jodi' ? 'jodi' : (specialModeType === 'singlePana' || specialModeType === 'doublePana' ? 'panna' : 'single');
        const payload = rows.map((r) => ({
            betType,
            betNumber: String(r?.number ?? '').trim(),
            amount: Number(r?.points) || 0,
            betOn: lockSessionToOpen ? 'open' : (String(r?.type || session).toUpperCase() === 'CLOSE' ? 'close' : 'open'),
        })).filter((b) => b.betNumber && b.amount > 0);
        if (!payload.length) throw new Error('No valid bets');
        let scheduledDate = scheduleForTomorrow ? getTomorrowIST() : undefined;
        if (!scheduledDate && market && isPastClosingTime(market)) scheduledDate = getTomorrowIST();
        const result = await placeBet(marketId, payload, scheduledDate);
        if (!result.success) throw new Error(result.message || 'Failed to place bet');
        if (result.data?.newBalance != null) updateUserBalance(result.data.newBalance);
    };

    const totalPoints = bids.reduce((sum, b) => sum + Number(b.points), 0);
    const labelKey = label ? label.split(' ').pop() : 'Number';
    const dateText = scheduleForTomorrow ? new Date(getTomorrowIST() + 'T12:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/') : new Date().toLocaleDateString('en-GB');
    const marketTitle = market?.gameName || market?.marketName || title;
    const formDateDisplay = scheduleForTomorrow ? formatDateDisplay(getTomorrowIST()) : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');

    const canSubmitSpecial = bids.length > 0 || Object.values(specialInputs).some((v) => Number(v) > 0);

    const modeTabs = showModeTabs ? (
        <View style={s.modeRow}>
            <TouchableOpacity style={[s.modeBtn, activeTab === 'easy' && s.modeBtnActive]} onPress={() => setActiveTab('easy')}>
                <Text style={[s.modeBtnText, activeTab === 'easy' ? s.modeTextActive : s.modeTextInactive]}>{t('gameBid.easyMode')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.modeBtn, activeTab === 'special' && s.modeBtnActive]} onPress={() => setActiveTab('special')}>
                <Text style={[s.modeBtnText, activeTab === 'special' ? s.modeTextActive : s.modeTextInactive]}>{t('gameBid.specialMode')}</Text>
            </TouchableOpacity>
        </View>
    ) : null;

    const bidsList = showBidsList && bids.length > 0 ? (
        <View style={s.bidsListWrap}>
            <View style={s.bidsListHeader}>
                <Text style={s.bidsListHeaderText}>{labelKey}</Text>
                <Text style={s.bidsListHeaderText}>{t('gameBid.point')}</Text>
                <Text style={s.bidsListHeaderText}>{t('gameBid.type')}</Text>
                <Text style={s.bidsListHeaderText}>{t('common.delete')}</Text>
            </View>
            {bids.map((bid) => (
                <View key={bid.id} style={s.bidRow}>
                    <Text style={s.bidCell}>{bid.number}</Text>
                    <Text style={s.bidCellGold}>{bid.points}</Text>
                    <Text style={s.bidCellMuted}>{bid.type}</Text>
                    <TouchableOpacity onPress={() => handleDeleteBid(bid.id)}>
                        <Text style={s.deleteText}>✕</Text>
                    </TouchableOpacity>
                </View>
            ))}
        </View>
    ) : null;

    return (
        <BidLayout
            market={market}
            title={title}
            bidsCount={bids.length}
            totalPoints={totalPoints}
            session={session}
            setSession={setSession}
            sessionOptionsOverride={lockSessionToOpen ? ['OPEN'] : null}
            lockSessionSelect={lockSessionToOpen}
            hideSessionSelectCaret={lockSessionToOpen}
            hideFooter={!showInlineSubmit}
            walletBalance={walletBefore}
            onSubmit={() => openReviewWithRows(bids)}
            showDateSession={!!scheduleForTomorrow}
            displayDate={scheduleForTomorrow ? formatDateDisplay(getTomorrowIST()) : undefined}
        >
            <View style={s.content}>
                {showModeTabs && modeTabs}
                {warning ? <View style={s.warnBox}><Text style={s.warnText}>{warning}</Text></View> : null}

                {activeTab === 'special' ? (
                    <>
                        {specialModeType === 'jodi' ? (
                            <ScrollView style={s.specialScroll} showsVerticalScrollIndicator={false}>
                                <View style={s.specialGrid}>
                                    {jodiNumbers.map((num) => (
                                        <View key={num} style={s.specialCell}>
                                            <View style={s.specialLabel}><Text style={s.specialLabelText}>{num}</Text></View>
                                            <TextInput
                                                style={s.specialInput}
                                                placeholder={t('gameBid.pts')}
                                                placeholderTextColor="#6b7280"
                                                value={specialInputs[num] || ''}
                                                onChangeText={(v) => setSpecialInputs((p) => ({ ...p, [num]: v.replace(/\D/g, '').slice(0, 6) }))}
                                            />
                                        </View>
                                    ))}
                                </View>
                                {showInlineSubmit && (
                                    <TouchableOpacity style={[s.submitBtn, !canSubmitSpecial && s.submitBtnDisabled]} onPress={handleSubmitFromSpecial} disabled={!canSubmitSpecial}>
                                        <Text style={s.submitBtnText}>{t('gameBid.submitBet')}</Text>
                                    </TouchableOpacity>
                                )}
                            </ScrollView>
                        ) : (specialModeType === 'doublePana' || specialModeType === 'singlePana') && validPanasForSumMode?.length > 0 ? (
                            <ScrollView style={s.specialScroll} showsVerticalScrollIndicator={false}>
                                <View style={s.inputRow}>
                                    <Text style={s.label}>{t('gameBid.selectGameType')}:</Text>
                                    <View style={s.readOnlyWrap}><Text style={s.readOnlyText}>{session}</Text></View>
                                </View>
                                <View style={s.inputRow}>
                                    <Text style={s.label}>{t('gameBid.enterPoints')}:</Text>
                                    <TextInput style={s.input} value={inputPoints} onChangeText={(v) => setInputPoints(v.replace(/\D/g, '').slice(0, 6))} placeholder={t('gameBid.point')} placeholderTextColor="#6b7280" />
                                </View>
                                <View style={s.specialGrid}>
                                    {validPanasForSumMode.slice(0, 60).map((num) => (
                                        <View key={num} style={s.specialCell}>
                                            <View style={s.specialLabel}><Text style={s.specialLabelText}>{num}</Text></View>
                                            <TextInput style={s.specialInput} placeholder={t('gameBid.pts')} placeholderTextColor="#6b7280" value={specialInputs[num] || ''} onChangeText={(v) => setSpecialInputs((p) => ({ ...p, [num]: v.replace(/\D/g, '').slice(0, 6) }))} />
                                        </View>
                                    ))}
                                </View>
                                {validPanasForSumMode.length > 60 && <Text style={s.moreHint}>+ {validPanasForSumMode.length - 60} more — use Easy Mode for full list</Text>}
                                {showInlineSubmit && (
                                    <TouchableOpacity style={[s.submitBtn, !canSubmitSpecial && s.submitBtnDisabled]} onPress={handleSubmitFromSpecial} disabled={!canSubmitSpecial}>
                                        <Text style={s.submitBtnText}>{t('gameBid.submitBet')}</Text>
                                    </TouchableOpacity>
                                )}
                            </ScrollView>
                        ) : (
                            <View style={s.readOnlyWrap}><Text style={s.readOnlyText}>Special mode — use Easy Mode</Text></View>
                        )}
                        {bidsList}
                    </>
                ) : (
                    <>
                        <View style={s.inputRow}>
                            <Text style={s.label}>{t('gameBid.selectGameType')}:</Text>
                            <View style={s.readOnlyWrap}><Text style={s.readOnlyText}>{session === 'OPEN' ? t('gameBid.open') : t('gameBid.close')}</Text></View>
                        </View>
                        <View style={s.inputRow}>
                            <Text style={s.label}>{label}:</Text>
                            <TextInput style={s.input} value={inputNumber} onChangeText={(v) => { const x = maxLength === 2 ? v.replace(/\D/g, '').slice(0, 2) : v.replace(/\D/g, '').slice(0, maxLength || 3); setInputNumber(x); }} placeholder={labelKey} placeholderTextColor="#6b7280" maxLength={maxLength} />
                        </View>
                        <View style={s.inputRow}>
                            <Text style={s.label}>{t('gameBid.enterPoints')}:</Text>
                            <TextInput style={s.input} value={inputPoints} onChangeText={(v) => setInputPoints(v.replace(/\D/g, '').slice(0, 6))} placeholder={t('gameBid.point')} placeholderTextColor="#6b7280" />
                        </View>
                        <View style={s.btnRow}>
                            <TouchableOpacity style={s.addBtn} onPress={handleAddBid}><Text style={s.addBtnText}>{t('gameBid.addToList')}</Text></TouchableOpacity>
                            {showInlineSubmit && (
                                <TouchableOpacity style={[s.submitBtn, !bids.length && s.submitBtnDisabled]} onPress={() => openReviewWithRows(bids)} disabled={!bids.length}>
                                    <Text style={s.submitBtnText}>{t('gameBid.submitBet')}</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        {bidsList}
                    </>
                )}
            </View>

            <BidReviewModal open={isReviewOpen} onClose={clearAll} onSubmit={handleSubmitBet} marketTitle={marketTitle} dateText={dateText} labelKey={labelKey} rows={bids} walletBefore={walletBefore} totalBids={bids.length} totalAmount={totalPoints} />
        </BidLayout>
    );
};

const s = StyleSheet.create({
    content: { paddingTop: 16 },
    warnBox: { backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', borderRadius: 12, padding: 12, marginBottom: 16 },
    warnText: { color: '#fca5a5', fontSize: 13 },
    modeRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    modeBtn: { flex: 1, height: 44, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    modeBtnActive: { backgroundColor: '#d4af37', borderColor: '#d4af37' },
    modeBtnText: { fontWeight: 'bold' },
    modeTextActive: { color: '#4b3608' },
    modeTextInactive: { color: '#9ca3af' },
    inputRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    label: { color: '#9ca3af', fontSize: 13, width: 120 },
    readOnlyWrap: { flex: 1, minHeight: 40, backgroundColor: '#202124', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    readOnlyText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    input: { flex: 1, minHeight: 40, backgroundColor: '#202124', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', color: '#fff', textAlign: 'center', fontSize: 13, paddingHorizontal: 12 },
    btnRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
    addBtn: { flex: 1, backgroundColor: '#d4af37', borderRadius: 12, height: 48, alignItems: 'center', justifyContent: 'center' },
    addBtnText: { color: '#4b3608', fontWeight: '700' },
    submitBtn: { flex: 1, backgroundColor: '#d4af37', borderRadius: 12, height: 48, alignItems: 'center', justifyContent: 'center' },
    submitBtnDisabled: { opacity: 0.5 },
    submitBtnText: { color: '#4b3608', fontWeight: '700' },
    specialScroll: { maxHeight: 360 },
    specialGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    specialCell: { flexDirection: 'row', alignItems: 'center', width: '30%', minWidth: 100 },
    specialLabel: { width: 44, height: 36, backgroundColor: '#202124', borderTopLeftRadius: 6, borderBottomLeftRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    specialLabelText: { color: '#f2c14e', fontWeight: '700', fontSize: 11 },
    specialInput: { flex: 1, height: 36, backgroundColor: '#202124', borderTopRightRadius: 6, borderBottomRightRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', color: '#fff', textAlign: 'center', fontSize: 12 },
    moreHint: { color: '#9ca3af', fontSize: 11, marginBottom: 8 },
    bidsListWrap: { marginTop: 16 },
    bidsListHeader: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
    bidsListHeaderText: { flex: 1, color: '#d4af37', fontSize: 11, fontWeight: '700', textAlign: 'center' },
    bidRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#202124', borderRadius: 8, padding: 10, marginTop: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    bidCell: { flex: 1, color: '#fff', fontSize: 12, fontWeight: '600', textAlign: 'center' },
    bidCellGold: { flex: 1, color: '#f2c14e', fontSize: 12, fontWeight: '600', textAlign: 'center' },
    bidCellMuted: { flex: 1, color: '#9ca3af', fontSize: 12, textAlign: 'center' },
    deleteText: { color: '#f87171', fontSize: 16, padding: 4 },
});

export default EasyModeBid;

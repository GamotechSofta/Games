import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from '../../../hooks/useTranslation';
import BidLayout from '../BidLayout';
import BidReviewModal from './BidReviewModal';
import { getTomorrowIST, isPastClosingTime, formatDateDisplay } from '../../../utils/marketTiming';
import { placeBet, updateUserBalance, getBalanceForDisplay } from '../../../api/bets';
import { storage } from '../../../utils/storage';
import { colors, spacing, borderRadius } from '../../../theme';

const getWalletFromStorage = async () => {
    try {
        const s = await storage.getItem('user');
        const u = s ? JSON.parse(s) : null;
        const val = u?.wallet ?? u?.balance ?? u?.points ?? 0;
        return Number.isFinite(Number(val)) ? Number(val) : 0;
    } catch { return 0; }
};

const SingleDigitBid = ({ market, title, scheduleForTomorrow }) => {
    const { t } = useTranslation();
    const route = useRoute();
    const sessionPresetRaw = (route.params?.sessionPreset || '').toString().trim().toUpperCase();
    const sessionPreset = (sessionPresetRaw === 'OPEN' || sessionPresetRaw === 'CLOSE') ? sessionPresetRaw : null;
    const isRunningPreset = market?.status === 'running' ? 'CLOSE' : null;
    const effectiveSessionPreset = isRunningPreset || sessionPreset;

    const [activeTab, setActiveTab] = useState('special');
    const [session, setSession] = useState(() => (effectiveSessionPreset || (market?.status === 'running' ? 'CLOSE' : 'OPEN')));
    const [bids, setBids] = useState([]);
    const [inputNumber, setInputNumber] = useState('');
    const [inputPoints, setInputPoints] = useState('');
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [walletBefore, setWalletBefore] = useState(0);
    const [warning, setWarning] = useState('');
    const pointsInputRef = useRef(null);

    useEffect(() => { getWalletFromStorage().then(setWalletBefore); }, []);
    useFocusEffect(React.useCallback(() => { getWalletFromStorage().then(setWalletBefore); }, []));

    const showWarning = (msg) => {
        setWarning(msg);
        if (showWarning._t) clearTimeout(showWarning._t);
        showWarning._t = setTimeout(() => setWarning(''), 2200);
    };

    const [specialModeInputs, setSpecialModeInputs] = useState(
        Object.fromEntries(Array.from({ length: 10 }, (_, i) => [i, '']))
    );

    const resetSpecialInputs = () => setSpecialModeInputs(Object.fromEntries(Array.from({ length: 10 }, (_, i) => [i, ''])));

    const clearAll = () => {
        setIsReviewOpen(false);
        setBids([]);
        setInputNumber('');
        setInputPoints('');
        resetSpecialInputs();
    };

    const handleAddBid = async () => {
        const pts = Number(inputPoints);
        if (!pts || pts <= 0) {
            showWarning(t('gameBid.pleaseEnterPoints'));
            return;
        }
        const n = inputNumber.toString().trim();
        if (!n) {
            showWarning(t('gameBid.pleaseEnterDigit'));
            return;
        }
        if (!/^[0-9]$/.test(n)) {
            showWarning(t('gameBid.invalidDigit'));
            return;
        }
        const next = [...bids, { id: Date.now(), number: n, points: inputPoints, type: session }];
        setBids(next);
        setInputNumber('');
        setInputPoints('');
        const w = await getBalanceForDisplay();
        setWalletBefore(w);
        setIsReviewOpen(true);
    };

    const handleNumberInputChange = (val) => {
        const prevLen = (inputNumber ?? '').toString().length;
        const digit = val.replace(/\D/g, '').slice(-1);
        setInputNumber(digit);
        if (digit && digit.length === 1 && prevLen === 0) {
            // Usually we'd focus next input here in RN, skipping for brevity if ref absent
        }
    };

    const handleAddSpecialModeBids = async () => {
        const toAdd = Object.entries(specialModeInputs)
            .filter(([, pts]) => Number(pts) > 0)
            .map(([num, pts]) => ({ id: Date.now() + parseInt(num, 10), number: num, points: String(pts), type: session }));
        if (toAdd.length === 0) {
            showWarning(t('gameBid.pleaseEnterPointsForDigit'));
            return;
        }
        const next = [...bids, ...toAdd];
        setBids(next);
        resetSpecialInputs();
        const w = await getBalanceForDisplay();
        setWalletBefore(w);
        setIsReviewOpen(true);
    };

    const totalPoints = bids.reduce((sum, b) => sum + Number(b.points), 0);
    const todayDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    const formDateDisplay = scheduleForTomorrow ? formatDateDisplay(getTomorrowIST()) : todayDate;
    const dateText = scheduleForTomorrow
        ? new Date(getTomorrowIST() + 'T12:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/')
        : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/');
    const marketTitle = market?.gameName || market?.marketName || title;
    const isRunning = market?.status === 'running';

    useEffect(() => {
        if (!effectiveSessionPreset) return;
        setSession((s) => (s === effectiveSessionPreset ? s : effectiveSessionPreset));
    }, [effectiveSessionPreset]);

    useEffect(() => {
        if (isRunning) setSession('CLOSE');
    }, [isRunning]);

    const handleCancelBet = () => {
        setIsReviewOpen(false);
        clearAll();
    };

    const handleSubmitBet = async () => {
        const marketId = market?._id || market?.id;
        if (!marketId) throw new Error('Market not found');
        const formattedBids = bids.map((b) => ({
            betType: 'single',
            betNumber: String(b.number),
            amount: Number(b.points) || 0,
            betOn: String(b?.type || session).toUpperCase() === 'CLOSE' ? 'close' : 'open',
        }));
        let scheduledDate = scheduleForTomorrow ? getTomorrowIST() : undefined;
        if (!scheduledDate && market && isPastClosingTime(market)) scheduledDate = getTomorrowIST();
        const result = await placeBet(marketId, formattedBids, scheduledDate);
        if (!result.success) throw new Error(result.message);
        if (result.data?.newBalance != null) updateUserBalance(result.data.newBalance);
        // Modal shows success screen; closing and clearAll happen when user taps OK (onClose)
    };

    const modeTabs = (
        <View style={s.modeRow}>
            <TouchableOpacity onPress={() => setActiveTab('special')} style={[s.modeBtn, activeTab === 'special' ? s.modeBtnActive : s.modeBtnInactive]} activeOpacity={0.98}>
                <Text style={[s.modeBtnText, activeTab === 'special' ? s.modeTextActive : s.modeTextInactive]}>{t('gameBid.specialMode')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveTab('easy')} style={[s.modeBtn, activeTab === 'easy' ? s.modeBtnActive : s.modeBtnInactive]} activeOpacity={0.98}>
                <Text style={[s.modeBtnText, activeTab === 'easy' ? s.modeTextActive : s.modeTextInactive]}>{t('gameBid.easyMode')}</Text>
            </TouchableOpacity>
        </View>
    );

    const dateSessionRow = (
        <View style={s.dateSessionRow}>
            <View style={s.dateInputWrap}>
                <Text style={s.dateIcon}>📅</Text>
                <Text style={s.dateText}>{formDateDisplay}</Text>
            </View>
            <View style={[s.sessionWrap, isRunning && { opacity: 0.8 }]}>
                <View style={s.sessionBtn}>
                    <Text style={s.sessionBtnText}>{session === 'OPEN' ? t('gameBid.open') : t('gameBid.close')}</Text>
                </View>
            </View>
        </View>
    );

    return (
        <BidLayout
            market={market}
            title={title}
            bidsCount={bids.length}
            totalPoints={totalPoints}
            showDateSession={!!scheduleForTomorrow}
            displayDate={scheduleForTomorrow ? formatDateDisplay(getTomorrowIST()) : undefined}
            session={session}
            setSession={setSession}
            sessionOptionsOverride={effectiveSessionPreset ? [effectiveSessionPreset] : null}
            lockSessionSelect={!!effectiveSessionPreset}
            hideSessionSelectCaret={!!effectiveSessionPreset}
            hideFooter
            walletBalance={walletBefore}
        >
            <View style={s.content}>
                {warning ? <View style={s.warnBox}><Text style={s.warnText}>{warning}</Text></View> : null}
                {modeTabs}
                {dateSessionRow}

                {activeTab === 'easy' ? (
                    <View style={s.easyModeBox}>
                        <View style={s.inputRow}>
                            <Text style={s.label}>{t('gameBid.selectGameType')}:</Text>
                            <View style={s.readOnlyWrap}><Text style={s.readOnlyText}>{session === 'OPEN' ? t('gameBid.open') : session === 'CLOSE' ? t('gameBid.close') : session}</Text></View>
                        </View>
                        <View style={s.inputRow}>
                            <Text style={s.label}>{t('gameBid.enterSingleDigit')}:</Text>
                            <TextInput style={s.input} placeholderTextColor="rgba(255,255,255,0.85)" selectionColor="#f2c14e" cursorColor="#fff" keyboardType="numeric" value={inputNumber} onChangeText={handleNumberInputChange} placeholder={t('gameBid.digit')} maxLength={1} />
                        </View>
                        <View style={s.inputRow}>
                            <Text style={s.label}>{t('gameBid.enterPoints')}:</Text>
                            <TextInput style={s.input} placeholderTextColor="rgba(255,255,255,0.85)" selectionColor="#f2c14e" cursorColor="#fff" keyboardType="numeric" value={inputPoints} onChangeText={(val) => setInputPoints(val.replace(/\D/g, '').slice(0, 6))} placeholder={t('gameBid.point')} />
                        </View>
                        <TouchableOpacity style={s.submitBtn} onPress={handleAddBid}>
                            <Text style={s.submitBtnText}>{t('gameBid.add')}</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={s.specialModeBox}>
                        {[[0, 1], [2, 3], [4, 5], [6, 7], [8, 9]].map((pair, rowIdx) => (
                            <View key={rowIdx} style={s.gridRow}>
                                {pair.map((num) => (
                                    <View key={num} style={s.specCell}>
                                        <View style={s.specLabel}><Text style={s.specLabelText}>{num}</Text></View>
                                        <TextInput style={s.specInput} placeholder={t('gameBid.pts')} placeholderTextColor="rgba(255,255,255,0.85)" selectionColor="#f2c14e" cursorColor="#fff" keyboardType="numeric" value={specialModeInputs[num]} onChangeText={(val) => setSpecialModeInputs((p) => ({ ...p, [num]: val.replace(/\D/g, '') }))} />
                                    </View>
                                ))}
                            </View>
                        ))}
                        <TouchableOpacity style={[s.submitBtn, { marginTop: 16 }]} onPress={handleAddSpecialModeBids}>
                            <Text style={s.submitBtnText}>{t('gameBid.addToList')}</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <BidReviewModal
                open={isReviewOpen}
                onClose={handleCancelBet}
                onSubmit={handleSubmitBet}
                marketTitle={marketTitle}
                dateText={dateText}
                labelKey="Digit"
                rows={bids}
                walletBefore={walletBefore}
                totalBids={bids.length}
                totalAmount={totalPoints}
            />
        </BidLayout>
    );
};

const s = StyleSheet.create({
    content: { paddingHorizontal: 12, paddingTop: 16, paddingBottom: 24 },
    warnBox: { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)', borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16 },
    warnText: { color: '#fecaca', fontSize: 14, textAlign: 'center' },
    modeRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    modeBtn: { flex: 1, minHeight: 44, paddingVertical: 12, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    modeBtnActive: { backgroundColor: '#d4af37', borderColor: '#d4af37' },
    modeBtnInactive: { backgroundColor: '#202124', borderColor: 'rgba(255,255,255,0.1)' },
    modeTextActive: { color: '#4b3608', fontWeight: '700', fontSize: 14 },
    modeTextInactive: { color: '#fff', fontWeight: '700', fontSize: 14 },
    dateSessionRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    dateInputWrap: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', backgroundColor: '#202124', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 24, paddingLeft: 36, paddingRight: 10, minHeight: 44, height: 44 },
    dateIcon: { position: 'absolute', left: 12, fontSize: 16, color: '#fff' },
    dateText: { flex: 1, color: colors.white, fontSize: 12, fontWeight: '700', textAlign: 'center', paddingLeft: 8 },
    sessionWrap: { flex: 1, minWidth: 0 },
    sessionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#202124', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 24, minHeight: 44, height: 44, paddingHorizontal: 16 },
    sessionBtnText: { color: colors.white, fontSize: 12, fontWeight: '700' },
    easyModeBox: { gap: 12 },
    inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    label: { color: '#fff', fontSize: 14, fontWeight: '500', width: 128 },
    readOnlyWrap: { flex: 1, minHeight: 40, height: 40, backgroundColor: '#202124', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    readOnlyText: { color: 'white', fontWeight: '700', fontSize: 14 },
    input: { flex: 1, minHeight: 40, height: 40, backgroundColor: '#202124', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', color: 'white', textAlign: 'center', fontSize: 14, fontWeight: '600', paddingHorizontal: 16 },
    submitBtn: { backgroundColor: '#d4af37', borderRadius: 8, minHeight: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
    submitBtnText: { color: '#4b3608', fontWeight: '700', fontSize: 14 },
    specialModeBox: { paddingTop: 8 },
    gridRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    specCell: { flex: 1, flexDirection: 'row', alignItems: 'center', height: 40, minWidth: 0 },
    specLabel: { width: 40, height: 40, backgroundColor: '#202124', borderTopLeftRadius: 6, borderBottomLeftRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRightWidth: 0, alignItems: 'center', justifyContent: 'center' },
    specLabelText: { color: '#f2c14e', fontWeight: '700', fontSize: 14 },
    specInput: { flex: 1, height: 40, backgroundColor: '#202124', borderTopRightRadius: 6, borderBottomRightRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', color: 'white', textAlign: 'center', fontSize: 14, fontWeight: '600', paddingHorizontal: 8 }
});

export default SingleDigitBid;

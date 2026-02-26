import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from '../../../hooks/useTranslation';
import BidLayout from '../BidLayout';
import BidReviewModal from './BidReviewModal';
import { getTomorrowIST, isPastClosingTime, formatDateDisplay } from '../../../utils/marketTiming';
import { placeBet, updateUserBalance, getBalanceForDisplay } from '../../../api/bets';
import { storage } from '../../../utils/storage';
import { colors, borderRadius } from '../../../theme';

const getWalletFromStorage = async () => {
  try {
    const s = await storage.getItem('user');
    const u = s ? JSON.parse(s) : null;
    const val = u?.wallet ?? u?.balance ?? u?.points ?? 0;
    return Number.isFinite(Number(val)) ? Number(val) : 0;
  } catch { return 0; }
};

const isValidTriplePana = (n) => {
    const s = (n ?? '').toString().trim();
    if (!/^[0-9]{3}$/.test(s)) return false;
    return s[0] === s[1] && s[1] === s[2];
};

const TriplePanaBid = ({ market, title, scheduleForTomorrow }) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState('easy');
    const [session, setSession] = useState(() => (market?.status === 'running' ? 'CLOSE' : 'OPEN'));
    const [bids, setBids] = useState([]);
    const [inputNumber, setInputNumber] = useState('');
    const [inputPoints, setInputPoints] = useState('');
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [walletBefore, setWalletBefore] = useState(0);
    const [warning, setWarning] = useState('');

    useEffect(() => { getWalletFromStorage().then(setWalletBefore); }, []);
    useFocusEffect(React.useCallback(() => { getWalletFromStorage().then(setWalletBefore); }, []));

    const showWarning = (msg) => {
        setWarning(msg);
        if (showWarning._t) clearTimeout(showWarning._t);
        showWarning._t = setTimeout(() => setWarning(''), 2200);
    };

    const tripleNumbers = useMemo(() => Array.from({ length: 10 }, (_, i) => `${i}${i}${i}`), []);
    const [specialInputs, setSpecialInputs] = useState(() => Object.fromEntries(tripleNumbers.map((n) => [n, ''])));

    const totalPoints = bids.reduce((sum, b) => sum + Number(b.points || 0), 0);
    const marketTitle = market?.gameName || market?.marketName || title;
    const isRunning = market?.status === 'running';

    useEffect(() => {
        if (isRunning) setSession('CLOSE');
    }, [isRunning]);

    const clearAll = () => {
        setIsReviewOpen(false);
        setBids([]);
        setInputNumber('');
        setInputPoints('');
        setSpecialInputs(Object.fromEntries(tripleNumbers.map((n) => [n, ''])));
    };

    const handleAddBid = () => {
        const pts = Number(inputPoints);
        if (!pts || pts <= 0) {
            showWarning(t('gameBid.pleaseEnterPoints'));
            return;
        }
        const n = inputNumber?.toString().trim() || '';
        if (!n) {
            showWarning(t('gameBid.pleaseEnterTriplePana'));
            return;
        }
        if (!isValidTriplePana(n)) {
            showWarning(t('gameBid.invalidTriplePana'));
            return;
        }

        const next = [...bids, { id: Date.now(), number: n, points: String(pts), type: session }];
        setBids(next);
        setInputNumber('');
        setInputPoints('');
        getBalanceForDisplay().then(setWalletBefore);
        setIsReviewOpen(true);
    };

    const handleAddSpecialModeBids = () => {
        const toAdd = Object.entries(specialInputs)
            .filter(([, pts]) => Number(pts) > 0)
            .map(([num, pts]) => ({ id: Date.now() + Number(num[0]), number: num, points: String(pts), type: session }));

        if (!toAdd.length) {
            showWarning(t('gameBid.pleaseEnterPointsForTriplePana'));
            return;
        }

        const next = [...bids, ...toAdd];
        setBids(next);
        setSpecialInputs(Object.fromEntries(tripleNumbers.map((n) => [n, ''])));
        getBalanceForDisplay().then(setWalletBefore);
        setIsReviewOpen(true);
    };

    const handleNumberInputChange = (val) => {
        const raw = val.replace(/\D/g, '').slice(0, 3);
        if (raw.length < inputNumber.length) {
            setInputNumber('');
            return;
        }
        if (!raw) {
            setInputNumber('');
            return;
        }
        const d = raw[0];
        const nextVal = `${d}${d}${d}`;
        setInputNumber(nextVal);
    };

    const isPanaInvalid = !!inputNumber && inputNumber.length === 3 && !isValidTriplePana(inputNumber);

    const handleSubmitBet = async () => {
        const marketId = market?._id || market?.id;
        if (!marketId) throw new Error('Market not found');
        const payload = bids.map((b) => ({
            betType: 'panna',
            betNumber: String(b.number),
            amount: Number(b.points) || 0,
            betOn: String(b?.type || session).toUpperCase() === 'CLOSE' ? 'close' : 'open',
        }));
        let scheduledDate = scheduleForTomorrow ? getTomorrowIST() : undefined;
        if (!scheduledDate && market && isPastClosingTime(market)) scheduledDate = getTomorrowIST();
        const result = await placeBet(marketId, payload, scheduledDate);
        if (!result.success) throw new Error(result.message);
        if (result.data?.newBalance != null) updateUserBalance(result.data.newBalance);
    };

    const modeTabs = (
        <View style={s.modeRow}>
            <TouchableOpacity onPress={() => setActiveTab('easy')} style={[s.modeBtn, activeTab === 'easy' ? s.modeBtnActive : s.modeBtnInactive]}>
                <Text style={[s.modeBtnText, activeTab === 'easy' ? s.modeTextActive : s.modeTextInactive]}>{t('gameBid.easyMode')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveTab('special')} style={[s.modeBtn, activeTab === 'special' ? s.modeBtnActive : s.modeBtnInactive]}>
                <Text style={[s.modeBtnText, activeTab === 'special' ? s.modeTextActive : s.modeTextInactive]}>{t('gameBid.specialMode')}</Text>
            </TouchableOpacity>
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
            hideFooter
            walletBalance={walletBefore}
        >
            <View style={s.content}>
                {warning ? <View style={s.warnBox}><Text style={s.warnText}>{warning}</Text></View> : null}
                {modeTabs}

                {activeTab === 'easy' ? (
                    <View style={s.easyModeBox}>
                        <View style={s.inputRow}>
                            <Text style={s.label}>{t('gameBid.selectGameType')}:</Text>
                            <View style={s.readOnlyWrap}><Text style={s.readOnlyText}>{session === 'OPEN' ? t('gameBid.open') : session === 'CLOSE' ? t('gameBid.close') : session}</Text></View>
                        </View>
                        <View style={s.inputRow}>
                            <Text style={s.label}>{t('gameBid.enterPana')}:</Text>
                            <TextInput style={[s.input, isPanaInvalid && s.inputError]} inputMode="numeric" value={inputNumber} onChangeText={handleNumberInputChange} placeholder={t('gameBid.pana')} maxLength={3} placeholderTextColor="#6b7280" />
                        </View>
                        <View style={s.inputRow}>
                            <Text style={s.label}>{t('gameBid.enterPoints')}:</Text>
                            <TextInput style={s.input} inputMode="numeric" value={inputPoints} onChangeText={(val) => setInputPoints(val.replace(/\D/g, '').slice(0, 6))} placeholder={t('gameBid.point')} placeholderTextColor="#6b7280" />
                        </View>
                        <TouchableOpacity style={s.submitBtn} onPress={handleAddBid}>
                            <Text style={s.submitBtnText}>{t('gameBid.add')}</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={s.specialModeBox}>
                        <View style={s.gridRow}>
                            {[0, 1, 2, 3, 4].map((num) => (
                                <View key={num} style={s.specCell}>
                                    <View style={s.specLabel}><Text style={s.specLabelText}>{tripleNumbers[num]}</Text></View>
                                    <TextInput style={s.specInput} placeholder={t('gameBid.pts')} placeholderTextColor="#6b7280" inputMode="numeric" value={specialInputs[tripleNumbers[num]]} onChangeText={(val) => setSpecialInputs((p) => ({ ...p, [tripleNumbers[num]]: val.replace(/\D/g, '') }))} />
                                </View>
                            ))}
                        </View>
                        <View style={[s.gridRow, { marginTop: 12 }]}>
                            {[5, 6, 7, 8, 9].map((num) => (
                                <View key={num} style={s.specCell}>
                                    <View style={s.specLabel}><Text style={s.specLabelText}>{tripleNumbers[num]}</Text></View>
                                    <TextInput style={s.specInput} placeholder={t('gameBid.pts')} placeholderTextColor="#6b7280" inputMode="numeric" value={specialInputs[tripleNumbers[num]]} onChangeText={(val) => setSpecialInputs((p) => ({ ...p, [tripleNumbers[num]]: val.replace(/\D/g, '') }))} />
                                </View>
                            ))}
                        </View>
                        <TouchableOpacity style={[s.submitBtn, { marginTop: 24 }]} onPress={handleAddSpecialModeBids}>
                            <Text style={s.submitBtnText}>{t('gameBid.addToList')}</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <BidReviewModal
                open={isReviewOpen}
                onClose={clearAll}
                onSubmit={handleSubmitBet}
                marketTitle={marketTitle}
                dateText={scheduleForTomorrow ? formatDateDisplay(getTomorrowIST()) : formatDateDisplay(new Date().toISOString().slice(0, 10))}
                labelKey={t('gameBid.pana')}
                rows={bids}
                walletBefore={walletBefore}
                totalBids={bids.length}
                totalAmount={totalPoints}
            />
        </BidLayout>
    );
};

const s = StyleSheet.create({
    content: { paddingTop: 16 },
    warnBox: { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16 },
    warnText: { color: '#fca5a5', fontSize: 13, textAlign: 'center' },
    modeRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    modeBtn: { flex: 1, height: 44, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    modeBtnActive: { backgroundColor: '#d4af37', borderColor: '#d4af37' },
    modeBtnInactive: { backgroundColor: '#202124', borderColor: 'rgba(255,255,255,0.1)' },
    modeTextActive: { color: '#4b3608', fontWeight: 'bold' },
    modeTextInactive: { color: '#9ca3af', fontWeight: 'bold' },
    easyModeBox: { gap: 12 },
    inputRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    label: { color: '#9ca3af', fontSize: 13, fontWeight: '500', width: 120 },
    readOnlyWrap: { flex: 1, height: 40, backgroundColor: '#202124', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    readOnlyText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
    input: { flex: 1, height: 40, backgroundColor: '#202124', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', color: 'white', textAlign: 'center', fontSize: 13, fontWeight: '600' },
    inputError: { borderColor: 'red' },
    submitBtn: { backgroundColor: '#d4af37', borderRadius: 12, height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
    submitBtnText: { color: '#4b3608', fontWeight: 'bold', fontSize: 14 },
    specialModeBox: { paddingTop: 8 },
    gridRow: { flexDirection: 'row', gap: 8 },
    specCell: { flex: 1, flexDirection: 'row', alignItems: 'center', height: 40 },
    specLabel: { flex: 0.8, height: '100%', backgroundColor: '#202124', borderTopLeftRadius: 6, borderBottomLeftRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRightWidth: 0, alignItems: 'center', justifyContent: 'center' },
    specLabelText: { color: '#f2c14e', fontWeight: 'bold', fontSize: 13 },
    specInput: { flex: 1, height: '100%', backgroundColor: '#202124', borderTopRightRadius: 6, borderBottomRightRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', color: 'white', textAlign: 'center', fontSize: 13, fontWeight: '600', padding: 0 }
});

export default TriplePanaBid;

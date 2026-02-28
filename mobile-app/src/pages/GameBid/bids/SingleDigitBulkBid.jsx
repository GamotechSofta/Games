import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { useTranslation } from '../../../hooks/useTranslation';
import { bidTokens } from '../../../theme';
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
        const val = u?.wallet || u?.balance || u?.points || u?.walletAmount || u?.wallet_amount || u?.amount || 0;
        const n = Number(val);
        return Number.isFinite(n) ? n : 0;
    } catch {
        return 0;
    }
};

const SingleDigitBulkBid = ({ market, title, scheduleForTomorrow }) => {
    const { t } = useTranslation();
    const [session, setSession] = useState(() => (market?.status === 'running' ? 'CLOSE' : 'OPEN'));
    const [inputPoints, setInputPoints] = useState('');
    const [bids, setBids] = useState([]);
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
        if (isRunning) setSession('CLOSE');
    }, [isRunning]);

    useEffect(() => {
        getWalletFromStorage().then(setWalletBefore);
    }, []);
    useFocusEffect(
        React.useCallback(() => {
            getWalletFromStorage().then(setWalletBefore);
        }, [])
    );

    const handleDigitClick = (num) => {
        const pts = Number(inputPoints);
        if (!pts || pts <= 0) {
            showWarning(t('gameBid.pleaseEnterPoints'));
            return;
        }
        setBids((prev) => [
            ...prev,
            { id: Date.now() + Math.random(), number: String(num), points: String(pts), type: session },
        ]);
    };

    const bulkBidsCount = bids.length;
    const bulkTotalPoints = bids.reduce((sum, b) => sum + Number(b.points || 0), 0);
    const todayDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    const formDateDisplay = scheduleForTomorrow ? formatDateDisplay(getTomorrowIST()) : todayDate;
    const dateText = scheduleForTomorrow ? new Date(getTomorrowIST() + 'T12:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/') : new Date().toLocaleDateString('en-GB');
    const marketTitle = market?.gameName || market?.marketName || title;

    const rows = useMemo(() => {
        const map = new Map();
        for (const b of bids) {
            const num = String(b.number ?? '').trim();
            const type = String(b.type ?? '').trim();
            const key = `${num}__${type}`;
            const prev = map.get(key);
            const pts = Number(b.points || 0) || 0;
            if (prev) {
                prev.points = String((Number(prev.points || 0) || 0) + pts);
            } else {
                map.set(key, { id: key, number: num, points: String(pts), type });
            }
        }
        return Array.from(map.values()).sort((a, c) => {
            if (a.type !== c.type) return a.type.localeCompare(c.type);
            return a.number.localeCompare(c.number);
        });
    }, [bids]);

    const pointsByDigit = bids.reduce((acc, b) => {
        const k = String(b.number);
        acc[k] = (acc[k] || 0) + Number(b.points || 0);
        return acc;
    }, {});

    const clearAll = () => {
        setIsReviewOpen(false);
        setBids([]);
        setInputPoints('');
    };

    const handleSubmitBet = async () => {
        const marketId = market?._id || market?.id;
        if (!marketId) throw new Error('Market not found');
        const payload = rows.map((r) => ({
            betType: 'single',
            betNumber: String(r.number),
            amount: Number(r.points) || 0,
            betOn: String(r?.type || session).toUpperCase() === 'CLOSE' ? 'close' : 'open',
        }));
        let scheduledDate = scheduleForTomorrow ? getTomorrowIST() : undefined;
        if (!scheduledDate && market && isPastClosingTime(market)) scheduledDate = getTomorrowIST();
        const result = await placeBet(marketId, payload, scheduledDate);
        if (!result.success) throw new Error(result.message);
        if (result.data?.newBalance != null) updateUserBalance(result.data.newBalance);
        // Modal shows success screen; closing and clearAll happen when user taps OK (onClose)
    };

    return (
        <BidLayout
            market={market}
            title={title}
            bidsCount={bulkBidsCount}
            totalPoints={bulkTotalPoints}
            showDateSession={!!scheduleForTomorrow}
            displayDate={scheduleForTomorrow ? formatDateDisplay(getTomorrowIST()) : undefined}
            extraHeader={null}
            session={session}
            setSession={setSession}
            hideFooter={false}
            showFooterStats={false}
            submitLabel={t('gameBid.submitBet')}
            walletBalance={walletBefore}
            onSubmit={async () => {
                const w = await getBalanceForDisplay();
                setWalletBefore(w);
                setIsReviewOpen(true);
            }}
        >
            <View style={s.content}>
                {warning ? (
                    <View style={s.warnBox}>
                        <Text style={s.warnText}>{warning}</Text>
                    </View>
                ) : null}
                <View style={s.row}>
                    <View style={s.formCol}>
                        <View style={s.inputRow}>
                            <Text style={s.label}>{t('gameBid.date')}:</Text>
                            <View style={s.readOnlyWrap}>
                                <Text style={s.readOnlyText}>{formDateDisplay}</Text>
                            </View>
                        </View>
                        <View style={s.inputRow}>
                            <Text style={s.label}>{t('gameBid.type')}:</Text>
                            <View style={s.readOnlyWrap}>
                                <Text style={s.readOnlyText}>{session === 'OPEN' ? t('gameBid.open') : t('gameBid.close')}</Text>
                            </View>
                        </View>
                        <View style={s.inputRow}>
                            <Text style={s.label}>{t('gameBid.enterPoints')}:</Text>
                            <TextInput
                                style={s.input}
                                value={inputPoints}
                                onChangeText={(v) => setInputPoints(v.replace(/\D/g, '').slice(0, 6))}
                                placeholder={t('gameBid.point')}
                                placeholderTextColor="rgba(255,255,255,0.85)" selectionColor="#f2c14e" cursorColor="#fff"
                                keyboardType="numeric"
                            />
                        </View>
                    </View>
                    <View style={s.digitGrid}>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                            <TouchableOpacity
                                key={num}
                                style={s.digitBtn}
                                onPress={() => handleDigitClick(num)}
                                activeOpacity={0.8}
                            >
                                <Text style={s.digitBtnText}>{num}</Text>
                                {pointsByDigit[num] > 0 ? (
                                    <Text style={s.digitBadge}>{pointsByDigit[num]}</Text>
                                ) : null}
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity style={[s.digitBtn, s.digitBtnZero]} onPress={() => handleDigitClick(0)} activeOpacity={0.8}>
                            <Text style={s.digitBtnText}>0</Text>
                            {pointsByDigit[0] > 0 ? <Text style={s.digitBadge}>{pointsByDigit[0]}</Text> : null}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <BidReviewModal
                open={isReviewOpen}
                onClose={clearAll}
                onSubmit={handleSubmitBet}
                marketTitle={marketTitle}
                dateText={dateText}
                labelKey="Digit"
                rows={rows}
                walletBefore={walletBefore}
                totalBids={bulkBidsCount}
                totalAmount={bulkTotalPoints}
            />
        </BidLayout>
    );
};

const s = StyleSheet.create({
    content: { paddingHorizontal: 12, paddingTop: 16, paddingBottom: 24 },
    warnBox: { marginBottom: 16, backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', borderRadius: 12, padding: 12 },
    warnText: { color: '#fca5a5', fontSize: 13 },
    row: { gap: 16 },
    formCol: { gap: 8 },
    inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    label: { color: '#fff', fontSize: 12, fontWeight: '500', width: 90 },
    readOnlyWrap: { flex: 1, minHeight: bidTokens.inputHeight, backgroundColor: '#202124', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    readOnlyText: { color: '#fff', fontSize: 12, fontWeight: '700' },
    input: { flex: 1, minHeight: bidTokens.inputHeight, backgroundColor: '#202124', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', color: '#fff', textAlign: 'center', fontSize: 12, fontWeight: '600', paddingHorizontal: 12 },
    digitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 260, alignSelf: 'center' },
    digitBtn: { width: 56, height: 56, backgroundColor: '#202124', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    digitBtnZero: { width: 80 },
    digitBtnText: { color: '#f2c14e', fontSize: 14, fontWeight: '700' },
    digitBadge: { position: 'absolute', top: 4, right: 6, fontSize: 10, fontWeight: '700', color: '#f2c14e' },
});

export default SingleDigitBulkBid;

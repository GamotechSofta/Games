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

    const [rowBulk, setRowBulk] = useState(() => Object.fromEntries(DIGITS.map((d) => [d, ''])));
    const [colBulk, setColBulk] = useState(() => Object.fromEntries(DIGITS.map((d) => [d, ''])));
    const bulkApplyTimers = useRef({});
    const lastAppliedRow = useRef({});
    const lastAppliedCol = useRef({});

    useEffect(() => {
        return () => {
            Object.values(bulkApplyTimers.current).forEach(clearTimeout);
            bulkApplyTimers.current = {};
        };
    }, []);

    const scheduleBulkApply = (type, key, value, applyFn) => {
        const id = `${type}-${key}`;
        if (bulkApplyTimers.current[id]) clearTimeout(bulkApplyTimers.current[id]);
        const val = sanitizePoints(String(value ?? ''));
        if (val) {
            bulkApplyTimers.current[id] = setTimeout(() => {
                applyFn(key, val);
                delete bulkApplyTimers.current[id];
            }, 500);
        }
    };

    const applyRow = (r, pts) => {
        const p = Number(pts);
        if (!p || p <= 0) {
            showWarning('Please enter points.');
            return;
        }
        const lastP = lastAppliedRow.current[r] || 0;
        lastAppliedRow.current[r] = p;
        setCells((prev) => {
            const next = { ...prev };
            for (const c of DIGITS) {
                const key = `${r}${c}`;
                const cur = Number(next[key] || 0) || 0;
                next[key] = String(Math.max(0, cur - lastP + p));
            }
            return next;
        });
    };

    const applyCol = (c, pts) => {
        const p = Number(pts);
        if (!p || p <= 0) {
            showWarning('Please enter points.');
            return;
        }
        const lastP = lastAppliedCol.current[c] || 0;
        lastAppliedCol.current[c] = p;
        setCells((prev) => {
            const next = { ...prev };
            for (const r of DIGITS) {
                const key = `${r}${c}`;
                const cur = Number(next[key] || 0) || 0;
                next[key] = String(Math.max(0, cur - lastP + p));
            }
            return next;
        });
    };

    const clearBulkAndCells = () => {
        Object.values(bulkApplyTimers.current).forEach(clearTimeout);
        bulkApplyTimers.current = {};
        setCells(() => {
            const o = {};
            for (const r of DIGITS) for (const c of DIGITS) o[`${r}${c}`] = '';
            return o;
        });
        setRowBulk(Object.fromEntries(DIGITS.map((d) => [d, ''])));
        setColBulk(Object.fromEntries(DIGITS.map((d) => [d, ''])));
        lastAppliedRow.current = {};
        lastAppliedCol.current = {};
    };

    const clearAll = () => {
        setIsReviewOpen(false);
        clearBulkAndCells();
        setSelectedDate(new Date().toISOString().split('T')[0]);
    };

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
        // Modal shows success screen; closing and clearAll happen when user taps OK (onClose)
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
                        {/* Header Row: Corner + Top Bulk Labels */}
                        <View style={s.headerRow}>
                            <View style={s.cornerWrap}><Text style={s.cornerText}>{t('gameBid.pts')}</Text></View>
                            <View style={s.spacerRow} />
                            {DIGITS.map((c) => (
                                <View key={c} style={s.colHeader}>
                                    <Text style={s.headerDigit}>{c}</Text>
                                    <TextInput
                                        style={s.bulkInput}
                                        value={colBulk[c]}
                                        onChangeText={(v) => {
                                            const val = sanitizePoints(v);
                                            setColBulk((p) => ({ ...p, [c]: val }));
                                            if (!val) clearBulkAndCells();
                                            else scheduleBulkApply('col', c, val, applyCol);
                                        }}
                                        placeholder="+"
                                        placeholderTextColor="rgba(255,255,255,0.2)"
                                        keyboardType="numeric"
                                    />
                                </View>
                            ))}
                        </View>

                        {/* Matrix Rows */}
                        {DIGITS.map((r) => (
                            <View key={r} style={s.row}>
                                <View style={s.rowHeader}>
                                    <Text style={s.rowDigit}>{r}</Text>
                                    <TextInput
                                        style={s.bulkInput}
                                        value={rowBulk[r]}
                                        onChangeText={(v) => {
                                            const val = sanitizePoints(v);
                                            setRowBulk((p) => ({ ...p, [r]: val }));
                                            if (!val) clearBulkAndCells();
                                            else scheduleBulkApply('row', r, val, applyRow);
                                        }}
                                        placeholder="+"
                                        placeholderTextColor="rgba(255,255,255,0.2)"
                                        keyboardType="numeric"
                                    />
                                </View>
                                <View style={s.spacerRow} />
                                {DIGITS.map((c) => {
                                    const key = `${r}${c}`;
                                    return (
                                        <View key={key} style={s.cellWrap}>
                                            <Text style={s.cellLabel}>{key}</Text>
                                            <TextInput
                                                style={s.cell}
                                                value={cells[key]}
                                                onChangeText={(v) => setCells((p) => ({ ...p, [key]: sanitizePoints(v) }))}
                                                placeholder="."
                                                placeholderTextColor="rgba(255,255,255,0.2)"
                                                keyboardType="numeric"
                                            />
                                        </View>
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
    content: { paddingHorizontal: 12, paddingTop: 16, paddingBottom: 24 },
    warnBox: { marginBottom: 12, backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', borderRadius: 12, padding: 12 },
    warnText: { color: '#fca5a5', fontSize: 13, textAlign: 'center' },
    scroll: { marginBottom: 16 },
    grid: { padding: 4 },
    headerRow: { flexDirection: 'row', marginBottom: 6 },
    cornerWrap: { width: 50, height: 48, justifyContent: 'center', alignItems: 'center' },
    cornerText: { color: '#fff', fontSize: 10, fontWeight: '700' },
    spacerRow: { width: 8 },
    colHeader: { width: 44, alignItems: 'center', gap: 2 },
    headerDigit: { color: '#f2c14e', fontWeight: '700', fontSize: 12 },
    bulkInput: { width: 36, height: 26, backgroundColor: 'rgba(212,175,55,0.1)', borderWidth: 1, borderColor: 'rgba(212,175,55,0.3)', borderRadius: 4, color: '#fff', fontSize: 10, textAlign: 'center', padding: 0 },
    row: { flexDirection: 'row', marginBottom: 6, alignItems: 'center' },
    rowHeader: { width: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
    rowDigit: { color: '#f2c14e', fontWeight: '700', fontSize: 12 },
    cellWrap: { width: 44, alignItems: 'center', gap: 2 },
    cellLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '700' },
    cell: { width: 38, height: 28, backgroundColor: 'rgba(30,30,30,0.9)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)', borderRadius: 4, color: '#fff', fontSize: 12, textAlign: 'center', fontWeight: '600', padding: 0 },
    submitBtn: { backgroundColor: '#d4af37', borderRadius: 12, height: 52, alignItems: 'center', justifyContent: 'center' },
    submitBtnDisabled: { opacity: 0.5 },
    submitBtnText: { color: '#4b3608', fontWeight: '700', fontSize: 16 },
});

export default JodiBulkBid;

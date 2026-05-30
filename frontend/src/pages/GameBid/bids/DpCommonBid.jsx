import React, { useEffect, useMemo, useRef, useState } from 'react';
import BidLayout from '../BidLayout';
import BidReviewModal from './BidReviewModal';
import { useBettingWindow } from '../BettingWindowContext';
import { placeBet, updateUserBalance } from '../../../api/bets';
import useScheduledBetDate from '../../../hooks/useScheduledBetDate';
import { BidDesktopStats } from '../BidInlineStats';
import BidPointsPanel from './BidPointsPanel';
import { generateDPCommon } from './dpCommonGenerator';

const DpCommonBid = ({ market, title }) => {
    const [session, setSession] = useState(() => (market?.status === 'running' ? 'CLOSE' : 'OPEN'));
    const [warning, setWarning] = useState('');
    const { selectedDate, setSelectedDate: handleDateChange, scheduledDateForApi, reviewDateText, displayDate } =
        useScheduledBetDate();
    const [selectedDigits, setSelectedDigits] = useState([]);
    const [pointsInput, setPointsInput] = useState('');
    const [generatedRows, setGeneratedRows] = useState([]);
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [reviewRows, setReviewRows] = useState([]);

    const showWarning = (msg) => {
        setWarning(msg);
        window.clearTimeout(showWarning._t);
        showWarning._t = window.setTimeout(() => setWarning(''), 2200);
    };

    const toggleDigit = (d) => {
        const digit = String(d);
        setSelectedDigits((prev) => {
            if (prev.includes(digit)) return prev.filter((x) => x !== digit);
            return [...prev, digit].sort((a, b) => Number(a) - Number(b));
        });
    };

    const isRunning = market?.status === 'running';
    useEffect(() => {
        if (isRunning) setSession('CLOSE');
    }, [isRunning]);

    const rowsWithPoints = useMemo(
        () => generatedRows.filter((row) => Number(row.points) > 0),
        [generatedRows]
    );
    const bidsCount = rowsWithPoints.length;
    const totalPoints = useMemo(
        () => rowsWithPoints.reduce((sum, row) => sum + (Number(row.points) || 0), 0),
        [rowsWithPoints]
    );

    const clearLocal = () => {
        setSelectedDigits([]);
        setPointsInput('');
        setGeneratedRows([]);
    };

    const lastAutoWarnKeyRef = useRef('');

    // Auto-generate rows when inputs are ready (no Generate button).
    useEffect(() => {
        const pts = Number(pointsInput);
        const hasDigits = selectedDigits.length > 0;
        const hasPoints = Number.isFinite(pts) && pts > 0;
        if (!hasDigits || !hasPoints) {
            setGeneratedRows([]);
            return;
        }

        const panaMap = new Map();
        for (const digit of selectedDigits) {
            const result = generateDPCommon({ digit, points: pts });
            if (!result.success) {
                const warnKey = `${selectedDigits.join(',')}|${pts}`;
                setGeneratedRows([]);
                if (lastAutoWarnKeyRef.current !== warnKey) {
                    lastAutoWarnKeyRef.current = warnKey;
                    showWarning(result.message);
                }
                return;
            }
            for (const row of result.data) {
                const existing = panaMap.get(row.pana);
                const addPoints = Number(row.points) || 0;
                if (!existing) {
                    panaMap.set(row.pana, { pana: row.pana, points: addPoints });
                } else {
                    existing.points = (Number(existing.points) || 0) + addPoints;
                    panaMap.set(row.pana, existing);
                }
            }
        }

        const panas = Array.from(panaMap.values()).sort((a, b) => Number(a.pana) - Number(b.pana));
        if (panas.length === 0) {
            const warnKey = `${selectedDigits.join(',')}|${pts}|empty`;
            setGeneratedRows([]);
            if (lastAutoWarnKeyRef.current !== warnKey) {
                lastAutoWarnKeyRef.current = warnKey;
                showWarning('No panna matches for selected digit(s).');
            }
            return;
        }

        lastAutoWarnKeyRef.current = '';
        const now = Date.now();
        setGeneratedRows(
            panas.map((row, idx) => ({
                id: `${row.pana}-${now}-${idx}`,
                pana: row.pana,
                points: String(row.points),
            }))
        );
    }, [selectedDigits, pointsInput]);

    const updatePoint = (id, value) => {
        const clean = (value ?? '').toString().replace(/\D/g, '').slice(0, 6);
        setGeneratedRows((prev) => prev.map((row) => (row.id === id ? { ...row, points: clean } : row)));
    };

    const removeRow = (id) => {
        setGeneratedRows((prev) => prev.filter((row) => row.id !== id));
    };

    const openReview = () => {
        const items = rowsWithPoints.map((row) => ({
            id: row.id,
            number: row.pana,
            points: String(row.points),
            type: session,
        }));
        if (!items.length) {
            showWarning('Generate and keep at least one row with points.');
            return;
        }
        setReviewRows(items);
        setIsReviewOpen(true);
    };

    const totalPointsForFooter = useMemo(
        () => reviewRows.reduce((sum, r) => sum + Number(r.points || 0), 0),
        [reviewRows]
    );

    const handleSubmitBet = async () => {
        const marketId = market?._id || market?.id;
        if (!marketId) throw new Error('Market not found');
        const payload = reviewRows
            .map((row) => ({
                betType: 'dp-common',
                betNumber: String(row.number || '').trim(),
                amount: Number(row.points) || 0,
                betOn: String(row?.type || session || '')
                    .trim()
                    .toUpperCase() === 'CLOSE'
                    ? 'close'
                    : 'open',
            }))
            .filter((bet) => /^[0-9]{3}$/.test(bet.betNumber) && bet.amount > 0);
        if (!payload.length) throw new Error('No valid bets to place');

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedDateObj = new Date(selectedDate);
        selectedDateObj.setHours(0, 0, 0, 0);
        const scheduledDate = selectedDateObj > today ? selectedDate : null;

        const result = await placeBet(marketId, payload, scheduledDateForApi);
        if (!result.success) throw new Error(result.message || 'Failed to place bet');
        if (result.data?.newBalance != null) updateUserBalance(result.data.newBalance);
    };

    const resetAfterSuccessfulBet = () => {
        setReviewRows([]);
        clearLocal();
        const todayStr = new Date().toISOString().split('T')[0];
        handleDateChange(todayStr);
        try {
            localStorage.setItem('betSelectedDate', todayStr);
        } catch (e) {}
    };

    const dateText = reviewDateText;
    const marketTitle = market?.gameName || market?.marketName || title;
    const { allowed: bettingAllowed } = useBettingWindow();

    const walletBefore = useMemo(() => {
        try {
            const u = JSON.parse(localStorage.getItem('user') || 'null');
            const val =
                u?.wallet ||
                u?.balance ||
                u?.points ||
                u?.walletAmount ||
                u?.wallet_amount ||
                u?.amount ||
                0;
            const n = Number(val);
            return Number.isFinite(n) ? n : 0;
        } catch (e) {
            return 0;
        }
    }, []);

    return (
        <BidLayout
            market={market}
            title={title}
            bidsCount={bidsCount}
            totalPoints={totalPoints}
            session={session}
            setSession={setSession}
            showDateSession
            showSessionOnMobile
            showInlineStats
            selectedDate={selectedDate}
            setSelectedDate={handleDateChange}
            hideFooter
            walletBalance={walletBefore}
            contentPaddingClass="pb-10"
            dateSessionGridClassName="!pb-1"
            dateSessionControlClassName="!min-h-[36px] !h-[36px] !py-1.5 !text-[11px] sm:!text-xs"
            extraHeader={<BidDesktopStats count={bidsCount} amount={totalPoints} />}
        >
            <div className="px-3 sm:px-4 pt-0 pb-2 min-h-0">
                {warning && (
                    <div className="fixed top-16 sm:top-20 left-1/2 transform -translate-x-1/2 z-50 bg-white dark:bg-[#202329] border border-gray-200 dark:border-white/20 text-gray-700 dark:text-red-200 rounded-lg px-3 py-2.5 text-xs sm:text-sm font-medium shadow-xl max-w-[calc(100%-2rem)] sm:max-w-md">
                        {warning}
                    </div>
                )}

                

                <div className="flex flex-col md:flex-row gap-4 sm:gap-5 items-stretch md:items-start">
                    <div className="flex flex-col gap-3 w-full md:w-1/2 shrink-0 min-w-0">
                        <div>
                            <div className="block text-[11px] sm:text-xs font-semibold text-gray-900 dark:text-gray-200 mb-2">Select Digits</div>
                            <div className="grid grid-cols-5 gap-2">
                                {Array.from({ length: 10 }, (_, i) => i).map((d) => {
                                    const selected = selectedDigits.includes(String(d));
                                    return (
                                        <button
                                            key={d}
                                            type="button"
                                            onClick={() => toggleDigit(d)}
                                            aria-pressed={selected}
                                            className={`min-h-[40px] h-10 rounded-md font-bold text-sm sm:text-base transition-all active:scale-[0.98] border ${
                                                selected
                                                    ? 'bg-gradient-to-br from-red-700 to-red-600 text-white border-red-300 dark:border-white/20'
                                                    : 'bg-white dark:bg-[#202329] text-gray-700 dark:text-red-200 border-gray-200 dark:border-white/20 hover:bg-gray-50 dark:hover:bg-[#1b1d22]'
                                            }`}
                                        >
                                            {d}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="flex items-center gap-2 mt-3">
                                <label className="shrink-0 w-24 text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-200">Enter Digit</label>
                                <input
                                    type="text"
                                    value={selectedDigits.join(',')}
                                    readOnly
                                    placeholder="e.g. 2"
                                    className="flex-1 min-w-0 min-h-[40px] h-10 sm:h-11 bg-white dark:bg-[#202329] border border-gray-200 dark:border-white/20 rounded-lg px-3 text-sm sm:text-base font-semibold text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>
                        <BidPointsPanel
                            pointsValue={pointsInput}
                            onPointsChange={(v) => setPointsInput((v ?? '').replace(/\D/g, '').slice(0, 6))}
                            onClear={clearLocal}
                            onQuickSelect={(pts) => setPointsInput(String(pts))}
                        />
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={openReview}
                                disabled={!bidsCount || !bettingAllowed}
                                className={`flex-1 bg-gradient-to-r from-emerald-600 to-green-500 text-white dark:border dark:border-white/20 font-bold py-3.5 min-h-[48px] rounded-lg shadow-lg hover:from-emerald-500 hover:to-green-400 transition-all active:scale-[0.98] ${
                                    !bidsCount || !bettingAllowed ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                            >
                                Submit Bet {bidsCount > 0 && `(${bidsCount})`}
                            </button>
                        </div>
                    </div>

                    <div className="w-full md:w-1/2 flex-1 min-w-0">
                        <div className="grid grid-cols-4 gap-1 sm:gap-2 text-center text-gray-700 dark:text-red-200 font-bold text-xs sm:text-sm mb-2 px-1">
                            <div>Pana</div>
                            <div>Point</div>
                            <div>Type</div>
                            <div>Delete</div>
                        </div>
                        <div className="h-px bg-gray-200 dark:bg-white/20 w-full mb-2" />
                        <div className="max-h-[520px] sm:max-h-[560px] overflow-y-auto space-y-2 pr-0.5">
                            {generatedRows.length === 0 ? (
                                <div className="py-6 text-center text-gray-500 dark:text-gray-400 text-sm">
                                    Select digit(s) and enter points to generate
                                </div>
                            ) : (
                                generatedRows.map((row) => (
                                    <div key={row.id} className="grid grid-cols-4 gap-1 sm:gap-2 text-center items-center py-2.5 px-2 bg-white dark:bg-[#202329] rounded-lg border border-gray-200 dark:border-white/20 text-sm">
                                        <div className="font-bold text-gray-900 dark:text-white">{row.pana}</div>
                                        <div className="px-0.5 min-w-0">
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                value={row.points}
                                                onChange={(e) => updatePoint(row.id, e.target.value)}
                                                className="w-full h-8 rounded-lg border border-gray-200 dark:border-white/20 bg-white dark:bg-[#17191d] text-center font-bold text-gray-700 dark:text-red-300 text-sm focus:outline-none focus:border-gray-500 dark:focus:border-white/35"
                                            />
                                        </div>
                                        <div className="text-sm font-semibold text-gray-700 dark:text-red-300">{session}</div>
                                        <div className="flex justify-center">
                                            <button
                                                type="button"
                                                onClick={() => removeRow(row.id)}
                                                className="p-2 text-gray-500 hover:text-gray-600 active:scale-95"
                                                aria-label="Delete"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

            </div>

            <BidReviewModal
                open={isReviewOpen}
                onClose={() => setIsReviewOpen(false)}
                onAfterSuccessClose={() => {
                    setIsReviewOpen(false);
                    resetAfterSuccessfulBet();
                }}
                onSubmit={handleSubmitBet}
                marketTitle={marketTitle}
                dateText={dateText}
                labelKey="Pana"
                rows={reviewRows}
                walletBefore={walletBefore}
                totalBids={reviewRows.length}
                totalAmount={totalPointsForFooter}
            />
        </BidLayout>
    );
};

export default DpCommonBid;



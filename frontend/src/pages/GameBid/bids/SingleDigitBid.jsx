import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BidLayout from '../BidLayout';
import BidReviewModal from './BidReviewModal';
import { placeBet, updateUserBalance } from '../../../api/bets';
import useScheduledBetDate from '../../../hooks/useScheduledBetDate';
import useGameRates, { DEFAULT_RATES } from '../../../hooks/useGameRates';
import { useBettingWindow } from '../BettingWindowContext';
import { bidStatValue, bidStatCard, bidInput, bidSubmitBtn, bidFieldLabel, bidCountLabel } from '../../../styles/appTheme';
import BidPointsPanel from './BidPointsPanel';
import BidDigitKeypad from './BidDigitKeypad';
import BidBidsList from './BidBidsList';

const SingleDigitBid = ({ market, title }) => {
    const { t } = useTranslation();
    const location = useLocation();
    const sessionPreset = location.state?.sessionPreset;
    const lockSession = sessionPreset === 'OPEN' || sessionPreset === 'CLOSE';
    const { allowed: bettingAllowed } = useBettingWindow();
    const { rates } = useGameRates();
    const isKingBazaar = market?.marketType === 'king';
    const singleWinRate = rates?.single ?? DEFAULT_RATES.single;
    const [session, setSession] = useState(() => {
        if (sessionPreset === 'OPEN' || sessionPreset === 'CLOSE') return sessionPreset;
        return market?.status === 'running' ? 'CLOSE' : 'OPEN';
    });
    const [inputPoints, setInputPoints] = useState('');
    const [bids, setBids] = useState([]);
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [warning, setWarning] = useState('');
    const { selectedDate, setSelectedDate: handleDateChange, scheduledDateForApi, reviewDateText, displayDate } =
        useScheduledBetDate();
    const showWarning = (msg) => {
        setWarning(msg);
        window.clearTimeout(showWarning._t);
        showWarning._t = window.setTimeout(() => setWarning(''), 2200);
    };

    const isRunning = market?.status === 'running'; // "CLOSED IS RUNNING"
    useEffect(() => {
        if (lockSession) {
            setSession(sessionPreset);
            return;
        }
        if (isRunning) setSession('CLOSE');
    }, [isRunning, lockSession, sessionPreset]);

    const hasInputPoints = Number(inputPoints) > 0;
    const handleQuickPointClick = (pts) => {
        // Do not accumulate on repeated taps; set exact quick value.
        setInputPoints(String(pts));
    };
    const handleFormClear = () => {
        setBids([]);
        setInputPoints('');
    };

    const handleDigitClick = (num) => {
        const pts = Number(inputPoints);
        if (!pts || pts <= 0) {
            showWarning('Please enter points.');
            return;
        }
        setBids((prev) => {
            const numberStr = String(num);
            const typeStr = String(session);
            const idx = prev.findIndex((b) => String(b.number) === numberStr && String(b.type) === typeStr);

            // If same (number + type) already exists, add points to that row
            if (idx >= 0) {
                const next = [...prev];
                const curPoints = Number(next[idx]?.points || 0) || 0;
                next[idx] = { ...next[idx], points: String(curPoints + pts) };
                return next;
            }

            // Otherwise create a new row
            return [
                ...prev,
                { id: Date.now() + Math.random(), number: numberStr, points: String(pts), type: typeStr }
            ];
        });
    };

    const bulkBidsCount = bids.length;
    const bulkTotalPoints = bids.reduce((sum, b) => sum + Number(b.points || 0), 0);
    const todayDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    const dateText = reviewDateText;
    const marketTitle = market?.gameName || market?.marketName || title;

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

    const rows = useMemo(() => {
        return [...bids].sort((a, c) => {
            if (a.type !== c.type) return a.type.localeCompare(c.type);
            return a.number.localeCompare(c.number);
        });
    }, [bids]);

    const pointsByDigit = bids.reduce((acc, b) => {
        const k = String(b.number);
        acc[k] = (acc[k] || 0) + Number(b.points || 0);
        return acc;
    }, {});

    const updateRowPoints = (id, value) => {
        const sanitized = String(value ?? '').replace(/\D/g, '').slice(0, 6);
        setBids((prev) =>
            prev
                .map((b) => (b.id === id ? { ...b, points: sanitized } : b))
                .filter((b) => Number(b.points) > 0)
        );
    };

    const removeRow = (id) => {
        setBids((prev) => prev.filter((b) => b.id !== id));
    };

    const clearAll = () => {
        setBids([]);
        setInputPoints('');
        // Reset scheduled date to today after bet is placed
        const today = new Date().toISOString().split('T')[0];
        setSelectedDate(today);
        try {
            localStorage.removeItem('betSelectedDate');
        } catch (e) {
            // Ignore errors
        }
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
        
        // Check if date is in the future (scheduled bet)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedDateObj = new Date(selectedDate);
        selectedDateObj.setHours(0, 0, 0, 0);
        const scheduledDate = selectedDateObj > today ? selectedDate : null;
        
        const result = await placeBet(marketId, payload, scheduledDateForApi);
        if (!result.success) throw new Error(result.message);
        if (result.data?.newBalance != null) updateUserBalance(result.data.newBalance);
    };


    return (
        <BidLayout
            market={market}
            title={title}
            bidsCount={bulkBidsCount}
            totalPoints={bulkTotalPoints}
            showDateSession={true}
            showSessionOnMobile
            showInlineStats
            selectedDate={selectedDate}
            setSelectedDate={handleDateChange}
            session={session}
            setSession={setSession}
            sessionOptionsOverride={lockSession ? [sessionPreset] : undefined}
            lockSessionSelect={lockSession}
            onSubmit={() => setIsReviewOpen(true)}
            hideFooter={false}
            showFooterStats={false}
            submitLabel="Submit Bet"
            contentPaddingClass="pb-4 md:pb-8"
            walletBalance={walletBefore}
        >
            <div className="px-3 sm:px-4 py-2 w-full max-w-full overflow-x-hidden">
                {isKingBazaar && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 px-1">
                        Win rate (Single Digit):{' '}
                        <span className="font-semibold text-red-600 dark:text-red-400">1 = {singleWinRate}</span>
                        {lockSession && (
                            <span className="text-gray-500 dark:text-gray-400">
                                {' '}· {sessionPreset === 'CLOSE' ? 'Second Digit' : 'First Digit'}
                            </span>
                        )}
                    </p>
                )}
                {warning && (
                    <div className="mb-3 bg-gray-50 border border-red-200 text-red-800 dark:bg-gray-900/40 dark:border-red-500/60 dark:text-red-200 rounded-xl px-4 py-3 text-base md:mb-4">
                        {warning}
                    </div>
                )}

                {/* Mobile: match Single Pana special layout (screenshot) */}
                <div className="md:hidden space-y-3">
                    <BidPointsPanel
                        className="px-1 border-b-0"
                        pointsValue={inputPoints}
                        onPointsChange={(v) => setInputPoints(v.replace(/\D/g, '').slice(0, 6))}
                        onClear={handleFormClear}
                        onQuickSelect={handleQuickPointClick}
                    />
                    <BidDigitKeypad
                        className="mx-1"
                        size="lg"
                        disabled={!hasInputPoints}
                        pointsByDigit={pointsByDigit}
                        onDigitClick={handleDigitClick}
                    />
                    <BidBidsList
                        className="mt-3 px-1"
                        rows={rows}
                        onUpdatePoints={updateRowPoints}
                        onRemove={removeRow}
                    />
                </div>

                <div className="hidden md:grid md:grid-cols-2 md:gap-6 md:items-start w-full">
                    <div className="w-full min-w-0 md:flex md:justify-start md:items-center">
                        <div className="flex flex-col gap-2 mb-1 md:mb-0 w-full md:max-w-sm">
                            <div className="flex flex-row items-center gap-2">
                                <label className={`${bidFieldLabel} shrink-0 w-20`}>Date:</label>
                                <div className="relative flex-1 min-w-0">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    </div>
                                    <input type="text" value={todayDate} readOnly className={`w-full pl-9 py-2 min-h-[36px] rounded-full text-sm font-bold text-center focus:outline-none ${bidInput}`} />
                                </div>
                            </div>
                            <div className="flex flex-row items-center gap-2">
                                <label className={`${bidFieldLabel} shrink-0 w-20`}>Type:</label>
                                <select
                                    value={session}
                                    onChange={(e) => setSession(e.target.value)}
                                    disabled={isRunning}
                                    className={`flex-1 min-w-0 appearance-none font-bold text-sm py-2 min-h-[36px] px-4 rounded-full text-center focus:outline-none ${bidInput} ${isRunning ? 'opacity-80 cursor-not-allowed' : ''}`}
                                >
                                    {isRunning ? (
                                        <option value="CLOSE">CLOSE</option>
                                    ) : (
                                        <>
                                            <option value="OPEN">OPEN</option>
                                            <option value="CLOSE">CLOSE</option>
                                        </>
                                    )}
                                </select>
                            </div>
                            <BidPointsPanel
                                className="border-b-0 py-3"
                                labelWidthClass="w-20"
                                pointsValue={inputPoints}
                                onPointsChange={(v) => setInputPoints(v.replace(/\D/g, '').slice(0, 6))}
                                onClear={handleFormClear}
                                onQuickSelect={handleQuickPointClick}
                                placeholder="Point"
                                enterLabel="Enter Points"
                            />

                    <BidDigitKeypad
                        className="hidden md:block w-full max-w-[360px] mx-auto"
                        size="sm"
                        disabled={!hasInputPoints}
                        pointsByDigit={pointsByDigit}
                        onDigitClick={handleDigitClick}
                    />
                    <div className="hidden md:grid mt-3 grid-cols-2 gap-2 w-full max-w-[320px] mx-auto">
                        <div className={bidStatCard}>
                            <div className={bidCountLabel}>Count</div>
                            <div className={`leading-tight ${bidStatValue}`}>{bulkBidsCount}</div>
                        </div>
                        <div className={bidStatCard}>
                            <div className={bidCountLabel}>Bet Amount</div>
                            <div className={`leading-tight ${bidStatValue}`}>{bulkTotalPoints}</div>
                        </div>
                    </div>
                        </div>
                    </div>
                    <div className="w-full min-w-0 md:flex md:justify-start md:items-start">
                        <BidBidsList
                            variant="desktop"
                            rows={rows}
                            onUpdatePoints={updateRowPoints}
                            onRemove={removeRow}
                        />
                    </div>
                </div>

            </div>

            <BidReviewModal
                open={isReviewOpen}
                onClose={() => { setIsReviewOpen(false); clearAll(); }}
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

export default SingleDigitBid;
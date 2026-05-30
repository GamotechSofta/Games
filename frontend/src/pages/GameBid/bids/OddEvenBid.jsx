import React, { useEffect, useMemo, useState } from 'react';
import BidLayout from '../BidLayout';
import BidReviewModal from './BidReviewModal';
import { placeBet, updateUserBalance } from '../../../api/bets';
import useScheduledBetDate from '../../../hooks/useScheduledBetDate';
import { BidDesktopStats } from '../BidInlineStats';
import BidPointsPanel from './BidPointsPanel';

const ODD_DIGITS = [1, 3, 5, 7, 9];
const EVEN_DIGITS = [0, 2, 4, 6, 8];

const OddEvenBid = ({ market, title }) => {
    const [session, setSession] = useState(() => (market?.status === 'running' ? 'CLOSE' : 'OPEN'));
    const [choice, setChoice] = useState('odd'); // 'odd' | 'even'
    const [inputPoints, setInputPoints] = useState('');
    const [bids, setBids] = useState([]);
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [warning, setWarning] = useState('');
    const { selectedDate, setSelectedDate: handleDateChange, scheduledDateForApi, reviewDateText, displayDate } =
        useScheduledBetDate();

    const digits = choice === 'odd' ? ODD_DIGITS : EVEN_DIGITS;

    const showWarning = (msg) => {
        setWarning(msg);
        window.clearTimeout(showWarning._t);
        showWarning._t = window.setTimeout(() => setWarning(''), 2200);
    };

    const handleFormClear = () => {
        setBids([]);
        setInputPoints('');
    };

    const clearAll = () => {
        handleFormClear();
        const today = new Date().toISOString().split('T')[0];
        handleDateChange(today);
        try {
            localStorage.removeItem('betSelectedDate');
        } catch (e) {}
    };

    const handleAddBid = () => {
        const pts = Number(inputPoints);
        if (!pts || pts <= 0) {
            showWarning('Please enter points.');
            return;
        }
        const nextMap = new Map();
        for (const b of bids) {
            nextMap.set(`${b.number}-${b.type}`, b);
        }
        for (const num of digits) {
            const row = {
                id: `${num}-${session}`,
                number: String(num),
                points: String(pts),
                type: session,
            };
            nextMap.set(`${row.number}-${row.type}`, row);
        }
        setBids(Array.from(nextMap.values()));
        setInputPoints('');
    };

    const totalPoints = bids.reduce((sum, b) => sum + Number(b.points), 0);
    const dateText = reviewDateText;
    const marketTitle = market?.gameName || market?.marketName || title;
    const isRunning = market?.status === 'running';

    useEffect(() => {
        if (isRunning) setSession('CLOSE');
    }, [isRunning]);

    const walletBefore = useMemo(() => {
        try {
            const u = JSON.parse(localStorage.getItem('user') || 'null');
            const val = u?.wallet ?? u?.balance ?? u?.points ?? u?.walletAmount ?? u?.wallet_amount ?? u?.amount ?? 0;
            const n = Number(val);
            return Number.isFinite(n) ? n : 0;
        } catch (e) {
            return 0;
        }
    }, []);

    const handleSubmitBet = async () => {
        const marketId = market?._id || market?.id;
        if (!marketId) throw new Error('Market not found');
        const bets = bids.map((b) => ({
            betType: 'odd-even',
            betNumber: String(b.number),
            amount: Number(b.points) || 0,
            betOn: String(b?.type || session).toUpperCase() === 'CLOSE' ? 'close' : 'open',
        }));

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedDateObj = new Date(selectedDate);
        selectedDateObj.setHours(0, 0, 0, 0);
        const scheduledDate = selectedDateObj > today ? selectedDate : null;

        const result = await placeBet(marketId, bets, scheduledDateForApi);
        if (!result.success) throw new Error(result.message);
        if (result.data?.newBalance != null) updateUserBalance(result.data.newBalance);
    };

    const handleCancelBet = () => {
        setIsReviewOpen(false);
    };

    const handleAfterSuccess = () => {
        setIsReviewOpen(false);
        clearAll();
    };

    const handleOpenSubmit = () => {
        if (!bids.length) {
            showWarning('Please add odd/even points first.');
            return;
        }
        setIsReviewOpen(true);
    };

    const handleDeleteBid = (id) => {
        setBids((prev) => prev.filter((b) => b.id !== id));
    };

    const leftColumn = (
        <div className="space-y-4">
            {warning && (
                <div className="bg-gray-50 border-2 border-red-300 text-gray-600 rounded-xl px-4 py-3 text-sm">
                    {warning}
                </div>
            )}
            <div className="grid grid-cols-2 gap-3">
                <button
                    type="button"
                    onClick={() => setChoice('odd')}
                    className={`h-10 rounded-lg font-bold text-xs border-2 transition-colors ${choice === 'odd' ? 'bg-gradient-to-r from-red-700 to-red-600 text-white border-red-300 dark:border-white/20' : 'bg-white dark:bg-[#202329] text-gray-900 dark:text-white border-gray-200 dark:border-white/20 hover:border-gray-400 dark:hover:border-white/35'}`}
                >
                    Odd
                </button>
                <button
                    type="button"
                    onClick={() => setChoice('even')}
                    className={`h-10 rounded-lg font-bold text-xs border-2 transition-colors ${choice === 'even' ? 'bg-gradient-to-r from-red-700 to-red-600 text-white border-red-300 dark:border-white/20' : 'bg-white dark:bg-[#202329] text-gray-900 dark:text-white border-gray-200 dark:border-white/20 hover:border-gray-400 dark:hover:border-white/35'}`}
                >
                    Even
                </button>
            </div>
            <BidPointsPanel
                className="border-b-0"
                pointsValue={inputPoints}
                onPointsChange={(v) => setInputPoints(v.replace(/\D/g, '').slice(0, 6))}
                onClear={handleFormClear}
                onQuickSelect={(pts) => setInputPoints(String(pts))}
                enterLabel="Enter Points"
                placeholder="Point"
            />
            <div className="flex gap-3">
                <button
                    onClick={handleAddBid}
                    className="flex-1 bg-gradient-to-r from-red-700 to-red-600 text-white font-bold h-10 rounded-lg shadow-md hover:from-red-600 hover:to-red-500 transition-all active:scale-[0.98] text-xs dark:border dark:border-white/20"
                >
                    Add
                </button>
                <button
                    type="button"
                    onClick={handleOpenSubmit}
                    disabled={!bids.length}
                    className={`flex-1 font-bold h-10 rounded-lg shadow-md transition-all text-xs ${
                        bids.length
                            ? 'bg-gradient-to-r from-emerald-600 to-green-500 text-white hover:from-emerald-500 hover:to-green-400 active:scale-[0.98] dark:border dark:border-white/20'
                            : 'bg-gradient-to-r from-emerald-600 to-green-500 text-white opacity-50 cursor-not-allowed dark:border dark:border-white/20'
                    }`}
                >
                    Submit
                </button>
            </div>
            <div>
                <div className="grid grid-cols-4 gap-1 sm:gap-2 text-center text-gray-700 dark:text-red-200 font-bold text-xs sm:text-sm mb-2 px-1">
                    <div>Ank</div>
                    <div>Point</div>
                    <div>Type</div>
                    <div>Delete</div>
                </div>
                <div className="h-px bg-gray-200 dark:bg-white/20 w-full mb-2" />
                <div className="space-y-2">
                    {bids.length ? (
                        bids.map((b) => (
                            <div
                                key={b.id}
                                className="grid grid-cols-4 gap-1 sm:gap-2 text-center items-center py-2.5 px-2 bg-white dark:bg-[#202329] rounded-lg border border-gray-200 dark:border-white/20 text-sm"
                            >
                                <div className="font-bold text-gray-900 dark:text-white">{b.number}</div>
                                <div className="px-0.5 min-w-0">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={b.points}
                                        onChange={(e) =>
                                            setBids((prev) =>
                                                prev.map((row) =>
                                                    row.id === b.id ? { ...row, points: e.target.value.replace(/\D/g, '').slice(0, 6) } : row
                                                )
                                            )
                                        }
                                        className="w-full h-8 rounded-lg border border-gray-200 dark:border-white/20 bg-white dark:bg-[#17191d] text-center font-bold text-gray-700 dark:text-red-300 text-sm focus:outline-none focus:border-gray-500 dark:focus:border-white/35"
                                    />
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-300">{b.type}</div>
                                <div className="flex justify-center">
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteBid(b.id)}
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
                    ) : (
                        <div className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">No bids added yet.</div>
                    )}
                </div>
            </div>

        </div>
    );

    return (
        <BidLayout
            market={market}
            title={title}
            bidsCount={bids.length}
            totalPoints={totalPoints}
            showDateSession={true}
            showSessionOnMobile={true}
            showInlineStats
            extraHeader={<BidDesktopStats count={bids.length} amount={totalPoints} />}
            session={session}
            setSession={setSession}
            hideFooter
            walletBalance={walletBefore}
            selectedDate={selectedDate}
            setSelectedDate={handleDateChange}
            displayDate={displayDate}
            contentPaddingClass="pb-28 md:pb-6"
        >
            <div className="px-3 sm:px-4 py-4 sm:py-2 md:max-w-3xl md:mx-auto md:items-start">
                {leftColumn}
            </div>

            <BidReviewModal
                open={isReviewOpen}
                onClose={handleCancelBet}
                onAfterSuccessClose={handleAfterSuccess}
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

export default OddEvenBid;

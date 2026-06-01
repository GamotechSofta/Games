import React, { useEffect, useMemo, useRef, useState } from 'react';
import BidLayout from '../BidLayout';
import BidReviewModal from './BidReviewModal';
import QuickPointsRow from './QuickPointsRow';
import { placeBet, updateUserBalance } from '../../../api/bets';
import useScheduledBetDate from '../../../hooks/useScheduledBetDate';
import { bidClearBtn } from '../../../styles/appTheme';
import { BidDesktopStats } from '../BidInlineStats';
import { isValidAnyPana } from './panaRules';

const sanitizeDigits = (v, maxLen) => (v ?? '').toString().replace(/\D/g, '').slice(0, maxLen);
const sanitizePoints = (v) => (v ?? '').toString().replace(/\D/g, '').slice(0, 6);
const FullSangamBid = ({ market, title }) => {
    const [session, setSession] = useState('OPEN');
    const [openPana, setOpenPana] = useState('');
    const [closePana, setClosePana] = useState('');
    const [points, setPoints] = useState('');
    const pointsInputRef = useRef(null);
    const [openPanaInvalid, setOpenPanaInvalid] = useState(false);
    const [closePanaInvalid, setClosePanaInvalid] = useState(false);
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

    const walletBefore = useMemo(() => {
        try {
            const u = JSON.parse(localStorage.getItem('user') || 'null');
            const val = u?.wallet || u?.balance || u?.points || u?.walletAmount || u?.wallet_amount || u?.amount || 0;
            const n = Number(val);
            return Number.isFinite(n) ? n : 0;
        } catch (e) {
            return 0;
        }
    }, []);

    const marketTitle = market?.gameName || market?.marketName || title;
    const dateText = reviewDateText;
    const totalPoints = useMemo(() => bids.reduce((sum, b) => sum + Number(b.points || 0), 0), [bids]);

    const submitBtnClass = (enabled) =>
        enabled
            ? 'w-full bg-gradient-to-r from-emerald-600 to-green-500 text-white dark:border dark:border-white/20 font-bold py-3.5 min-h-[48px] rounded-lg shadow-md hover:from-emerald-500 hover:to-green-400 transition-all active:scale-[0.98]'
            : 'w-full bg-gradient-to-r from-emerald-600 to-green-500 text-white dark:border dark:border-white/20 font-bold py-3.5 min-h-[48px] rounded-lg shadow-md opacity-50 cursor-not-allowed';

    const clearAll = () => {
        setOpenPana('');
        setClosePana('');
        setPoints('');
        setOpenPanaInvalid(false);
        setClosePanaInvalid(false);
        setBids([]);
        const today = new Date().toISOString().split('T')[0];
        handleDateChange(today);
        try {
            localStorage.removeItem('betSelectedDate');
        } catch (e) {}
    };

    const handleSubmitBet = async () => {
        const marketId = market?._id || market?.id;
        if (!marketId) throw new Error('Market not found');
        if (!bids.length) throw new Error('No bets to place');
        const payload = bids
            .map((b) => ({
                betType: 'full-sangam',
                betNumber: String(b?.number ?? '').trim(),
                amount: Number(b?.points) || 0,
                betOn: 'open',
            }))
            .filter((b) => b.betNumber && b.amount > 0);
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

    const handleAdd = () => {
        const pts = Number(points);
        if (!pts || pts <= 0) {
            showWarning('Please enter points.');
            return;
        }
        if (!isValidAnyPana(openPana)) {
            showWarning('Open Pana must be valid (3 digits).');
            return;
        }
        if (!isValidAnyPana(closePana)) {
            showWarning('Close Pana must be valid (3 digits).');
            return;
        }

        const numberKey = `${openPana}-${closePana}`;
        setBids((prev) => {
            const next = [...prev];
            const idx = next.findIndex((b) => String(b.number) === numberKey);
            if (idx >= 0) {
                const cur = Number(next[idx].points || 0) || 0;
                next[idx] = { ...next[idx], points: String(cur + pts) };
                return next;
            }
            return [...next, { id: Date.now() + Math.random(), number: numberKey, points: String(pts), type: 'OPEN' }];
        });

        setOpenPana('');
        setClosePana('');
        setPoints('');
        setOpenPanaInvalid(false);
        setClosePanaInvalid(false);
    };

    const lastAutoAddKeyRef = useRef('');

    // Auto-add when open pana + close pana + points are valid (no Add-to-List button).
    useEffect(() => {
        const pts = Number(points);
        if (!Number.isFinite(pts) || pts <= 0) return;
        if (!isValidAnyPana(openPana) || !isValidAnyPana(closePana)) return;
        const key = `${openPana}-${closePana}|${pts}`;
        if (lastAutoAddKeyRef.current === key) return;
        lastAutoAddKeyRef.current = key;
        handleAdd();
    }, [openPana, closePana, points]);

    const handleDelete = (id) => setBids((prev) => prev.filter((b) => b.id !== id));
    const openReview = () => {
        if (!bids.length) {
            showWarning('Please add at least one Sangam.');
            return;
        }
        setIsReviewOpen(true);
    };

    const handleQuickPointClick = (pts) => {
        setPoints(String(pts));
    };

    const handleFormClear = () => {
        setBids([]);
        setOpenPana('');
        setClosePana('');
        setPoints('');
        setOpenPanaInvalid(false);
        setClosePanaInvalid(false);
    };

    return (
        <BidLayout
            market={market}
            title={title}
            bidsCount={bids.length}
            totalPoints={totalPoints}
            showDateSession={true}
            showSessionOnMobile
            showInlineStats
            extraHeader={<BidDesktopStats count={bids.length} amount={totalPoints} />}
            selectedDate={selectedDate}
            setSelectedDate={handleDateChange}
            displayDate={displayDate}
            session={session}
            setSession={setSession}
            sessionOptionsOverride={['OPEN']}
            lockSessionSelect
            hideSessionSelectCaret
            hideFooter={false}
            onSubmit={openReview}
            submitLabel="Submit Bet"
            walletBalance={walletBefore}
            contentPaddingClass="pb-[calc(7rem+env(safe-area-inset-bottom,0px))] md:pb-6"
        >
            <div className="px-3 sm:px-4 py-2 sm:py-2 md:max-w-7xl md:mx-auto md:items-start">
                <div className="space-y-4">
                    {warning && (
                        <div className="bg-gray-50 border-2 border-red-300 text-gray-600 rounded-xl px-4 py-3 text-sm">
                            {warning}
                        </div>
                    )}

                    <div className="md:grid md:grid-cols-2 md:gap-6 md:items-start">
                        <div>
                            <div className="flex flex-col gap-3 mt-2 mb-4 px-1">
                                <div className="flex flex-row items-center gap-2">
                                    <label className="text-gray-900 dark:text-gray-200 text-sm font-medium shrink-0 w-28">Enter Open:</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={openPana}
                                        onChange={(e) => {
                                            const next = sanitizeDigits(e.target.value, 3);
                                            setOpenPana(next);
                                            setOpenPanaInvalid(!!next && next.length === 3 && !isValidAnyPana(next));
                                            if (next.length === 3 && isValidAnyPana(next)) {
                                                window.requestAnimationFrame(() => pointsInputRef.current?.focus?.());
                                            }
                                        }}
                                        placeholder="Pana"
                                        maxLength={3}
                                        className={`flex-1 min-w-0 bg-white dark:bg-[#202329] border border-gray-200 dark:border-white/20 text-gray-900 dark:text-white placeholder-gray-500 rounded-xl py-2.5 min-h-[40px] px-4 text-left text-sm focus:ring-2 focus:outline-none ${
                                            openPanaInvalid ? 'border-red-500 focus:border-gray-500 focus:ring-red-500/20' : 'focus:ring-gray-200 dark:focus:ring-white/10 focus:border-gray-500 dark:focus:border-white/35'
                                        }`}
                                    />
                                </div>

                                <div className="flex flex-row items-center gap-2">
                                    <label className="text-gray-900 dark:text-gray-200 text-sm font-medium shrink-0 w-28">Enter Close:</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={closePana}
                                        onChange={(e) => {
                                            const next = sanitizeDigits(e.target.value, 3);
                                            setClosePana(next);
                                            setClosePanaInvalid(!!next && next.length === 3 && !isValidAnyPana(next));
                                        }}
                                        placeholder="Pana"
                                        maxLength={3}
                                        className={`flex-1 min-w-0 bg-white dark:bg-[#202329] border border-gray-200 dark:border-white/20 text-gray-900 dark:text-white placeholder-gray-500 rounded-xl py-2.5 min-h-[40px] px-4 text-left text-sm focus:ring-2 focus:outline-none ${
                                            closePanaInvalid ? 'border-red-500 focus:border-gray-500 focus:ring-red-500/20' : 'focus:ring-gray-200 dark:focus:ring-white/10 focus:border-gray-500 dark:focus:border-white/35'
                                        }`}
                                    />
                                </div>

                                <div className="flex flex-row items-center gap-2">
                                    <label className="text-gray-900 dark:text-gray-200 text-sm font-medium shrink-0 w-28">Enter Points</label>
                                    <div className="flex-1 min-w-0 grid grid-cols-[1fr_auto] gap-2">
                                        <input
                                            ref={pointsInputRef}
                                            type="text"
                                            inputMode="numeric"
                                            value={points}
                                            onChange={(e) => setPoints(sanitizePoints(e.target.value))}
                                            placeholder="Points"
                                            className="no-spinner w-full bg-white dark:bg-[#202329] border border-gray-200 dark:border-white/20 text-gray-900 dark:text-white placeholder-gray-500 rounded-xl py-2.5 min-h-[40px] px-4 text-left text-sm focus:ring-2 focus:ring-gray-200 dark:focus:ring-white/10 focus:border-gray-500 dark:focus:border-white/35 focus:outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleFormClear}
                                            className={`px-4 min-h-[40px] rounded-xl text-sm ${bidClearBtn}`}
                                        >
                                            Clear
                                        </button>
                                    </div>
                                </div>

                                <QuickPointsRow
                                    value={points}
                                    onSelect={handleQuickPointClick}
                                    labelClassName="text-gray-900 dark:text-gray-200 text-sm font-medium shrink-0 w-28"
                                />
                            </div>

                            <div className="md:hidden">
                                <div className="grid grid-cols-4 gap-1 sm:gap-2 text-center text-gray-700 dark:text-red-200 font-bold text-xs sm:text-sm mb-2 px-1">
                                    <div>Pana</div>
                                    <div>Point</div>
                                    <div>Type</div>
                                    <div>Delete</div>
                                </div>
                                <div className="h-px bg-gray-200 dark:bg-white/20 w-full mb-2" />
                                <div className="space-y-2">
                                    {bids.map((b) => (
                                        <div
                                            key={b.id}
                                            className="grid grid-cols-4 gap-1 sm:gap-2 text-center items-center py-2.5 px-2 bg-white dark:bg-[#202329] rounded-lg border border-gray-200 dark:border-white/20 text-sm"
                                        >
                                            <div className="font-bold text-gray-900 dark:text-white">{b.number}</div>
                                            <div className="font-bold text-gray-700 dark:text-red-300">{b.points}</div>
                                            <div className="text-sm text-gray-600 dark:text-gray-300">{b.type}</div>
                                            <div className="flex justify-center">
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(b.id)}
                                                    className="p-2 text-gray-500 hover:text-gray-600 active:scale-95"
                                                    aria-label="Delete"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                        <path
                                                            fillRule="evenodd"
                                                            d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                                            clipRule="evenodd"
                                                        />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="hidden md:block">
                            <div className="grid grid-cols-4 gap-1 sm:gap-2 text-center text-gray-700 dark:text-red-200 font-bold text-xs sm:text-sm mb-2 px-1">
                                <div>Pana</div>
                                <div>Point</div>
                                <div>Type</div>
                                <div>Delete</div>
                            </div>
                            <div className="h-px bg-gray-200 dark:bg-white/20 w-full mb-2" />
                            <div className="space-y-2">
                                {bids.map((b) => (
                                    <div
                                        key={b.id}
                                        className="grid grid-cols-4 gap-1 sm:gap-2 text-center items-center py-2.5 px-2 bg-white dark:bg-[#202329] rounded-lg border border-gray-200 dark:border-white/20 text-sm"
                                    >
                                        <div className="font-bold text-gray-900 dark:text-white">{b.number}</div>
                                        <div className="font-bold text-gray-700 dark:text-red-300">{b.points}</div>
                                        <div className="text-sm text-gray-600 dark:text-gray-300">{b.type}</div>
                                        <div className="flex justify-center">
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(b.id)}
                                                className="p-2 text-gray-500 hover:text-gray-600 active:scale-95"
                                                aria-label="Delete"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <BidReviewModal
                open={isReviewOpen}
                onClose={() => { setIsReviewOpen(false); clearAll(); }}
                onSubmit={handleSubmitBet}
                marketTitle={marketTitle}
                dateText={dateText}
                labelKey="Pana"
                rows={bids}
                walletBefore={walletBefore}
                totalBids={bids.length}
                totalAmount={totalPoints}
            />
        </BidLayout>
    );
};

export default FullSangamBid;

import React, { useEffect, useMemo, useRef, useState } from 'react';
import BidLayout from '../BidLayout';
import BidReviewModal from './BidReviewModal';
import QuickPointsRow from './QuickPointsRow';
import { isValidAnyPana } from './panaRules';
import { placeBet, updateUserBalance } from '../../../api/bets';
import useScheduledBetDate from '../../../hooks/useScheduledBetDate';
import useGameRates, { DEFAULT_RATES } from '../../../hooks/useGameRates';
import { bidClearBtn } from '../../../styles/appTheme';
import { BidDesktopStats } from '../BidInlineStats';
import { lastDigit } from '../../../utils/betEvaluation';

const sanitizePoints = (v) => (v ?? '').toString().replace(/\D/g, '').slice(0, 6);

/** Parse "123-6" or partial "123-" from Enter Pana input */
const parsePanaInput = (raw) => {
    const clean = String(raw ?? '').replace(/[^\d-]/g, '').slice(0, 5);
    const match = clean.match(/^(\d{1,3})(?:-(\d)?)?$/);
    if (!match) return { display: clean, pana: '', ank: '' };
    const pana = (match[1] || '').slice(0, 3);
    const ank = (match[2] ?? '').slice(0, 1);
    return { display: clean, pana, ank };
};

const SangamBid = ({ market, title }) => {
    const [session, setSession] = useState('OPEN');
    const [bids, setBids] = useState([]);
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [warning, setWarning] = useState('');
    const [formKey, setFormKey] = useState(0);
    const { selectedDate, setSelectedDate: handleDateChange, scheduledDateForApi, reviewDateText, displayDate } =
        useScheduledBetDate();
    const { rates } = useGameRates();
    const winRate = rates?.halfSangam ?? DEFAULT_RATES.halfSangam;

    const showWarning = (msg) => {
        setWarning(msg);
        window.clearTimeout(showWarning._t);
        showWarning._t = window.setTimeout(() => setWarning(''), 2200);
    };

    const walletBefore = useMemo(() => {
        try {
            const u = JSON.parse(localStorage.getItem('user') || 'null');
            const val = u?.wallet ?? u?.balance ?? u?.points ?? u?.walletAmount ?? u?.wallet_amount ?? u?.amount ?? 0;
            const n = Number(val);
            return Number.isFinite(n) ? n : 0;
        } catch {
            return 0;
        }
    }, []);

    const marketTitle = market?.gameName || market?.marketName || title;
    const totalPoints = useMemo(() => bids.reduce((sum, b) => sum + Number(b.points || 0), 0), [bids]);

    const mergeBidRow = (prev, numberKey, pts) => {
        const next = [...prev];
        const idx = next.findIndex((b) => String(b.number) === numberKey && String(b.type) === String(session));
        if (idx >= 0) {
            const cur = Number(next[idx].points || 0) || 0;
            next[idx] = { ...next[idx], points: String(cur + pts) };
            return next;
        }
        return [...next, { id: Date.now() + Math.random(), number: numberKey, points: String(pts), type: session }];
    };

    const clearAll = () => {
        setBids([]);
        setFormKey((k) => k + 1);
        const today = new Date().toISOString().split('T')[0];
        handleDateChange(today);
        try {
            localStorage.removeItem('betSelectedDate');
        } catch {
            /* ignore */
        }
    };

    const handleSubmitBet = async () => {
        const marketId = market?._id || market?.id;
        if (!marketId) throw new Error('Market not found');
        if (!bids.length) throw new Error('No bets to place');
        const payload = bids
            .map((b) => ({
                betType: 'half-sangam',
                betNumber: String(b?.number ?? '').trim(),
                amount: Number(b?.points) || 0,
                betOn: 'open',
            }))
            .filter((b) => b.betNumber && b.amount > 0);
        if (!payload.length) throw new Error('No valid bets to place');
        const result = await placeBet(marketId, payload, scheduledDateForApi);
        if (!result.success) throw new Error(result.message || 'Failed to place bet');
        if (result.data?.newBalance != null) updateUserBalance(result.data.newBalance);
    };

    const handleDelete = (id) => setBids((prev) => prev.filter((b) => b.id !== id));

    const openReview = () => {
        if (!bids.length) {
            showWarning('Please add at least one Sangam.');
            return;
        }
        setIsReviewOpen(true);
    };

    const bidsList = (
        <>
            <div className="grid grid-cols-4 gap-1 sm:gap-2 text-center text-gray-700 dark:text-red-200 font-bold text-xs sm:text-sm mb-2 px-1">
                <div>Pana</div>
                <div>Point</div>
                <div>Type</div>
                <div>Delete</div>
            </div>
            <div className="h-px bg-gray-200 dark:bg-white/20 w-full mb-2" />
            <div className="space-y-2">
                {bids.map((bid) => (
                    <div
                        key={bid.id}
                        className="grid grid-cols-4 gap-1 sm:gap-2 text-center items-center py-2.5 px-2 bg-white dark:bg-[#202329] rounded-lg border border-gray-200 dark:border-white/20 text-sm"
                    >
                        <div className="font-bold text-gray-900 dark:text-white">{bid.number}</div>
                        <div className="font-bold text-gray-700 dark:text-red-300">{bid.points}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">{bid.type}</div>
                        <div className="flex justify-center">
                            <button
                                type="button"
                                onClick={() => handleDelete(bid.id)}
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
        </>
    );

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
                    <p className="text-xs text-gray-500 dark:text-gray-400 px-1">
                        Win rate: <span className="font-semibold text-red-600 dark:text-red-400">1 = {winRate}</span>
                        <span className="text-gray-400"> (same as Half Sangam)</span>
                    </p>
                    <div className="md:grid md:grid-cols-2 md:gap-6 md:items-start">
                        <div>
                            <SangamEasyForm
                                key={formKey}
                                session={session}
                                setBids={setBids}
                                mergeBidRow={mergeBidRow}
                                showWarning={showWarning}
                                onClearAll={() => {
                                    setBids([]);
                                    setFormKey((k) => k + 1);
                                }}
                            />
                            <div className="md:hidden mt-4">{bidsList}</div>
                        </div>
                        <div className="hidden md:block">{bidsList}</div>
                    </div>
                </div>
            </div>
            <BidReviewModal
                open={isReviewOpen}
                onClose={() => { setIsReviewOpen(false); clearAll(); }}
                onSubmit={handleSubmitBet}
                marketTitle={marketTitle}
                dateText={reviewDateText}
                labelKey="Pana"
                rows={bids}
                walletBefore={walletBefore}
                totalBids={bids.length}
                totalAmount={totalPoints}
            />
        </BidLayout>
    );
};

function SangamEasyForm({ session, setBids, mergeBidRow, showWarning, onClearAll }) {
    const [panaInput, setPanaInput] = useState('');
    const [pana, setPana] = useState('');
    const [closeAnk, setCloseAnk] = useState('');
    const [points, setPoints] = useState('');
    const [panaInvalid, setPanaInvalid] = useState(false);
    const pointsInputRef = useRef(null);
    const lastAutoAddKeyRef = useRef('');

    const handleQuickPointClick = (pts) => setPoints(String(pts));

    const handlePanaChange = (v) => {
        const { display, pana: pPart, ank } = parsePanaInput(v);
        const p3 = pPart.length === 3 ? pPart.padStart(3, '0') : pPart;
        const validPana = pPart.length === 3 && isValidAnyPana(p3);

        setPana(pPart);

        if (ank) {
            setCloseAnk(ank);
            setPanaInput(display);
        } else if (validPana && !display.includes('-')) {
            const autoAnk = String(lastDigit(p3));
            setCloseAnk(autoAnk);
            setPanaInput(`${pPart}-${autoAnk}`);
        } else {
            setPanaInput(display);
            if (!display.includes('-')) setCloseAnk('');
        }

        setPanaInvalid(!!pPart && pPart.length === 3 && !isValidAnyPana(p3));

        const filledAnk = ank || (validPana && !display.includes('-') ? String(lastDigit(p3)) : '');
        if (pPart.length === 3 && /^\d$/.test(filledAnk)) {
            pointsInputRef.current?.focus?.();
        }
    };

    const handleCloseAnkChange = (v) => {
        const digit = v.replace(/\D/g, '').slice(0, 1);
        setCloseAnk(digit);
        if (pana.length === 3 && digit) {
            setPanaInput(`${pana}-${digit}`);
        }
    };

    const handleAdd = () => {
        const pts = Number(points);
        if (!pts || pts <= 0) {
            showWarning('Please enter points.');
            return;
        }
        const p3 = pana.padStart(3, '0');
        if (!isValidAnyPana(p3)) {
            showWarning('Enter a valid Pana (3 digits).');
            return;
        }
        const ankStr = (closeAnk ?? '').toString().trim();
        if (!/^[0-9]$/.test(ankStr)) {
            showWarning('Please enter a valid Close Ank (0-9).');
            return;
        }
        const numberKey = `${p3}-${ankStr}`;
        setBids((prev) => mergeBidRow(prev, numberKey, pts));
        setPanaInput('');
        setPana('');
        setCloseAnk('');
        setPoints('');
        setPanaInvalid(false);
        lastAutoAddKeyRef.current = '';
    };

    useEffect(() => {
        const pts = Number(points);
        if (!Number.isFinite(pts) || pts <= 0) return;
        const p3 = pana.padStart(3, '0');
        if (!isValidAnyPana(p3)) return;
        const ankStr = (closeAnk ?? '').toString().trim();
        if (!/^[0-9]$/.test(ankStr)) return;
        const numberKey = `${p3}-${ankStr}`;
        const key = `${numberKey}|${session}|${pts}`;
        if (lastAutoAddKeyRef.current === key) return;
        lastAutoAddKeyRef.current = key;
        handleAdd();
    }, [pana, closeAnk, points, session]);

    const inputBase =
        'flex-1 min-w-0 bg-white dark:bg-[#202329] border border-gray-200 dark:border-white/20 text-gray-900 dark:text-white placeholder-gray-500 rounded-xl py-2.5 min-h-[40px] px-4 text-left text-sm focus:ring-2 focus:outline-none';

    return (
        <div className="flex flex-col gap-3 mt-2 mb-4 px-1">
            <div className="flex flex-row items-center gap-2">
                <label className="text-gray-900 dark:text-gray-200 text-sm font-medium shrink-0 w-28">Enter Pana:</label>
                <input
                    type="text"
                    inputMode="text"
                    value={panaInput}
                    onChange={(e) => handlePanaChange(e.target.value)}
                    placeholder="Pana or 123-6"
                    maxLength={5}
                    className={`${inputBase} ${
                        pana.length === 3 && panaInvalid
                            ? 'border-red-500 focus:border-gray-500 focus:ring-red-500/20'
                            : 'focus:ring-gray-200 dark:focus:ring-white/10 focus:border-gray-500 dark:focus:border-white/35'
                    }`}
                />
            </div>
            <div className="flex flex-row items-center gap-2">
                <label className="text-gray-900 dark:text-gray-200 text-sm font-medium shrink-0 w-28">Close Ank:</label>
                <input
                    type="text"
                    inputMode="numeric"
                    value={closeAnk}
                    onChange={(e) => handleCloseAnkChange(e.target.value)}
                    placeholder="Ank"
                    maxLength={1}
                    className={`${inputBase} focus:ring-gray-200 dark:focus:ring-white/10 focus:border-gray-500 dark:focus:border-white/35`}
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
                        onClick={onClearAll}
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
    );
}

export default SangamBid;

import React, { useEffect, useMemo, useState } from 'react';
import BidLayout from '../BidLayout';
import BidReviewModal from './BidReviewModal';
import QuickPointsRow from './QuickPointsRow';
import { placeBet, updateUserBalance } from '../../../api/bets';

const sanitizePoints = (v) => (v ?? '').toString().replace(/\D/g, '').slice(0, 6);
const validatePana = (n) => {
    if (!n) return false;
    const str = n.toString().trim();
    
    // Must be exactly 3 digits
    if (!/^[0-9]{3}$/.test(str)) return false;
    
    const digits = str.split('').map(Number);
    const [first, second, third] = digits;
    
    // Two consecutive digits must be the same (positions 0-1 or 1-2)
    const hasConsecutiveSame = (first === second) || (second === third);
    if (!hasConsecutiveSame) return false;
    
    // Numbers starting with zero are not allowed (001-099)
    if (first === 0) {
        return false;
    }
    
    // Special case: Two zeros at the end are allowed (300, 900, 100)
    // For these cases, third (0) is not > first, but they're explicitly allowed
    if (second === 0 && third === 0) {
        return true;
    }
    
    // Special case: Numbers ending with zero where first two digits are the same (220, 990, 880, 660)
    if (first === second && third === 0) {
        return true;
    }
    
    // For all other cases, last digit must be greater than first
    if (third <= first) return false;
    
    return true;
};

const buildDoublePanas = () => {
    const validPanas = [];
    for (let i = 0; i <= 999; i++) {
        const str = String(i).padStart(3, '0');
        if (validatePana(str)) {
            validPanas.push(str);
        }
    }
    return validPanas;
};

const DoublePanaBulkBid = ({ market, title }) => {
    const [session, setSession] = useState(() => (market?.status === 'running' ? 'CLOSE' : 'OPEN'));
    const [warning, setWarning] = useState('');
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState(() => {
        try {
            const savedDate = localStorage.getItem('betSelectedDate');
            if (savedDate) {
                const today = new Date().toISOString().split('T')[0];
                // Only restore if saved date is in the future (not today)
                if (savedDate > today) {
                    return savedDate;
                }
            }
        } catch (e) {
            // Ignore errors
        }
        const today = new Date();
        return today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    });
    
    // Save to localStorage when date changes
    const handleDateChange = (newDate) => {
        try {
            localStorage.setItem('betSelectedDate', newDate);
        } catch (e) {
            // Ignore errors
        }
        setSelectedDate(newDate);
    };
    const [reviewRows, setReviewRows] = useState([]);

    const showWarning = (msg) => {
        setWarning(msg);
        window.clearTimeout(showWarning._t);
        showWarning._t = window.setTimeout(() => setWarning(''), 2200);
    };

    const isRunning = market?.status === 'running'; // "CLOSED IS RUNNING"
    useEffect(() => {
        if (isRunning) setSession('CLOSE');
    }, [isRunning]);

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

    const marketTitle = market?.gameName || market?.marketName || title;
    const dateText = new Date().toLocaleDateString('en-GB');

    const doublePanas = useMemo(() => buildDoublePanas(), []);
    const [specialInputs, setSpecialInputs] = useState(() =>
        Object.fromEntries(doublePanas.map((n) => [n, '']))
    );
    const [groupBulk, setGroupBulk] = useState(() =>
        Object.fromEntries(Array.from({ length: 10 }, (_, d) => [String(d), '']))
    );
    /** Per sum-digit column: Quick Points brush (tap a pana to add; does not fill whole column). */
    const [groupQuickSelected, setGroupQuickSelected] = useState(() =>
        Object.fromEntries(Array.from({ length: 10 }, (_, d) => [String(d), null]))
    );

    const panasBySumDigit = useMemo(() => {
        const groups = Object.fromEntries(Array.from({ length: 10 }, (_, d) => [String(d), []]));
        for (const n of doublePanas) {
            const digits = n.split('').map(Number);
            const sum = digits[0] + digits[1] + digits[2];
            const s = sum % 10;
            groups[String(s)].push(n);
        }
        return groups;
    }, [doublePanas]);

    const specialCount = useMemo(
        () => Object.values(specialInputs).filter((v) => Number(v) > 0).length,
        [specialInputs]
    );

    const canSubmit = specialCount > 0;

    const selectedTotalPoints = useMemo(
        () => Object.values(specialInputs).reduce((sum, v) => sum + Number(v || 0), 0),
        [specialInputs]
    );

    const clearAll = () => {
        setIsReviewOpen(false);
        setReviewRows([]);
        setSpecialInputs(Object.fromEntries(doublePanas.map((n) => [n, ''])));
        setGroupBulk(Object.fromEntries(Array.from({ length: 10 }, (_, d) => [String(d), ''])));
        setGroupQuickSelected(Object.fromEntries(Array.from({ length: 10 }, (_, d) => [String(d), null])));
        // Reset scheduled date to today after bet is placed
        const today = new Date().toISOString().split('T')[0];
        setSelectedDate(today);
        try {
            localStorage.removeItem('betSelectedDate');
        } catch (e) {
            // Ignore errors
        }
    };

    const handleCancel = () => clearAll();
    const handleSubmit = async () => {
        const marketId = market?._id || market?.id;
        if (!marketId) throw new Error('Market not found');
        const payload = reviewRows.map((r) => ({
            betType: 'panna',
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
        
        const result = await placeBet(marketId, payload, scheduledDate);
        if (!result.success) throw new Error(result.message);
        if (result.data?.newBalance != null) updateUserBalance(result.data.newBalance);
        setIsReviewOpen(false);
        clearAll();
    };

    const openReview = () => {
        const rows = Object.entries(specialInputs)
            .filter(([, pts]) => Number(pts) > 0)
            .map(([num, pts]) => ({
                id: `${num}-${pts}-${session}`,
                number: num,
                points: String(pts),
                type: session,
            }));

        if (!rows.length) {
            showWarning('Please enter points for at least one Double Pana.');
            return;
        }

        setReviewRows(rows);
        setIsReviewOpen(true);
    };

    const totalPoints = useMemo(
        () => reviewRows.reduce((sum, b) => sum + Number(b.points || 0), 0),
        [reviewRows]
    );

    const submitBtnClass = (enabled) =>
        enabled
            ? 'w-full bg-[#d4af37] text-[#4b3608] font-bold py-3.5 min-h-[52px] rounded-lg shadow-lg transition-all active:scale-[0.98]'
            : 'w-full bg-white/20 text-gray-400 font-bold py-3.5 min-h-[52px] rounded-lg shadow-lg opacity-50 cursor-not-allowed';

    const applyQuickToPanaCell = (groupKey, num) => {
        const sel = groupQuickSelected[groupKey];
        const delta = Number(sel);
        if (!sel || !Number.isFinite(delta) || delta <= 0) {
            return;
        }
        setSpecialInputs((prev) => {
            const cur = Number(prev[num] || 0) || 0;
            const next = Math.min(cur + delta, 999999);
            return { ...prev, [num]: String(next) };
        });
    };

    return (
        <BidLayout
            market={market}
            title={title}
            bidsCount={specialCount}
            totalPoints={selectedTotalPoints}
            session={session}
            setSession={setSession}
            showSessionOnMobile
            selectedDate={selectedDate}
            setSelectedDate={handleDateChange}
            sessionRightSlot={
                <button
                    type="button"
                    onClick={openReview}
                    disabled={!canSubmit}
                    className={`hidden md:inline-flex items-center justify-center font-bold min-h-[44px] min-w-[220px] px-6 rounded-full shadow-lg transition-all whitespace-nowrap ${
                        canSubmit
                            ? 'bg-[#d4af37] text-[#4b3608] hover:bg-[#e5c04a] active:scale-[0.98]'
                            : 'bg-white/20 text-gray-400 opacity-50 cursor-not-allowed'
                    }`}
                >
                    Submit Bet
                </button>
            }
            walletBalance={walletBefore}
            extraHeader={null}
            hideFooter
            contentPaddingClass="pb-28 md:pb-8"
        >
            <div className="px-3 sm:px-6 py-3">
                {warning && (
                    <div className="mb-3 bg-red-50 border-2 border-red-300 text-red-600 rounded-xl px-4 py-3 text-sm">
                        {warning}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-1.5 md:gap-2 px-1 mb-3">
                    <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#202124] px-2 py-1.5 md:px-3 md:py-2 text-center">
                        <div className="text-[11px] text-gray-400 font-medium">Count</div>
                        <div className="text-base font-bold text-amber-800 dark:text-[#f2c14e] leading-tight">{specialCount}</div>
                    </div>
                    <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#202124] px-2 py-1.5 md:px-3 md:py-2 text-center">
                        <div className="text-[11px] text-gray-400 font-medium">Bet Amount</div>
                        <div className="text-base font-bold text-amber-800 dark:text-[#f2c14e] leading-tight">{selectedTotalPoints}</div>
                    </div>
                </div>

                {/* Same UI as SinglePanaBulkBid */}
                <div className="space-y-7 md:space-y-0 md:grid md:grid-cols-4 md:gap-x-5 md:gap-y-10 md:items-start">
                    {Array.from({ length: 10 }, (_, d) => String(d)).map((groupKey) => {
                        const list = panasBySumDigit[groupKey] || [];
                        if (!list.length) return null;

                        const applyGroup = (pts) => {
                            const p = sanitizePoints(pts);
                            const n = Number(p);
                            if (!n || n <= 0) {
                                showWarning('Please enter points.');
                                return;
                            }
                            setSpecialInputs((prev) => {
                                const next = { ...prev };
                                for (const num of list) next[num] = String(n);
                                return next;
                            });
                            setGroupBulk((prev) => ({ ...prev, [groupKey]: '' }));
                        };
                        const clearGroup = () => {
                            setSpecialInputs((prev) => {
                                const next = { ...prev };
                                for (const num of list) next[num] = '';
                                return next;
                            });
                            setGroupBulk((prev) => ({ ...prev, [groupKey]: '' }));
                            setGroupQuickSelected((prev) => ({ ...prev, [groupKey]: null }));
                        };

                        return (
                            <div key={groupKey} className="space-y-3 pb-1">
                                {/* Group header: same "box + input" style */}
                                <div className="flex items-center gap-2">
                                    <div className="w-10 h-9 bg-[#d4af37] border-2 border-gray-200 dark:border-white/10 text-white flex items-center justify-center rounded-l-md font-bold text-xs shrink-0">
                                        {groupKey}
                                    </div>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={groupBulk[groupKey]}
                                        onChange={(e) =>
                                            setGroupBulk((p) => ({ ...p, [groupKey]: sanitizePoints(e.target.value) }))
                                        }
                                        onBlur={(e) => {
                                            const v = sanitizePoints(e.currentTarget.value);
                                            if (v && Number(v) > 0) applyGroup(v);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                const v = sanitizePoints(e.currentTarget.value);
                                                if (v && Number(v) > 0) applyGroup(v);
                                            }
                                        }}
                                        onClick={(e) => {
                                            const v = sanitizePoints(e.currentTarget.value);
                                            if (v && Number(v) > 0) applyGroup(v);
                                        }}
                                        placeholder="All pts"
                                        title="Type points, then tap here, Apply, or Enter to fill this whole column; you can still edit each Pts box."
                                        className="no-spinner w-[86px] sm:w-[96px] md:w-[72px] lg:w-[80px] h-9 bg-white dark:bg-[#202124] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-500 rounded focus:outline-none focus:border-[#d4af37] px-2 text-xs md:text-[11px] font-semibold text-center"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => groupBulk[groupKey] && applyGroup(groupBulk[groupKey])}
                                        disabled={!groupBulk[groupKey]}
                                        className={`h-9 px-3 rounded-md font-bold text-xs border-2 transition-colors ${
                                            groupBulk[groupKey]
                                                ? 'bg-white border-gray-400 text-amber-800 dark:text-[#f2c14e] hover:border-gray-500 hover:bg-white/10'
                                                : 'bg-white/10 border-gray-200 dark:border-white/10 text-gray-400 cursor-not-allowed'
                                        }`}
                                        title="Apply points to all numbers in this group"
                                    >
                                        Apply
                                    </button>
                                    <button
                                        type="button"
                                        onClick={clearGroup}
                                        className="h-9 px-3 rounded-md font-bold text-xs border-2 border-gray-200 dark:border-white/10 text-gray-400 bg-white dark:bg-[#202124] hover:bg-white/10 transition-colors"
                                        title="Clear this group"
                                    >
                                        Clear
                                    </button>
                                </div>
                                <QuickPointsRow
                                    className="w-full"
                                    stackedLabel
                                    stackedLabelSecondLine="Points :"
                                    value={groupQuickSelected[groupKey]}
                                    onSelect={(pts) =>
                                        setGroupQuickSelected((p) => ({
                                            ...p,
                                            [groupKey]:
                                                p[groupKey] === String(pts) ? null : String(pts),
                                        }))
                                    }
                                    labelClassName="text-[11px] font-semibold text-gray-300 shrink-0"
                                />

                                {/* Two-column layout: tighten + left align only on desktop */}
                                <div className="grid grid-cols-2 gap-3 md:grid-cols-[max-content_max-content] md:justify-start md:gap-x-4 md:gap-y-2">
                                    {list.map((num) => {
                                        const hasBet = Number(specialInputs[num] || 0) > 0;
                                        return (
                                            <div
                                                key={num}
                                                role="presentation"
                                                className={`flex items-center gap-1.5 rounded-lg p-0.5 transition-all duration-200 ${
                                                    groupQuickSelected[groupKey] ? 'cursor-pointer' : ''
                                                } ${
                                                    hasBet ? 'shadow-md ring-1 ring-[#d4af37]/40 bg-[#d4af37]/10' : 'focus-within:bg-white/5'
                                                }`}
                                                onClick={() => applyQuickToPanaCell(groupKey, num)}
                                            >
                                                <div
                                                    className={`w-10 h-9 border-0 flex items-center justify-center rounded-l-md font-bold text-xs shrink-0 select-none active:opacity-90 transition-colors ${
                                                        hasBet ? 'bg-[#f2c14e] text-[#4b3608] shadow-inner' : 'bg-[#d4af37] text-white'
                                                    }`}
                                                >
                                                    {num}
                                                </div>
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    placeholder="Pts"
                                                    value={specialInputs[num]}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        applyQuickToPanaCell(groupKey, num);
                                                    }}
                                                    onChange={(e) =>
                                                        setSpecialInputs((p) => ({
                                                            ...p,
                                                            [num]: sanitizePoints(e.target.value),
                                                        }))
                                                    }
                                                    className={`no-spinner w-full md:w-[64px] lg:w-[72px] h-9 border-0 text-gray-900 dark:text-white placeholder-gray-400 rounded-r-md focus:outline-none focus:ring-0 px-2 text-xs md:text-[11px] font-semibold text-center transition-colors ${
                                                        hasBet ? 'bg-[#d4af37]/15 text-amber-800 dark:text-[#f2c14e] shadow-inner border border-[#d4af37]/30' : 'bg-white dark:bg-[#202124]'
                                                    }`}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Submit Bet: same as SinglePanaBulkBid (mobile sticky, desktop top button) */}
            <div className="md:hidden fixed left-0 right-0 bottom-[calc(env(safe-area-inset-bottom,0px)+92px)] z-40 px-3">
                <button type="button" onClick={openReview} disabled={!canSubmit} className={submitBtnClass(canSubmit)}>
                    Submit Bet
                </button>
            </div>

            <BidReviewModal
                open={isReviewOpen}
                onClose={handleCancel}
                onSubmit={handleSubmit}
                marketTitle={marketTitle}
                dateText={dateText}
                labelKey="Pana"
                rows={reviewRows}
                walletBefore={walletBefore}
                totalBids={reviewRows.length}
                totalAmount={totalPoints}
            />
        </BidLayout>
    );
};

export default DoublePanaBulkBid;

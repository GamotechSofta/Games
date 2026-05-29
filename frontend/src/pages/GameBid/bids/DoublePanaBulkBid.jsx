import React, { useEffect, useMemo, useState } from 'react';
import BidLayout from '../BidLayout';
import BidReviewModal from './BidReviewModal';
import QuickPointsRow from './QuickPointsRow';
import { placeBet, updateUserBalance } from '../../../api/bets';
import useScheduledBetDate from '../../../hooks/useScheduledBetDate';

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
    const { selectedDate, setSelectedDate: handleDateChange, scheduledDateForApi, reviewDateText, displayDate } =
        useScheduledBetDate();
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
    const dateText = reviewDateText;

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

    const handleCancel = () => {
        setIsReviewOpen(false);
        clearAll();
    };
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
        
        const result = await placeBet(marketId, payload, scheduledDateForApi);
        if (!result.success) throw new Error(result.message);
        if (result.data?.newBalance != null) updateUserBalance(result.data.newBalance);
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
    const statCardClass = 'rounded-xl border border-gray-200 dark:border-white/20 bg-white dark:bg-[#202329] px-2 py-1.5 md:px-3 md:py-2 text-center';
    const statValueClass = 'text-base font-bold text-gray-700 dark:text-red-300 leading-tight';
    const greenSubmitClass = (enabled) =>
        enabled
            ? 'bg-gradient-to-r from-emerald-600 to-green-500 text-white dark:border dark:border-white/20 hover:from-emerald-500 hover:to-green-400 active:scale-[0.98]'
            : 'bg-gradient-to-r from-emerald-600 to-green-500 text-white dark:border dark:border-white/20 opacity-50 cursor-not-allowed';
    const groupBadgeClass = (hasBet = false) =>
        `w-10 h-9 border-2 border-gray-200 dark:border-white/20 flex items-center justify-center rounded-l-md font-bold text-xs shrink-0 ${
            hasBet ? 'bg-red-700 text-white' : 'bg-gradient-to-br from-red-700 to-red-600 text-white'
        }`;
    const groupInputClass = 'no-spinner w-[86px] sm:w-[96px] md:w-[72px] lg:w-[80px] h-9 bg-white dark:bg-[#202329] border border-gray-200 dark:border-white/20 text-gray-900 dark:text-white placeholder-gray-500 rounded focus:outline-none focus:border-gray-500 dark:focus:border-white/35 px-2 text-xs md:text-[11px] font-semibold text-center';
    const actionBtnClass = 'h-9 px-3 rounded-md font-bold text-xs border-2 transition-colors border-gray-200 dark:border-white/20 bg-white dark:bg-[#202329] text-gray-700 dark:text-red-200 hover:border-gray-400 dark:hover:border-white/35';
    const groupQuickLabelClass = 'text-[11px] font-semibold text-gray-900 dark:text-gray-200 shrink-0';
    const cellWrapClass = (hasBet) => `flex items-center gap-1.5 rounded-lg p-0.5 border transition-all duration-200 ${hasBet ? 'border-gray-200 dark:border-white/20 shadow-md bg-gray-50 dark:bg-[#1b1d22]' : 'border-gray-200/70 dark:border-white/10 bg-white/70 dark:bg-[#202329]'}`;
    const cellBadgeClass = (hasBet) => `w-10 h-9 border-0 flex items-center justify-center rounded-l-md font-bold text-xs shrink-0 select-none active:opacity-90 transition-colors ${hasBet ? 'bg-red-700 text-white shadow-inner' : 'bg-gradient-to-br from-red-700 to-red-600 text-white'}`;
    const cellInputClass = (hasBet) => `no-spinner w-full md:w-[64px] lg:w-[72px] h-9 border-0 text-gray-900 dark:text-white placeholder-gray-400 rounded-r-md focus:outline-none focus:ring-0 px-2 text-xs md:text-[11px] font-semibold text-center transition-colors ${hasBet ? 'bg-gray-50 dark:bg-[#17191d] border border-red-300 dark:border-white/25 text-gray-700 dark:text-red-300 shadow-inner' : 'bg-white dark:bg-[#202329]'}`;

    const submitBtnClass = (enabled) =>
        enabled
            ? 'w-full bg-gradient-to-r from-emerald-600 to-green-500 text-white dark:border dark:border-white/20 font-bold py-3.5 min-h-[52px] rounded-lg shadow-lg transition-all hover:from-emerald-500 hover:to-green-400 active:scale-[0.98]'
            : 'w-full bg-gradient-to-r from-emerald-600 to-green-500 text-white dark:border dark:border-white/20 font-bold py-3.5 min-h-[52px] rounded-lg shadow-lg opacity-50 cursor-not-allowed';

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
                            ? greenSubmitClass(true)
                            : greenSubmitClass(false)
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
                    <div className="mb-3 bg-gray-50 border-2 border-red-300 text-gray-600 rounded-xl px-4 py-3 text-sm">
                        {warning}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-1.5 md:gap-2 px-1 mb-3">
                    <div className={statCardClass}>
                        <div className="text-[11px] text-gray-600 dark:text-gray-300 font-medium">Count</div>
                        <div className={statValueClass}>{specialCount}</div>
                    </div>
                    <div className={statCardClass}>
                        <div className="text-[11px] text-gray-600 dark:text-gray-300 font-medium">Bet Amount</div>
                        <div className={statValueClass}>{selectedTotalPoints}</div>
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
                                    <div className={groupBadgeClass(Number(groupBulk[groupKey]) > 0)}>
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
                                        className={groupInputClass}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => groupBulk[groupKey] && applyGroup(groupBulk[groupKey])}
                                        disabled={!groupBulk[groupKey]}
                                        className={`h-9 px-3 rounded-md font-bold text-xs border-2 transition-colors ${
                                            groupBulk[groupKey]
                                                ? 'bg-white dark:bg-[#202329] border-gray-200 dark:border-white/20 text-gray-700 dark:text-red-200 hover:border-gray-400 dark:hover:border-white/35'
                                                : 'bg-white/10 border-gray-200 dark:border-white/20 text-gray-400 cursor-not-allowed'
                                        }`}
                                        title="Apply points to all numbers in this group"
                                    >
                                        Apply
                                    </button>
                                    <button
                                        type="button"
                                        onClick={clearGroup}
                                        className={actionBtnClass}
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
                                    labelClassName={groupQuickLabelClass}
                                />

                                {/* Two-column layout: tighten + left align only on desktop */}
                                <div className="grid grid-cols-2 gap-3 md:grid-cols-[max-content_max-content] md:justify-start md:gap-x-4 md:gap-y-2">
                                    {list.map((num) => {
                                        const hasBet = Number(specialInputs[num] || 0) > 0;
                                        return (
                                            <div
                                                key={num}
                                                role="presentation"
                                                className={`${cellWrapClass(hasBet)} ${groupQuickSelected[groupKey] ? 'cursor-pointer' : ''}`}
                                                onClick={() => applyQuickToPanaCell(groupKey, num)}
                                            >
                                                <div
                                                    className={cellBadgeClass(hasBet)}
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
                                                    className={cellInputClass(hasBet)}
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

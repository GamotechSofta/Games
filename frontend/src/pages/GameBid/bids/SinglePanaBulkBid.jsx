import React, { useEffect, useMemo, useState } from 'react';
import BidLayout from '../BidLayout';
import BidReviewModal from './BidReviewModal';
import QuickPointsRow from './QuickPointsRow';
import { placeBet, updateUserBalance } from '../../../api/bets';
import useScheduledBetDate from '../../../hooks/useScheduledBetDate';

const sanitizePoints = (v) => (v ?? '').toString().replace(/\D/g, '').slice(0, 6);
// Valid Single Panna chart (as per screenshots) grouped by sum digit (0-9)
const SINGLE_PANA_BY_SUM = {
    '0': ['127','136','145','190','235','280','370','389','460','479','569','578'],
    '1': ['128','137','146','236','245','290','380','470','489','560','579','678'],
    '2': ['129','138','147','156','237','246','345','390','480','570','589','679'],
    '3': ['120','139','148','157','238','247','256','346','490','580','670','689'],
    '4': ['130','149','158','167','239','248','257','347','356','590','680','789'],
    '5': ['140','159','168','230','249','258','267','348','357','456','690','780'],
    '6': ['123','150','169','178','240','259','268','349','358','367','457','790'],
    '7': ['124','160','179','250','269','278','340','359','368','458','467','890'],
    '8': ['125','134','170','189','260','279','350','369','378','459','468','567'],
    '9': ['126','135','180','234','270','289','360','379','450','469','478','568'],
};

const buildSinglePanas = () =>
    Object.keys(SINGLE_PANA_BY_SUM)
        .sort()
        .flatMap((k) => SINGLE_PANA_BY_SUM[k]);

const SinglePanaBulkBid = ({ market, title }) => {
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

    const singlePanas = useMemo(() => buildSinglePanas(), []);
    const [specialInputs, setSpecialInputs] = useState(() =>
        Object.fromEntries(singlePanas.map((n) => [n, '']))
    );
    const [groupBulk, setGroupBulk] = useState(() =>
        Object.fromEntries(Array.from({ length: 10 }, (_, d) => [String(d), '']))
    );
    /** Per sum-digit column: selected Quick Points brush (does not fill cells until you tap a pana). */
    const [groupQuickSelected, setGroupQuickSelected] = useState(() =>
        Object.fromEntries(Array.from({ length: 10 }, (_, d) => [String(d), null]))
    );

    const panasBySumDigit = useMemo(() => ({ ...SINGLE_PANA_BY_SUM }), []);

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
        setSpecialInputs(Object.fromEntries(singlePanas.map((n) => [n, ''])));
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
            showWarning('Please enter points for at least one Single Panna.');
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

                {/* Same visual style as Jodi Special Mode: flat grid + small cells */}
                <div className="space-y-7 md:space-y-0 md:grid md:grid-cols-4 md:gap-x-5 md:gap-y-10 md:items-start">
                    {Array.from({ length: 10 }, (_, d) => String(d)).map((groupKey) => {
                        const list = panasBySumDigit[groupKey] || [];
                        if (!list.length) return null;

                        const applyGroup = (rawPts) => {
                            const p = sanitizePoints(rawPts);
                            const n = Number(p);
                            if (!n || n <= 0) {
                                showWarning('Please enter points.');
                                return;
                            }
                            setSpecialInputs((prev) => {
                                const next = { ...prev };
                                for (const num of list) {
                                    next[num] = String(n);
                                }
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
                                        title="Type points, then tap here, Apply, Enter, or leave the field — fills this column; you can still edit each Pts box."
                                        className={groupInputClass}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const v = groupBulk[groupKey];
                                            if (v) applyGroup(v);
                                        }}
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

            {/* Submit Bet: match Jodi Special Mode (mobile sticky, desktop inline) */}
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

export default SinglePanaBulkBid;

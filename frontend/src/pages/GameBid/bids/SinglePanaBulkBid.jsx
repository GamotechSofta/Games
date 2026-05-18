import React, { useEffect, useMemo, useState } from 'react';
import BidLayout from '../BidLayout';
import BidReviewModal from './BidReviewModal';
import QuickPointsRow from './QuickPointsRow';
import { placeBet, updateUserBalance } from '../../../api/bets';

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
        setIsReviewOpen(false);
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
                    <div className="rounded-xl border border-white/10 bg-[#202124] px-2 py-1.5 md:px-3 md:py-2 text-center">
                        <div className="text-[11px] text-gray-400 font-medium">Count</div>
                        <div className="text-base font-bold text-[#f2c14e] leading-tight">{specialCount}</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-[#202124] px-2 py-1.5 md:px-3 md:py-2 text-center">
                        <div className="text-[11px] text-gray-400 font-medium">Bet Amount</div>
                        <div className="text-base font-bold text-[#f2c14e] leading-tight">{selectedTotalPoints}</div>
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
                                    <div className="w-10 h-9 bg-[#d4af37] border-2 border-white/10 text-white flex items-center justify-center rounded-l-md font-bold text-xs shrink-0">
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
                                        className="no-spinner w-[86px] sm:w-[96px] md:w-[72px] lg:w-[80px] h-9 bg-[#202124] border border-white/10 text-white placeholder-gray-500 rounded focus:outline-none focus:border-[#d4af37] px-2 text-xs md:text-[11px] font-semibold text-center"
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
                                                ? 'bg-white border-gray-400 text-[#f2c14e] hover:border-gray-500 hover:bg-white/10'
                                                : 'bg-white/10 border-white/10 text-gray-400 cursor-not-allowed'
                                        }`}
                                        title="Apply points to all numbers in this group"
                                    >
                                        Apply
                                    </button>
                                    <button
                                        type="button"
                                        onClick={clearGroup}
                                        className="h-9 px-3 rounded-md font-bold text-xs border-2 border-white/10 text-gray-400 bg-[#202124] hover:bg-white/10 transition-colors"
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
                                                className={`no-spinner w-full md:w-[64px] lg:w-[72px] h-9 border-0 text-white placeholder-gray-400 rounded-r-md focus:outline-none focus:ring-0 px-2 text-xs md:text-[11px] font-semibold text-center transition-colors ${
                                                    hasBet ? 'bg-[#d4af37]/15 text-[#f2c14e] shadow-inner border border-[#d4af37]/30' : 'bg-[#202124]'
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

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import BidLayout from '../BidLayout';
import BidReviewModal from './BidReviewModal';
import QuickPointsRow from './QuickPointsRow';
import { placeBet, updateUserBalance } from '../../../api/bets';
import useScheduledBetDate from '../../../hooks/useScheduledBetDate';
import { bidClearBtn } from '../../../styles/appTheme';
import { BidDesktopStats } from '../BidInlineStats';

const DIGITS = Array.from({ length: 10 }, (_, i) => String(i));
const sanitizePoints = (v) => (v ?? '').toString().replace(/\D/g, '').slice(0, 6);

const JodiBulkBid = ({ market, title }) => {
    const cellRefs = useRef({});
    const pendingFocusRef = useRef(null);

    const [session, setSession] = useState('OPEN');
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [warning, setWarning] = useState('');
    const [selectedQuickPoint, setSelectedQuickPoint] = useState(null);
    const { selectedDate, setSelectedDate: handleDateChange, scheduledDateForApi, reviewDateText, displayDate } =
        useScheduledBetDate();

    const showWarning = (msg) => {
        setWarning(msg);
        window.clearTimeout(showWarning._t);
        showWarning._t = window.setTimeout(() => setWarning(''), 2400);
    };

    useEffect(() => {
        // Jodi: allow OPEN only (no CLOSE bets)
        if (session !== 'OPEN') setSession('OPEN');
    }, [session]);

    // cell values: key "rc" (row digit + col digit) => points string
    const [cells, setCells] = useState(() => {
        const init = {};
        for (const r of DIGITS) for (const c of DIGITS) init[`${r}${c}`] = '';
        return init;
    });
    const [rowBulk, setRowBulk] = useState(() => Object.fromEntries(DIGITS.map((d) => [d, ''])));
    const [colBulk, setColBulk] = useState(() => Object.fromEntries(DIGITS.map((d) => [d, ''])));
    const [isDesktop, setIsDesktop] = useState(() => {
        if (typeof window === 'undefined') return true;
        return window.innerWidth >= 768;
    });
    const [columnStart, setColumnStart] = useState(0);
    const MOBILE_VISIBLE_COLS = 10;

    useEffect(() => {
        const onResize = () => setIsDesktop(window.innerWidth >= 768);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    useEffect(() => {
        // Reset view window when switching desktop/mobile
        if (isDesktop) {
            setColumnStart(0);
        } else {
            const maxStart = Math.max(0, DIGITS.length - MOBILE_VISIBLE_COLS);
            setColumnStart((prev) => Math.max(0, Math.min(prev, maxStart)));
        }
    }, [isDesktop]);

    const visibleDigits = DIGITS;
    const canSlideLeft = false;
    const canSlideRight = false;

    // Auto-apply row/column Pts after typing (no Enter or blur needed)
    const rowApplyTimersRef = useRef({});
    const colApplyTimersRef = useRef({});
    const APPLY_DELAY_MS = 600;

    useEffect(() => {
        const timers = {};
        DIGITS.forEach((r) => {
            const val = rowBulk[r];
            if (!val || Number(val) <= 0) return;
            if (rowApplyTimersRef.current[r]) clearTimeout(rowApplyTimersRef.current[r]);
            timers[r] = setTimeout(() => {
                applyRow(r, val);
                rowApplyTimersRef.current[r] = null;
            }, APPLY_DELAY_MS);
            rowApplyTimersRef.current[r] = timers[r];
        });
        return () => DIGITS.forEach((r) => { if (rowApplyTimersRef.current[r]) clearTimeout(rowApplyTimersRef.current[r]); });
    }, [rowBulk]);

    useEffect(() => {
        const timers = {};
        DIGITS.forEach((c) => {
            const val = colBulk[c];
            if (!val || Number(val) <= 0) return;
            if (colApplyTimersRef.current[c]) clearTimeout(colApplyTimersRef.current[c]);
            timers[c] = setTimeout(() => {
                applyCol(c, val);
                colApplyTimersRef.current[c] = null;
            }, APPLY_DELAY_MS);
            colApplyTimersRef.current[c] = timers[c];
        });
        return () => DIGITS.forEach((c) => { if (colApplyTimersRef.current[c]) clearTimeout(colApplyTimersRef.current[c]); });
    }, [colBulk]);

    // After column slide on mobile, focus the pending cell
    useEffect(() => {
        const p = pendingFocusRef.current;
        if (!p) return;
        const el = cellRefs.current[`${p.r}-${p.c}`];
        if (el) {
            el.focus();
            pendingFocusRef.current = null;
        }
    }, [columnStart]);

    const handleCellKeyDown = useCallback(
        (e, r, c) => {
            const key = e.key;
            if (key !== 'ArrowLeft' && key !== 'ArrowRight' && key !== 'ArrowUp' && key !== 'ArrowDown') return;
            const ri = DIGITS.indexOf(r);
            const ci = DIGITS.indexOf(c);
            if (ri === -1 || ci === -1) return;

            let nextR = ri;
            let nextC = ci;
            if (key === 'ArrowLeft') {
                if (ci <= 0) return;
                nextC = ci - 1;
            } else if (key === 'ArrowRight') {
                if (ci >= DIGITS.length - 1) return;
                nextC = ci + 1;
            } else if (key === 'ArrowUp') {
                if (ri <= 0) return;
                nextR = ri - 1;
            } else if (key === 'ArrowDown') {
                if (ri >= DIGITS.length - 1) return;
                nextR = ri + 1;
            }

            const nextRStr = DIGITS[nextR];
            const nextCStr = DIGITS[nextC];

            if (!isDesktop) {
                const colIdx = DIGITS.indexOf(nextCStr);
                const visibleStart = columnStart;
                const visibleEnd = columnStart + MOBILE_VISIBLE_COLS - 1;
                if (colIdx < visibleStart || colIdx > visibleEnd) {
                    const newStart = Math.max(0, Math.min(colIdx, DIGITS.length - MOBILE_VISIBLE_COLS));
                    pendingFocusRef.current = { r: nextRStr, c: nextCStr };
                    setColumnStart(newStart);
                    e.preventDefault();
                    return;
                }
            }

            e.preventDefault();
            const el = cellRefs.current[`${nextRStr}-${nextCStr}`];
            if (el) el.focus();
        },
        [isDesktop, columnStart]
    );

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
    const clearBtnClass = `${bidClearBtn} px-3 py-1.5 rounded-md text-xs sm:text-sm shrink-0 h-8 sm:h-10 flex items-center justify-center`;
    const panelClass = 'bg-transparent border-0 rounded-none p-0 md:bg-white dark:bg-[#202329] md:border md:border-gray-200 dark:border-white/20 md:rounded-2xl md:p-3 overflow-hidden w-full pt-5';
    const mobileGridClass = 'md:hidden overflow-x-hidden rounded-md border border-gray-200 dark:border-white/20 bg-white dark:bg-[#202329] p-1';
    const desktopGridClass = 'hidden md:block rounded-md border border-gray-200 dark:border-white/20 bg-white dark:bg-[#202329] p-2';
    const blockLabelClass = 'h-6 sm:h-7 flex items-center justify-center text-gray-700 dark:text-red-200 font-extrabold text-[11px] sm:text-sm tracking-wide';
    const blockLabelDesktopClass = 'h-8 flex items-center justify-center text-gray-700 dark:text-red-200 font-extrabold text-xs tracking-wide';
    const blockInputMobileClass = 'no-spinner h-6 sm:h-7 w-full rounded-[2px] border border-gray-200 dark:border-white/20 bg-white dark:bg-[#17191d] px-0.5 sm:px-1 text-center text-[10px] sm:text-xs font-semibold text-gray-900 dark:text-red-200 placeholder:text-gray-500 placeholder:text-center focus:outline-none focus:ring-1 focus:ring-red-400 dark:focus:ring-white/20';
    const blockInputDesktopClass = 'no-spinner h-8 w-full min-w-0 rounded-md border border-gray-200 dark:border-white/20 bg-white dark:bg-[#17191d] px-2 text-center text-[11px] font-semibold text-gray-900 dark:text-red-200 placeholder:text-center placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-red-400 dark:focus:ring-white/20';
    const cellInputMobileClass = (hasBet) => `no-spinner h-6 sm:h-7 w-full rounded-[2px] px-0.5 sm:px-1 text-center text-[10px] sm:text-xs font-semibold text-gray-900 dark:text-red-200 focus:outline-none focus:ring-1 focus:ring-red-400 dark:focus:ring-white/20 ${hasBet ? 'border border-red-300 dark:border-white/25 bg-gray-50 dark:bg-[#1b1d22]' : 'border border-gray-200 dark:border-white/20 bg-white dark:bg-[#17191d]'}`;
    const cellInputDesktopClass = (hasBet) => `no-spinner h-8 w-full min-w-0 rounded-l-none rounded-r-md px-2 text-center text-[11px] font-semibold text-gray-900 dark:text-red-200 placeholder:text-center placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-red-400 dark:focus:ring-white/20 ${hasBet ? 'border border-red-300 dark:border-white/25 bg-gray-50 dark:bg-[#1b1d22]' : 'border border-gray-200 dark:border-white/20 bg-white dark:bg-[#17191d]'}`;
    const cellBadgeClass = (hasBet) => `h-8 w-8 rounded-l-md rounded-r-none px-1 text-[10px] font-bold tracking-wide ${hasBet ? 'bg-red-600 text-white' : 'bg-gradient-to-br from-red-700 to-red-600 text-white'}`;

    const applyRow = (r, pts) => {
        const p = Number(pts);
        if (!p || p <= 0) {
            showWarning('Please enter points.');
            return;
        }
        setCells((prev) => {
            const next = { ...prev };
            for (const c of DIGITS) {
                const key = `${r}${c}`;
                const cur = Number(String(next[key] ?? '').replace(/\D/g, '')) || 0;
                next[key] = sanitizePoints(String(cur + p));
            }
            return next;
        });
        setRowBulk((prev) => ({ ...prev, [r]: '' }));
    };

    const applyCol = (c, pts) => {
        const p = Number(pts);
        if (!p || p <= 0) {
            showWarning('Please enter points.');
            return;
        }
        setCells((prev) => {
            const next = { ...prev };
            for (const r of DIGITS) {
                const key = `${r}${c}`;
                const cur = Number(String(next[key] ?? '').replace(/\D/g, '')) || 0;
                next[key] = sanitizePoints(String(cur + p));
            }
            return next;
        });
        setColBulk((prev) => ({ ...prev, [c]: '' }));
    };

    const clearRow = (r) => {
        setCells((prev) => {
            const next = { ...prev };
            for (const c of DIGITS) {
                next[`${r}${c}`] = '';
            }
            return next;
        });
    };

    const clearCol = (c) => {
        setCells((prev) => {
            const next = { ...prev };
            for (const r of DIGITS) {
                next[`${r}${c}`] = '';
            }
            return next;
        });
    };

    /** Single cell: each tap adds Quick Points to that cell only. */
    const applyQuickPointToCell = (key) => {
        const p = Number(selectedQuickPoint);
        if (!p || p <= 0) return;
        setCells((prev) => {
            const cur = Number(String(prev[key] ?? '').replace(/\D/g, '')) || 0;
            const sum = cur + p;
            return { ...prev, [key]: sanitizePoints(String(sum)) };
        });
    };

    /** BLOCK row Pts: add Quick Points to every jodi in that row (same rules as single cell). Do not write rowBulk — avoids auto-apply timer double-adding. */
    const applyQuickPointToRow = (r) => {
        const p = Number(selectedQuickPoint);
        if (!p || p <= 0) return;
        setCells((prev) => {
            const next = { ...prev };
            for (const c of DIGITS) {
                const key = `${r}${c}`;
                const cur = Number(String(next[key] ?? '').replace(/\D/g, '')) || 0;
                next[key] = sanitizePoints(String(cur + p));
            }
            return next;
        });
    };

    /** Top BLOCK column Pts: add Quick Points to every jodi in that column. */
    const applyQuickPointToCol = (c) => {
        const p = Number(selectedQuickPoint);
        if (!p || p <= 0) return;
        setCells((prev) => {
            const next = { ...prev };
            for (const r of DIGITS) {
                const key = `${r}${c}`;
                const cur = Number(String(next[key] ?? '').replace(/\D/g, '')) || 0;
                next[key] = sanitizePoints(String(cur + p));
            }
            return next;
        });
    };

    const handleFormClear = () => {
        setCells(() => {
            const init = {};
            for (const r of DIGITS) for (const c of DIGITS) init[`${r}${c}`] = '';
            return init;
        });
        setRowBulk(Object.fromEntries(DIGITS.map((d) => [d, ''])));
        setColBulk(Object.fromEntries(DIGITS.map((d) => [d, ''])));
        setSelectedQuickPoint(null);
    };

    const clearAll = () => {
        handleFormClear();
        // Reset scheduled date to today after bet is placed
        const today = new Date().toISOString().split('T')[0];
        setSelectedDate(today);
        try {
            localStorage.removeItem('betSelectedDate');
        } catch (e) {
            // Ignore errors
        }
    };

    const handleSubmitBet = () => {
        if (!rows.length) {
            showWarning('Please enter points for at least one Jodi.');
            return;
        }
        setIsReviewOpen(true);
    };

    const handleCloseReview = () => {
        setIsReviewOpen(false);
        clearAll();
    };

    const handleConfirmReview = async () => {
        const marketId = market?._id || market?.id;
        if (!marketId) throw new Error('Market not found');
        const payload = rows.map((r) => ({
            betType: 'jodi',
            betNumber: String(r.number),
            amount: Number(r.points) || 0,
            betOn: 'open',
        }));
        
        const result = await placeBet(marketId, payload, scheduledDateForApi);
        if (!result.success) throw new Error(result.message);
        if (result.data?.newBalance != null) updateUserBalance(result.data.newBalance);
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
            // Desktop only: make date ~1/3 width and keep controls same height
            dateSessionGridClassName="md:grid-cols-[1fr_2fr]"
            dateSessionControlClassName="md:min-h-[52px] md:text-base"
            displayDate={displayDate}
            selectedDate={selectedDate}
            setSelectedDate={handleDateChange}
            showInlineStats
            extraHeader={<BidDesktopStats count={rows.length} amount={totalPoints} />}
            sessionRightSlot={
                <button
                    type="button"
                    onClick={handleSubmitBet}
                    disabled={!canSubmit}
                    className={`hidden md:inline-flex items-center justify-center font-bold text-base min-h-[52px] min-w-[280px] px-7 rounded-full shadow-lg transition-all whitespace-nowrap ${
                        canSubmit
                            ? 'bg-gradient-to-r from-emerald-600 to-green-500 text-white dark:border dark:border-white/20 hover:from-emerald-500 hover:to-green-400 active:scale-[0.98]'
                            : 'bg-gradient-to-r from-emerald-600 to-green-500 text-white dark:border dark:border-white/20 opacity-50 cursor-not-allowed'
                    }`}
                >
                    Submit Bet
                </button>
            }
            walletBalance={walletBefore}
            hideFooter
            contentPaddingClass="pb-[calc(7rem+env(safe-area-inset-bottom,0px))] md:pb-6"
        >
            <div className="px-2 sm:px-4 md:px-1 py-1 md:py-1 w-full">
                {warning && (
                    <div className="mb-3 bg-gray-50 border-2 border-red-300 text-gray-600 rounded-xl px-4 py-3 text-sm">
                        {warning}
                    </div>
                )}
                <div className="flex items-center gap-1.5 sm:gap-2 mb-2 md:mb-3 min-w-0 px-0.5">
                    <QuickPointsRow
                        className="flex-1 min-w-0"
                        stackedLabel
                        labelClassName="shrink-0 w-11 sm:w-14 text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-100 leading-tight"
                        value={selectedQuickPoint}
                        onSelect={(pts) =>
                            setSelectedQuickPoint((prev) => (prev === pts ? null : pts))
                        }
                        size="sm"
                    />
                    <button type="button" onClick={handleFormClear} className={clearBtnClass}>
                        Clear
                    </button>
                </div>
                <div className={panelClass}>
                    <div className={mobileGridClass}>
                        <div
                            className="grid w-full gap-x-1 gap-y-1 sm:gap-x-2 sm:gap-y-1.5"
                            style={{ gridTemplateColumns: `56px repeat(${visibleDigits.length}, minmax(0, 1fr))` }}
                        >
                            <div className={blockLabelClass}>
                                BLOCK
                            </div>
                            {visibleDigits.map((c) => (
                                <input
                                    key={`col-${c}`}
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="Pts"
                                    value={colBulk[c]}
                                    onChange={(e) => {
                                        const nextVal = sanitizePoints(e.target.value);
                                        setColBulk((p) => ({ ...p, [c]: nextVal }));
                                        if (!nextVal) clearCol(c);
                                    }}
                                    onPointerDown={(e) => {
                                        if (!selectedQuickPoint) return;
                                        e.preventDefault();
                                        applyQuickPointToCol(c);
                                    }}
                                    onBlur={() => {
                                        if (colBulk[c]) applyCol(c, colBulk[c]);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && colBulk[c]) applyCol(c, colBulk[c]);
                                    }}
                                    className={blockInputMobileClass}
                                />
                            ))}

                            {DIGITS.map((r) => (
                                <React.Fragment key={`row-${r}`}>
                                    <div className="grid grid-rows-[10px_minmax(24px,1fr)] sm:grid-rows-[12px_minmax(28px,1fr)]">
                                        <div />
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            placeholder="Pts"
                                            value={rowBulk[r]}
                                            onChange={(e) => {
                                                const nextVal = sanitizePoints(e.target.value);
                                                setRowBulk((p) => ({ ...p, [r]: nextVal }));
                                                if (!nextVal) clearRow(r);
                                            }}
                                            onPointerDown={(e) => {
                                                if (!selectedQuickPoint) return;
                                                e.preventDefault();
                                                applyQuickPointToRow(r);
                                            }}
                                            onBlur={() => {
                                                if (rowBulk[r]) applyRow(r, rowBulk[r]);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && rowBulk[r]) applyRow(r, rowBulk[r]);
                                            }}
                                            className={blockInputMobileClass}
                                        />
                                    </div>

                                    {visibleDigits.map((c) => {
                                        const key = `${r}${c}`;
                                        const hasBet = Number(cells[key] || 0) > 0;
                                        return (
                                            <div key={key} className="grid grid-rows-[10px_minmax(24px,1fr)] sm:grid-rows-[12px_minmax(28px,1fr)]">
                                                <div
                                                    className={`pointer-events-none text-[9px] sm:text-[11px] font-bold leading-none text-center ${
                                                        hasBet ? 'text-gray-700 dark:text-red-300' : 'text-gray-400'
                                                    }`}
                                                >
                                                    {key}
                                                </div>
                                                <input
                                                    ref={(el) => {
                                                        cellRefs.current[`${r}-${c}`] = el;
                                                    }}
                                                    type="text"
                                                    inputMode="numeric"
                                                    value={cells[key]}
                                                    onChange={(e) =>
                                                        setCells((p) => ({
                                                            ...p,
                                                            [key]: sanitizePoints(e.target.value),
                                                        }))
                                                    }
                                                    onPointerDown={(e) => {
                                                        if (!selectedQuickPoint) return;
                                                        e.preventDefault();
                                                        applyQuickPointToCell(key);
                                                    }}
                                                    onKeyDown={(e) => handleCellKeyDown(e, r, c)}
                                                    className={cellInputMobileClass(hasBet)}
                                                />
                                            </div>
                                        );
                                    })}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    <div className={desktopGridClass}>
                        <div className="mb-3 grid grid-cols-[84px_repeat(10,minmax(0,1fr))] gap-2">
                            <div className={blockLabelDesktopClass}>
                                BLOCK
                            </div>
                            {visibleDigits.map((c) => (
                                <div key={`desktop-col-${c}`} className="grid grid-cols-[32px_minmax(0,1fr)] gap-0 min-w-0">
                                    <div />
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        placeholder="Pts"
                                        value={colBulk[c]}
                                        onChange={(e) => {
                                            const nextVal = sanitizePoints(e.target.value);
                                            setColBulk((p) => ({ ...p, [c]: nextVal }));
                                            if (!nextVal) clearCol(c);
                                        }}
                                        onPointerDown={(e) => {
                                            if (!selectedQuickPoint) return;
                                            e.preventDefault();
                                            applyQuickPointToCol(c);
                                        }}
                                        onBlur={() => {
                                            if (colBulk[c]) applyCol(c, colBulk[c]);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && colBulk[c]) applyCol(c, colBulk[c]);
                                        }}
                                        className={blockInputDesktopClass}
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-[84px_1fr] gap-2">
                            <div className="grid grid-rows-10 gap-3">
                                {DIGITS.map((r) => (
                                    <input
                                        key={`desktop-row-${r}`}
                                        type="text"
                                        inputMode="numeric"
                                        placeholder="Pts"
                                        value={rowBulk[r]}
                                        onChange={(e) => {
                                            const nextVal = sanitizePoints(e.target.value);
                                            setRowBulk((p) => ({ ...p, [r]: nextVal }));
                                            if (!nextVal) clearRow(r);
                                        }}
                                        onPointerDown={(e) => {
                                            if (!selectedQuickPoint) return;
                                            e.preventDefault();
                                            applyQuickPointToRow(r);
                                        }}
                                        onBlur={() => {
                                            if (rowBulk[r]) applyRow(r, rowBulk[r]);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && rowBulk[r]) applyRow(r, rowBulk[r]);
                                        }}
                                        className={blockInputDesktopClass}
                                    />
                                ))}
                            </div>

                            <div className="grid grid-cols-10 gap-x-2 gap-y-3">
                                {DIGITS.flatMap((r) =>
                                    visibleDigits.map((c) => {
                                        const key = `${r}${c}`;
                                        const hasBet = Number(cells[key] || 0) > 0;
                                        return (
                                            <div key={`desktop-${key}`} className="ml-8 grid w-[calc(100%-32px)] grid-cols-[32px_minmax(0,1fr)] min-w-0">
                                                <button
                                                    type="button"
                                                    onClick={() => applyQuickPointToCell(key)}
                                                    className={cellBadgeClass(hasBet)}
                                                >
                                                    {key}
                                                </button>
                                                <input
                                                    ref={(el) => {
                                                        cellRefs.current[`${r}-${c}`] = el;
                                                    }}
                                                    type="text"
                                                    inputMode="numeric"
                                                    placeholder="Pts"
                                                    value={cells[key]}
                                                    onChange={(e) =>
                                                        setCells((p) => ({
                                                            ...p,
                                                            [key]: sanitizePoints(e.target.value),
                                                        }))
                                                    }
                                                    onPointerDown={(e) => {
                                                        if (!selectedQuickPoint) return;
                                                        e.preventDefault();
                                                        applyQuickPointToCell(key);
                                                    }}
                                                    onKeyDown={(e) => handleCellKeyDown(e, r, c)}
                                                    className={cellInputDesktopClass(hasBet)}
                                                />
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sticky Submit Bet button above mobile navbar */}
            <div className="fixed left-0 right-0 bottom-[calc(env(safe-area-inset-bottom,0px)+92px)] z-40 px-3 sm:px-4 md:hidden">
                <div className="flex">
                    <button
                        type="button"
                        onClick={handleSubmitBet}
                        disabled={!canSubmit}
                        className={`w-full font-bold text-base py-4 min-h-[56px] rounded-xl shadow-lg transition-all ${
                            canSubmit
                                ? 'bg-gradient-to-r from-emerald-600 to-green-500 text-white dark:border dark:border-white/20 hover:from-emerald-500 hover:to-green-400 active:scale-[0.98]'
                                : 'bg-gradient-to-r from-emerald-600 to-green-500 text-white dark:border dark:border-white/20 opacity-50 cursor-not-allowed'
                        }`}
                    >
                        Submit Bet
                    </button>
                </div>
            </div>

            <BidReviewModal
                open={isReviewOpen}
                onClose={handleCloseReview}
                onSubmit={handleConfirmReview}
                marketTitle={marketTitle}
                dateText={dateText}
                labelKey="Jodi"
                rows={rows}
                walletBefore={walletBefore}
                totalBids={rows.length}
                totalAmount={totalPoints}
            />
        </BidLayout>
    );
};

export default JodiBulkBid;

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

const toDateKeyIST = (d) => {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d); // YYYY-MM-DD
  } catch {
    return '';
  }
};

const isSameDay = (a, b) =>
  a &&
  b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const clampToMax = (d, maxDate) => {
  if (!d) return d;
  if (!maxDate) return d;
  const dk = toDateKeyIST(d);
  const mk = toDateKeyIST(maxDate);
  if (dk && mk && dk > mk) return maxDate;
  return d;
};

const monthLabel = (year, monthIdx) => {
  try {
    return new Date(year, monthIdx, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  } catch {
    return '';
  }
};

export default function ResultDatePicker({
  value,
  onChange,
  maxDate,
  label,
  buttonClassName = '',
  /** 'default' = label + date button row; 'chip' = single compact trigger (no side label) */
  layout = 'default',
}) {
  const { t } = useTranslation();
  const displayLabelProp = label ?? t('common.selectDate');
  const max = useMemo(() => maxDate || new Date(), [maxDate]);
  const safeValue = useMemo(() => clampToMax(value || new Date(), max), [value, max]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(safeValue);
  const [viewYear, setViewYear] = useState(safeValue.getFullYear());
  const [viewMonth, setViewMonth] = useState(safeValue.getMonth());

  useEffect(() => {
    if (!open) return;
    const v = clampToMax(value || new Date(), max);
    setDraft(v);
    setViewYear(v.getFullYear());
    setViewMonth(v.getMonth());
  }, [open, value, max]);

  const maxYear = max.getFullYear();
  const maxMonth = max.getMonth();
  const atMaxMonth = viewYear === maxYear && viewMonth === maxMonth;

  const canGoNext = !atMaxMonth;
  const canGoPrev = true;

  const daysGrid = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const startWeekday = first.getDay(); // 0=Sun
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const cells = [];
    // Leading blanks
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    // Month days
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth, d));
    // Trailing blanks to fill 6 weeks
    while (cells.length < 42) cells.push(null);
    return cells;
  }, [viewYear, viewMonth]);

  const maxKey = toDateKeyIST(max);

  const isDisabledDay = (d) => {
    if (!d) return true;
    const dk = toDateKeyIST(d);
    return !!(dk && maxKey && dk > maxKey);
  };

  const handlePrev = () => {
    if (!canGoPrev) return;
    const m = viewMonth - 1;
    if (m < 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth(m);
    }
  };

  const handleNext = () => {
    if (!canGoNext) return;
    const m = viewMonth + 1;
    if (m > 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth(m);
    }
  };

  const displayLabel = useMemo(() => {
    try {
      return safeValue.toLocaleDateString('en-GB');
    } catch {
      return '';
    }
  }, [safeValue]);

  const chipTriggerClass =
    buttonClassName ||
    'w-full min-w-0 min-h-[34px] box-border flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg text-[10px] font-bold border border-gray-200/90 bg-white text-gray-700 dark:bg-[#1a1a1c] dark:border-white/20 dark:text-gray-200 transition-colors';

  const trigger = layout === 'chip' ? (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={chipTriggerClass}
      aria-label={t('datePicker.openCalendar')}
    >
      <svg className="w-3.5 h-3.5 shrink-0 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <span className="truncate">{displayLabelProp}</span>
    </button>
  ) : (
    <div className="flex items-center justify-between gap-4">
      <div className="text-gray-600 dark:text-white/80 text-base sm:text-lg">{displayLabelProp}</div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          buttonClassName ||
          'px-5 py-2.5 rounded-full bg-white border border-gray-200 text-gray-900 font-bold shadow-sm hover:border-[#d4af37]/40 transition-colors dark:bg-black/40 dark:border-white/10 dark:text-white'
        }
        aria-label={t('datePicker.openCalendar')}
      >
        {displayLabel}
      </button>
    </div>
  );

  return (
    <>
      {trigger}

      {open ? (
        <div className="fixed inset-0 z-[999] flex items-center justify-center px-3 sm:px-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label={t('datePicker.closeOverlay')}
            onClick={() => setOpen(false)}
          />

          <div className="relative w-full max-w-md rounded-3xl overflow-hidden border border-gray-200 dark:border-white/10 shadow-[0_25px_80px_rgba(0,0,0,0.25)] dark:shadow-[0_25px_80px_rgba(0,0,0,0.65)] bg-white dark:bg-[#202124]">
            {/* Header */}
            <div className="bg-[#0b2b55] px-6 py-5 border-b border-white/10">
              <div className="text-gray-600 dark:text-white/80 text-sm tracking-widest font-semibold">{t('datePicker.selectDate')}</div>
              <div className="mt-2 flex items-center justify-between gap-4">
                <div className="text-gray-900 dark:text-white text-3xl sm:text-4xl font-light">
                  {draft.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>
                <div className="w-10 h-10 rounded-full bg-black/25 border border-white/10 flex items-center justify-center text-gray-600 dark:text-white/80">
                  {/* pencil icon */}
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 4h2m-1 0v0m8.485 2.515a2.121 2.121 0 010 3L9 21H4v-5L16.485 6.515a2.121 2.121 0 013 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Calendar */}
            <div className="bg-white dark:bg-[#1a1a1c] text-gray-900 dark:text-white px-5 py-4">
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="w-10 h-10 rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-gray-700 dark:text-gray-200"
                  aria-label={t('datePicker.previousMonth')}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="text-lg font-semibold text-gray-700 dark:text-gray-100">{monthLabel(viewYear, viewMonth)}</div>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!canGoNext}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-gray-700 dark:text-gray-200 ${
                    canGoNext ? 'hover:bg-black/5 dark:hover:bg-white/10' : 'opacity-30 cursor-not-allowed'
                  }`}
                  aria-label={t('datePicker.nextMonth')}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-7 text-center text-xs text-gray-500 dark:text-gray-400 font-semibold mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => (
                  <div key={d} className="py-1">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-y-2">
                {daysGrid.map((d, idx) => {
                  if (!d) return <div key={idx} className="h-10" />;
                  const disabled = isDisabledDay(d);
                  const selected = isSameDay(d, draft);
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={disabled}
                      onClick={() => setDraft(d)}
                      className={`h-10 w-10 mx-auto rounded-full flex items-center justify-center text-sm transition-colors ${
                        selected
                          ? 'bg-[#0b2b55] text-white dark:bg-amber-500 dark:text-black'
                          : disabled
                            ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                            : 'text-gray-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10'
                      }`}
                      aria-label={`Day ${d.getDate()}`}
                    >
                      {d.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white dark:bg-[#1a1a1c] px-5 py-4 flex items-center justify-end gap-6 border-t border-gray-100 dark:border-white/10">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[#0b2b55] dark:text-amber-300 font-semibold tracking-wide"
              >
                {t('datePicker.cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = clampToMax(draft, max);
                  onChange?.(next);
                  setOpen(false);
                }}
                className="text-[#0b2b55] dark:text-amber-300 font-semibold tracking-wide"
              >
                {t('common.ok')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}


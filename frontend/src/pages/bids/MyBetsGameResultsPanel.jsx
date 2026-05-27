import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ResultDatePicker from '../../components/ResultDatePicker';
import {
  formatMarketTimeRange,
  getRelativeDateLabel,
  parseDisplayResult,
} from '../../utils/gameResultDisplay';
import { surface, textMuted, textPrimary } from '../../styles/appTheme';

const clampToToday = (d) => {
  const next = new Date(d);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return next > today ? new Date() : next;
};

function ResultSegment({ label, value, highlight }) {
  const pending = !value || /^[\*]+$/.test(value);
  return (
    <div className="flex flex-col items-center gap-0.5 min-w-0 flex-1 px-1">
      <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-200 w-full text-center truncate">
        {label}
      </span>
      <span
        className={`font-extrabold tabular-nums tracking-wider text-sm sm:text-base leading-snug ${
          pending
            ? 'text-gray-900 dark:text-white'
            : highlight
              ? 'text-emerald-700 dark:text-emerald-300'
              : 'text-gray-900 dark:text-white'
        }`}
      >
        {value || '—'}
      </span>
    </div>
  );
}

function StatusBadge({ status, t }) {
  const styles = {
    declared:
      'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
    partial:
      'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
    pending:
      'bg-gray-100 text-gray-800 border-gray-200 dark:bg-white/10 dark:text-gray-100 dark:border-white/20',
  };
  const labels = {
    declared: t('bids.resultStatusDeclared'),
    partial: t('bids.resultStatusPartial'),
    pending: t('bids.resultStatusPending'),
  };

  return (
    <span
      className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${styles[status] || styles.pending}`}
    >
      {labels[status] || labels.pending}
    </span>
  );
}

function GameResultCard({ row, t, compact = false }) {
  const parsed = parseDisplayResult(row.result);
  const timeRange = formatMarketTimeRange(row.startingTime, row.closingTime);

  const cardBorderClass =
    parsed.status === 'pending'
      ? 'border border-red-300/90 dark:border-red-500/35'
      : 'border border-emerald-400/90 dark:border-emerald-500/40';

  return (
    <article
      className={`rounded-xl bg-white dark:bg-[#202124] p-3 flex flex-col gap-2 transition-colors ${cardBorderClass}`}
    >
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="min-w-0 flex-1">
          {!compact ? (
            <h3
              className={`font-bold text-sm leading-tight truncate ${textPrimary}`}
              title={row.name}
            >
              {row.name}
            </h3>
          ) : null}
          {timeRange ? (
            <p
              className={`${compact ? '' : 'mt-0.5 '}text-[10px] text-gray-600 dark:text-gray-300 flex items-center gap-1`}
            >
              <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{timeRange}</span>
            </p>
          ) : null}
        </div>
        <StatusBadge status={parsed.status} t={t} />
      </div>

      <div
        className={`rounded-lg border bg-gray-50 dark:bg-black/20 py-2 ${
          parsed.status === 'pending'
            ? 'border-red-200/60 dark:border-red-500/20'
            : 'border-emerald-200/70 dark:border-emerald-500/20'
        }`}
      >
        <div className="flex items-center divide-x divide-gray-200 dark:divide-white/10">
          <ResultSegment label={t('bids.openPana')} value={parsed.open} highlight={parsed.status === 'declared'} />
          <ResultSegment label={t('gameRate.jodi')} value={parsed.jodi} highlight={parsed.status === 'declared'} />
          <ResultSegment label={t('bids.closePana')} value={parsed.close} highlight={parsed.status === 'declared'} />
        </div>
      </div>
    </article>
  );
}

/** Compact result strip for game-bid / bid-options when market has times or displayResult */
export function MarketGameResultCard({ market, compact = true }) {
  const { t } = useTranslation();
  if (!market) return null;

  const name = (market.gameName || market.marketName || '').toString().trim();
  const hasResultMeta =
    market.displayResult != null ||
    market.result != null ||
    market.startingTime ||
    market.closingTime;
  if (!name && !hasResultMeta) return null;

  const row = {
    id: market._id || market.id || name || 'market',
    name: name.toUpperCase(),
    result: (market.displayResult || market.result || '***-**-***').toString().trim(),
    startingTime: market.startingTime,
    closingTime: market.closingTime,
  };

  return <GameResultCard row={row} t={t} compact={compact} />;
}

export function GameResultsLoadingSkeleton({ count = 8 }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {[80, 60, 72, 64].map((w, i) => (
          <div key={i} className={`h-6 w-${w === 80 ? '20' : w === 60 ? '16' : w === 72 ? '18' : '16'} rounded-full bg-gray-200 dark:bg-white/10 skeleton-shimmer`} />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2.5">
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#202124] p-3 space-y-2 skeleton-shimmer"
          >
            <div className="flex justify-between gap-2">
              <div className="h-3.5 flex-1 max-w-[65%] rounded bg-gray-200 dark:bg-white/10" />
              <div className="h-4 w-14 rounded-full bg-gray-200 dark:bg-white/10" />
            </div>
            <div className="h-12 rounded-lg bg-gray-100 dark:bg-white/5" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Game Results panel — compact header + search bar + result cards grid.
 *
 * Props:
 *   showDateControls  – show the date card with Today/Yesterday/picker (default true)
 *   showDesktopDatePicker – show date picker inside the card on desktop too (default false)
 */
export default function MyBetsGameResultsPanel({
  resultsDate,
  onResultsDateChange,
  resultsRows = [],
  showDateControls = true,
  showMobileDatePicker = true,
  showDesktopDatePicker = false,
}) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');

  const dateLabel = resultsDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const relativeLabel = getRelativeDateLabel(resultsDate, t);

  const stats = useMemo(() => {
    let declared = 0;
    let partial = 0;
    let pending = 0;
    for (const row of resultsRows) {
      const { status } = parseDisplayResult(row.result);
      if (status === 'declared') declared += 1;
      else if (status === 'partial') partial += 1;
      else pending += 1;
    }
    return { total: resultsRows.length, declared, partial, pending };
  }, [resultsRows]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return resultsRows;
    return resultsRows.filter((r) => r.name.toLowerCase().includes(q));
  }, [resultsRows, searchQuery]);

  const goToToday = () => onResultsDateChange?.(new Date());
  const goToYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    onResultsDateChange?.(d);
  };

  const isToday = relativeLabel === t('notifications.today');
  const isYesterday = relativeLabel === t('notifications.yesterday');
  const isCustomDate = !isToday && !isYesterday;

  const headlineDate = isToday
    ? `${t('notifications.today')}, ${dateLabel}`
    : isYesterday
      ? `${t('notifications.yesterday')}, ${dateLabel}`
      : dateLabel;

  const shortPickLabel = isCustomDate
    ? resultsDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
    : t('bids.date');

  const quickBtnClass = (active) =>
    `flex-1 min-w-0 min-h-[34px] box-border px-1.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold border transition-colors touch-manipulation ${
      active
        ? 'bg-red-600 border-red-700 text-white shadow-sm dark:bg-red-600 dark:border-red-500 [&_svg]:text-white'
        : 'bg-white border-red-200/80 text-gray-700 hover:border-red-400 dark:bg-[#1a1a1c] dark:border-red-500/25 dark:text-gray-200 dark:hover:border-red-500/50'
    }`;

  const pickDateChipClass = (active) =>
    `flex-1 min-w-0 min-h-[34px] box-border px-1.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold border transition-colors touch-manipulation flex items-center justify-center gap-1 ${
      active
        ? 'bg-red-600 border-red-700 text-white shadow-sm dark:bg-red-600 dark:border-red-500 [&_svg]:text-white'
        : 'bg-white border-red-200/80 text-gray-700 hover:border-red-400 dark:bg-[#1a1a1c] dark:border-red-500/25 dark:text-gray-200 dark:hover:border-red-500/50 [&_svg]:text-red-600 dark:[&_svg]:text-red-400'
    }`;

  return (
    <div className="flex flex-col gap-3">
      {/* Date controls — label, selected date, then one action row */}
      {showDateControls && (
        <section
          className="rounded-xl border border-red-200/70 dark:border-red-500/30 bg-gradient-to-br from-red-50/95 via-white to-rose-50/40 dark:from-[#2a1010] dark:via-[#1a1a1c] dark:to-[#1a0f0f] p-3 space-y-2.5 shadow-sm shadow-red-100/50 dark:shadow-none"
          aria-label={t('bids.resultsFor')}
        >
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-red-700/80 dark:text-red-400/90">
              {t('bids.resultsFor')}
            </p>
            <p className="mt-0.5 text-base sm:text-lg font-extrabold text-gray-900 dark:text-white leading-snug">
              <span className="text-red-700 dark:text-red-400">{headlineDate}</span>
            </p>
          </div>

          <div className="flex items-stretch gap-1.5 sm:gap-2 min-w-0">
            <button type="button" onClick={goToToday} className={quickBtnClass(isToday)}>
              {t('notifications.today')}
            </button>
            <button type="button" onClick={goToYesterday} className={quickBtnClass(isYesterday)} title={t('notifications.yesterday')}>
              <span className="truncate block w-full text-center">{t('notifications.yesterday')}</span>
            </button>
            {(showMobileDatePicker || showDesktopDatePicker) && (
              <div className={`min-w-0 flex-1 ${showDesktopDatePicker ? '' : 'md:hidden'}`}>
                <ResultDatePicker
                  layout="chip"
                  value={resultsDate}
                  onChange={(d) => onResultsDateChange?.(clampToToday(d))}
                  maxDate={new Date()}
                  label={shortPickLabel}
                  buttonClassName={pickDateChipClass(isCustomDate)}
                />
              </div>
            )}
          </div>
        </section>
      )}

      {/* Summary chips + search row */}
      {resultsRows.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
            <span className="inline-flex items-center rounded-full bg-gradient-to-r from-red-100 to-red-50 border border-red-300/60 dark:from-red-950/50 dark:to-red-900/30 dark:border-red-500/35 px-2.5 py-0.5 text-[11px] font-bold text-red-900 dark:text-red-200">
              {t('bids.marketsCount', { count: stats.total })}
            </span>
            {stats.declared > 0 && (
              <span className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/25 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                {t('bids.declaredCount', { count: stats.declared })}
              </span>
            )}
            {stats.partial > 0 && (
              <span className="inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/25 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                {t('bids.partialCount', { count: stats.partial })}
              </span>
            )}
            {stats.pending > 0 && (
              <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-white/8 border border-gray-200 dark:border-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                {t('bids.pendingCount', { count: stats.pending })}
              </span>
            )}
          </div>

          <div className="relative w-full sm:w-52 shrink-0">
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-red-600 dark:text-red-400 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('bids.searchMarkets')}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white dark:bg-[#202124] border border-gray-200 dark:border-white/10 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-amber-400 dark:focus:border-amber-400/50 transition-colors"
              aria-label={t('bids.searchMarkets')}
            />
          </div>
        </div>
      )}

      {/* Results grid */}
      {resultsRows.length === 0 ? (
        <div className={`rounded-xl ${surface} p-8 text-center`}>
          <div className="mx-auto w-12 h-12 rounded-xl bg-gray-100 dark:bg-white/8 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className={`font-semibold text-sm ${textPrimary}`}>{t('bids.noResultsForDate')}</p>
          <p className={`mt-1 text-xs ${textMuted}`}>{t('bids.noResultsHint')}</p>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className={`rounded-xl ${surface} p-6 text-center`}>
          <p className={`font-semibold text-sm ${textPrimary}`}>{t('bids.noMarketsFound')}</p>
          <p className={`mt-1 text-xs ${textMuted}`}>{t('common.search')}: &quot;{searchQuery}&quot;</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2.5">
          {filteredRows.map((row) => (
            <GameResultCard key={row.id} row={row} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}

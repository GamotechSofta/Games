import {
  bidAccent,
  bidSubmitBtn,
  borderDefault,
  borderDivider,
  mobilePageTopPad,
  pageShell,
  surface,
  surfaceElevated,
  textMuted,
  textPrimary,
} from '../../styles/appTheme';

export { textMuted, textPrimary, surface, surfaceElevated, bidAccent };

export const betHistoryPageWrap =
  `${pageShell} min-h-screen pb-[calc(7rem+env(safe-area-inset-bottom,0px))] md:pb-8 ${mobilePageTopPad}`;

export const betHistoryContentPanel =
  `rounded-2xl border ${borderDefault} bg-white dark:bg-[#1a1a1c] shadow-sm dark:shadow-[0_12px_24px_rgba(0,0,0,0.35)]`;

export const betHistoryEmpty =
  `rounded-2xl border ${borderDefault} bg-white dark:bg-[#202124] p-6 text-center text-gray-600 dark:text-gray-400`;

export const betHistoryTableShell = `${betHistoryContentPanel} overflow-hidden`;

export const betHistoryThead =
  `border-b ${borderDivider} bg-gray-50 dark:bg-[#141416]`;

export const betHistoryTh =
  `text-left py-3 px-3 lg:py-4 lg:px-4 font-bold text-xs uppercase tracking-wider text-gray-700 dark:text-gray-200`;

export const betCardBase =
  'relative rounded-xl border-2 p-2 space-y-1.5 min-w-0 overflow-hidden shadow-sm dark:shadow-[0_8px_20px_rgba(0,0,0,0.25)]';

/** Bet result text color: won=green, lost/cancelled=red, pending=gray */
export function getBetStatusTextClass(state) {
  if (state === 'won') return 'text-[#43b36a] dark:text-green-400 font-semibold';
  if (state === 'lost') return 'text-red-600 dark:text-red-400 font-semibold';
  if (state === 'cancelled') return 'text-red-600 dark:text-red-400 font-semibold';
  return 'text-gray-500 dark:text-gray-400 font-medium';
}

export function getBetStatusDisplay(t, verdict) {
  const state = verdict?.state;
  let text = t('bids.status.pending');
  if (state === 'won') text = t('bids.status.win');
  else if (state === 'lost') text = t('bids.status.lost');
  else if (state === 'cancelled') text = t('bids.status.cancelled');
  return { text, className: getBetStatusTextClass(state) };
}

/** Session badge: OPEN=green, CLOSE=red */
export function getSessionBadgeClasses(session, { rounded = false } = {}) {
  const shape = rounded ? 'rounded-full px-2 py-0.5 text-xs' : 'rounded px-1 py-0.5 text-[9px]';
  const base = `font-bold border shrink-0 ${shape}`;
  const s = String(session || '').trim().toUpperCase();
  if (s === 'OPEN') {
    return `${base} text-green-700 dark:text-green-400 border-green-500/50 bg-green-50 dark:bg-green-500/10`;
  }
  if (s === 'CLOSE' || s === 'CLOSED') {
    return `${base} text-red-700 dark:text-red-400 border-red-500/50 bg-red-50 dark:bg-red-500/10`;
  }
  return `${base} text-gray-600 dark:text-gray-400 border-gray-300 dark:border-white/25 bg-gray-50 dark:bg-white/5`;
}

export function getBetCardClasses(verdictState) {
  if (verdictState === 'cancelled') {
    return `${betCardBase} bg-red-50/50 dark:bg-[#202124] border-red-500`;
  }
  if (verdictState === 'won') {
    return `${betCardBase} bg-white dark:bg-[#202124] border-[#43b36a]`;
  }
  if (verdictState === 'lost') {
    return `${betCardBase} bg-white dark:bg-[#202124] border-red-500`;
  }
  if (verdictState === 'pending') {
    return `${betCardBase} bg-white dark:bg-[#202124] border-gray-300 dark:border-white/20`;
  }
  return `${betCardBase} bg-white dark:bg-[#202124] border-gray-200 dark:border-white/10`;
}

export function getBetTableRowClass(verdictState) {
  if (verdictState === 'won') return 'bg-[#43b36a]/8 border-l-4 border-l-[#43b36a]';
  if (verdictState === 'lost') return 'bg-red-500/8 border-l-4 border-l-red-500';
  if (verdictState === 'cancelled') return 'bg-red-500/8 border-l-4 border-l-red-500';
  if (verdictState === 'pending') return 'bg-gray-100/80 dark:bg-white/[0.03] border-l-4 border-l-gray-400';
  return '';
}

export const betHistoryFilterBtn =
  'shrink-0 flex items-center gap-1.5 rounded-full border border-gray-300 bg-gray-50 px-3 py-1.5 text-[11px] sm:text-sm font-bold text-gray-800 hover:bg-gray-100 dark:border-white/20 dark:bg-[#202124] dark:text-gray-200 dark:hover:bg-white/5 transition-colors touch-manipulation';

export const betHistoryPrimaryBtn =
  `rounded-full py-4 text-base sm:text-lg font-extrabold active:scale-[0.99] transition-all ${bidSubmitBtn}`;

export const betHistoryModalHeader =
  `bg-gray-50 dark:bg-[#141416] text-gray-900 dark:text-white text-center py-4 text-xl sm:text-2xl font-extrabold border-b ${borderDivider}`;

export const betHistorySectionTitle = `text-base font-bold ${bidAccent} mb-3`;

export const betHistoryFilterOption =
  `flex items-center gap-4 rounded-xl border ${borderDefault} bg-gray-50 dark:bg-black/25 px-4 py-3 hover:border-red-300 dark:hover:border-red-500/40 transition-colors`;

export const betHistoryAccent = bidAccent;

export const betHistoryIndexLabel = 'text-[10px] font-semibold text-gray-500 dark:text-gray-400';

export const betHistoryCopyToast =
  'fixed bottom-24 left-1/2 -translate-x-1/2 z-[1100] px-4 py-2.5 rounded-lg bg-red-600 text-white font-semibold text-sm shadow-lg';

export const betHistoryLoadMoreBtn =
  'px-5 py-2.5 rounded-xl border border-gray-300 text-gray-800 text-sm font-semibold hover:bg-gray-50 dark:border-white/20 dark:text-gray-200 dark:hover:bg-white/5 disabled:opacity-50';

export const betHistoryModalShell =
  `w-full max-w-sm rounded-2xl border ${borderDefault} bg-white dark:bg-[#202124] shadow-2xl overflow-hidden`;

export const betHistoryModalTitleBar =
  `px-5 py-4 border-b ${borderDivider} bg-gray-50 dark:bg-[#141416]`;

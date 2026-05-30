/**
 * Shared Tailwind class strings for app-wide light/dark surfaces.
 * Use with html.theme-light / html.theme-dark (@custom-variant dark).
 */

/** Full-page wrapper (most routes) */
export const pageShell =
  'min-h-screen bg-[#f5f5f7] text-gray-900 dark:bg-black dark:text-white';

/** Profile / passbook alt dark bg */
export const pageShellAlt =
  'min-h-screen bg-[#f5f5f7] text-gray-900 dark:bg-[#0a0a0b] dark:text-white';

/** Card / panel surface */
export const surface =
  'bg-white border border-gray-900/20 shadow-sm dark:bg-[#202124] dark:border-white/25 dark:shadow-[0_12px_24px_rgba(0,0,0,0.35)]';

/** Elevated card (profile, etc.) */
export const surfaceElevated =
  'bg-white border border-gray-900/20 dark:bg-[#141416] dark:border-white/25';

/** Nested surface */
export const surfaceNested =
  'bg-gray-50 border border-gray-900/15 dark:bg-[#1a1a1a] dark:border-white/20';

/** Form inputs on themed pages */
export const inputSurface =
  'bg-gray-50 border border-gray-900/20 text-gray-900 placeholder:text-gray-400 dark:bg-[#202124] dark:border-white/25 dark:text-white dark:placeholder:text-gray-500';

export const textPrimary = 'text-gray-900 dark:text-white';
export const textMuted = 'text-gray-500 dark:text-gray-400';
export const textSubtle = 'text-gray-600 dark:text-white/70';
export const textFaint = 'text-gray-500 dark:text-white/50';
export const borderDefault = 'border-gray-900/20 dark:border-white/25';

/** Section / panel outer border */
export const borderSection = 'border-gray-900/20 dark:border-white/25';

/** Bordered buttons & nested fields */
export const borderButton =
  'border-gray-900/25 hover:border-gray-900/35 dark:border-white/25 dark:hover:border-white/35';

/** Nested boxes inside sections */
export const borderNested = 'border-gray-900/15 dark:border-white/20';

/** Section dividers (header rules, split lines) */
export const borderDivider = 'border-gray-900/15 dark:border-white/20';

/** @deprecated use borderSection — kept for existing imports */
export const borderSectionDark = borderSection;

/** @deprecated use borderButton */
export const borderButtonDark = borderButton;

/** @deprecated use borderDivider */
export const borderDividerDark = borderDivider;

/** Icon / back button on light pages */
export const iconBtn =
  'rounded-full bg-gray-100 border border-gray-900/20 text-gray-800 hover:border-gray-900/30 hover:bg-gray-200 dark:bg-white/10 dark:border-white/25 dark:text-white dark:hover:border-white/35 dark:hover:bg-white/15';

/** Circular back control — border included in size so it is not clipped in flex rows */
export const backBtn = `min-w-[44px] min-h-[44px] w-11 h-11 box-border flex shrink-0 items-center justify-center touch-manipulation transition-transform active:scale-95 select-none ${iconBtn}`;

/** Game bid flow — red accent theme */
export const bidPageShell =
  'game-bid-page flex flex-col flex-1 min-h-0 h-full bg-[#f3f4f6] text-gray-900 font-sans w-full max-w-full overflow-hidden dark:bg-[#121316] dark:text-white';

export const bidHeader =
  'bid-header-bar bg-white/95 backdrop-blur-md border-b border-red-200 dark:bg-[#1b1d22]/95 dark:border-white/20';

export const bidSurface =
  'bid-surface bg-white border border-red-200 dark:bg-[#202329] dark:border-white/20';

export const bidInput =
  'bid-input bg-white border border-red-200 text-gray-900 placeholder:text-gray-400 focus:border-red-500 focus:ring-2 focus:ring-red-200/50 dark:bg-[#202329] dark:border-white/20 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-red-400 dark:focus:ring-red-500/20';

export const bidBtnGhost =
  'bg-gray-50 border border-red-200 hover:bg-gray-100 text-red-700 dark:bg-white/10 dark:hover:bg-white/15 dark:text-gray-200 dark:border-white/20 dark:hover:border-white/35';

/** Game bid accent text */
export const bidGameAccent = 'bid-accent text-red-700 dark:text-red-300';
export const bidGameAccentBold = 'bid-accent font-bold text-red-700 dark:text-red-300';

/** Shared accent — profile, support, game rate */
export const bidAccent = 'text-red-700 dark:text-red-300';
export const bidAccentBold = 'font-bold text-red-700 dark:text-red-300';
export const bidLabel = 'text-gray-600 dark:text-gray-300';
export const bidLabelStrong = 'text-gray-800 dark:text-gray-100';
export const bidFieldLabel = 'text-base sm:text-lg text-gray-800 dark:text-gray-200 font-medium';
export const bidCountLabel = 'text-xs sm:text-sm text-gray-600 dark:text-gray-300 font-medium';
export const bidStatLabel =
  'text-xs sm:text-sm text-gray-600 dark:text-gray-300 uppercase tracking-wider';
export const bidEmptyHint = 'text-base text-gray-500 dark:text-gray-400';
export const bidTypeText = 'text-base sm:text-lg text-gray-600 dark:text-gray-300';
export const bidTableHeader =
  'bid-table-header bg-gray-50 text-red-700 font-semibold text-sm sm:text-base dark:bg-white/10 dark:text-gray-200';
export const bidStatValue = 'bid-stat-value font-bold text-base sm:text-lg text-red-700 dark:text-red-300';
export const bidRowBg = 'bid-row bg-white dark:bg-[#2a1d21]';

/** Flat meta strip — date / session / stats (no individual boxes) */
export const bidMetaStrip =
  'bid-meta-strip border-b border-gray-200/45 dark:border-white/10 pb-3 pt-1';

export const bidMetaGrid = 'bid-meta-grid grid grid-cols-2';

export const bidMetaCell =
  'relative z-[1] flex flex-col items-center justify-center min-h-[52px] py-2 px-2 text-center';

/** Desktop inline stats row with animated vertical divider */
export const bidMetaInlineRow = 'bid-meta-inline-row inline-flex items-stretch';

export const bidMetaLabel =
  'bid-meta-label text-xs sm:text-sm text-gray-600 dark:text-white/75 font-semibold';

export const bidMetaValue =
  'bid-meta-value font-bold text-base sm:text-lg text-gray-900 dark:text-white';

export const bidDateDisplay =
  'bid-date-display inline-flex items-center justify-center gap-1.5 text-sm sm:text-base font-bold text-gray-900 dark:text-white';

/** Scheduled bet hint — flat label inside date cell (no pill/box) */
export const bidScheduledLabel =
  'text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-white/70 leading-none mb-1';

export const bidSessionSelect =
  'w-full appearance-none bg-transparent border-0 text-sm sm:text-base font-bold text-gray-900 dark:text-white text-center focus:outline-none py-0.5 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed';

/** Stat summary — inline (no box) */
export const bidStatCard = `${bidMetaCell}`;

/** Inline stat row for extraHeader / mobile headers */
export const bidStatInlineGrid = `${bidMetaGrid} w-full`;

export const bidStatInlineCell = bidMetaCell;

/** Primary action buttons (add bet, digit pickers) */
export const bidPrimaryBtn =
  'bid-primary-btn bg-gradient-to-br from-red-700 to-red-600 text-white border border-red-300 dark:border-white/20 shadow-[0_4px_14px_rgba(185,28,28,0.35)] hover:from-red-600 hover:to-red-500 active:scale-[0.97] transition-all';

/** Submit / confirm CTA — original bright green */
export const bidSubmitBtn =
  'bid-submit-btn bg-gradient-to-r from-emerald-600 to-green-500 text-white text-base sm:text-lg font-bold shadow-lg dark:border dark:border-white/20 hover:from-emerald-500 hover:to-green-400 active:scale-[0.98] transition-all';

/** Selected tab / toggle pill */
export const bidSelectedPill =
  'bid-selected-pill bg-gradient-to-r from-red-700 to-red-600 text-white border-2 border-red-300 dark:border-white/20';

/** Unselected tab / toggle pill */
export const bidUnselectedPill =
  'bid-unselected-pill bg-white text-gray-800 border-2 border-gray-200 hover:border-red-300 dark:bg-[#202329] dark:text-white dark:border-white/20 dark:hover:border-white/35';

/** Clear / reset — solid red fill (clears points + bet list) */
export const bidClearBtn =
  'bid-clear-btn bg-red-600 text-white font-semibold border border-red-700 shadow-[0_2px_10px_rgba(220,38,38,0.4)] hover:bg-red-700 active:scale-95 transition-all dark:bg-red-700 dark:border-red-600 dark:hover:bg-red-600';

/** Taller clear button paired with points input box */
export const bidClearBtnLg =
  `${bidClearBtn} min-h-[44px] h-11 sm:min-h-[48px] sm:h-12 px-4 sm:px-5 text-base sm:text-lg font-bold rounded-xl shrink-0`;

/** Points entry block */
export const bidPointsSection =
  'bid-points-section space-y-5 sm:space-y-6 py-4 sm:py-5 border-b border-red-100/60 dark:border-white/10';

export const bidPointsLabel =
  'text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100 tracking-wide leading-tight';

/** Boxed points input */
export const bidPointsInput =
  'bid-points-input no-spinner flex-1 min-w-0 rounded-xl border border-red-200 bg-white text-base sm:text-lg font-semibold text-gray-900 placeholder:text-gray-400 text-center focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200/50 px-4 py-2.5 min-h-[44px] h-11 sm:min-h-[48px] sm:h-12 transition-colors dark:bg-[#202329] dark:border-white/20 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-red-400 dark:focus:ring-red-500/20';

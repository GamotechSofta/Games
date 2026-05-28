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

/** Game bid flow */
export const bidPageShell =
  'game-bid-page min-h-screen min-h-ios-screen bg-[#f3f4f6] text-gray-900 font-sans w-full max-w-full overflow-x-hidden dark:bg-[#121316] dark:text-white';

export const bidHeader =
  'bg-white/95 border-b border-red-200 dark:bg-[#1b1d22] dark:border-white/20';

export const bidSurface =
  'bg-white border border-red-200 dark:bg-[#202329] dark:border-white/20';

export const bidInput =
  'bg-white border border-red-200 text-gray-900 placeholder:text-gray-400 dark:bg-[#202329] dark:border-white/20 dark:text-white dark:placeholder:text-gray-500';

export const bidBtnGhost =
  'bg-gray-50 border border-red-200 hover:bg-gray-100 text-red-700 dark:bg-white/10 dark:hover:bg-white/15 dark:text-gray-200 dark:border-white/20 dark:hover:border-white/35';

/** Gold accent text — readable on white (light) and dark panels */
export const bidAccent = 'text-red-700 dark:text-red-300';
export const bidAccentBold = 'font-bold text-red-700 dark:text-red-300';
export const bidLabel = 'text-gray-600 dark:text-gray-300';
export const bidLabelStrong = 'text-gray-800 dark:text-gray-100';
export const bidFieldLabel = 'text-gray-800 dark:text-gray-200';
export const bidCountLabel = 'text-[11px] text-gray-600 dark:text-gray-300 font-medium';
export const bidStatLabel =
  'text-[10px] sm:text-xs text-gray-600 dark:text-gray-300 uppercase tracking-wider';
export const bidEmptyHint = 'text-gray-500 dark:text-gray-400';
export const bidTypeText = 'text-sm text-gray-600 dark:text-gray-300';
export const bidTableHeader =
  'bg-gray-50 text-red-700 dark:bg-white/10 dark:text-gray-200';
export const bidStatValue = 'font-bold text-red-700 dark:text-red-300';
export const bidRowBg = 'bg-white dark:bg-[#2a1d21]';

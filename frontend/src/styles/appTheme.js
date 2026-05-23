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
  'bg-white border border-gray-200 shadow-sm dark:bg-[#202124] dark:border-white/10 dark:shadow-[0_12px_24px_rgba(0,0,0,0.35)]';

/** Elevated card (profile, etc.) */
export const surfaceElevated =
  'bg-white border border-gray-200 dark:bg-[#141416] dark:border-white/5';

/** Nested surface */
export const surfaceNested =
  'bg-gray-50 border border-gray-200 dark:bg-[#1a1a1a] dark:border-white/5';

/** Form inputs on themed pages */
export const inputSurface =
  'bg-gray-50 border border-gray-200 text-gray-900 placeholder:text-gray-400 dark:bg-[#202124] dark:border-white/10 dark:text-white dark:placeholder:text-gray-500';

export const textPrimary = 'text-gray-900 dark:text-white';
export const textMuted = 'text-gray-500 dark:text-gray-400';
export const textSubtle = 'text-gray-600 dark:text-white/70';
export const textFaint = 'text-gray-500 dark:text-white/50';
export const borderDefault = 'border-gray-200 dark:border-white/10';

/** Icon / back button on light pages */
export const iconBtn =
  'rounded-full bg-gray-100 border border-gray-200 text-gray-800 hover:bg-gray-200 dark:bg-white/10 dark:border-white/10 dark:text-white dark:hover:bg-white/15';

/** Game bid flow */
export const bidPageShell =
  'game-bid-page min-h-screen min-h-ios-screen bg-[#f5f5f7] text-gray-900 font-sans w-full max-w-full overflow-x-hidden dark:bg-black dark:text-white';

export const bidHeader =
  'bg-white border-b border-gray-200 dark:bg-[#202124] dark:border-white/10';

export const bidSurface =
  'bg-white border border-gray-200 dark:bg-[#202124] dark:border-white/10';

export const bidInput =
  'bg-gray-50 border border-gray-200 text-gray-900 dark:bg-[#202124] dark:border-white/10 dark:text-white';

export const bidBtnGhost =
  'bg-gray-100 hover:bg-gray-200 text-gray-900 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white';

/** Gold accent text — readable on white (light) and dark panels */
export const bidAccent = 'text-amber-800 dark:text-[#f2c14e]';
export const bidAccentBold = 'font-bold text-amber-800 dark:text-[#f2c14e]';
export const bidLabel = 'text-gray-600 dark:text-gray-400';
export const bidLabelStrong = 'text-gray-700 dark:text-gray-300';
export const bidTableHeader =
  'bg-amber-50 text-amber-900 dark:bg-white/10 dark:text-[#f2c14e]';
export const bidStatValue = 'font-bold text-amber-800 dark:text-[#f2c14e]';
export const bidRowBg = 'bg-gray-50 dark:bg-white/5';

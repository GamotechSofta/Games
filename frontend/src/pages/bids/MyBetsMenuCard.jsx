import React from 'react';

/** Visual themes aligned with home quick links + app gold accent */
const THEMES = {
  gold: {
    card: 'border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-amber-100/60 dark:border-amber-500/30 dark:from-[#3a2b10] dark:via-[#1a1a1c] dark:to-[#2a2010]',
    cardActive: 'border-2 border-[#d4af37] shadow-[0_0_12px_rgba(212,175,55,0.2)]',
    icon: 'border-amber-300/60 bg-gradient-to-br from-[#d4af37] to-amber-600 text-black shadow-[0_0_10px_rgba(212,175,55,0.35)]',
    chevron: 'bg-amber-100 border-amber-300/60 text-amber-800 dark:bg-amber-500/20 dark:border-amber-500/40 dark:text-amber-300',
    chevronActive: 'bg-[#d4af37] border-[#c9a227] text-black',
  },
  green: {
    card: 'border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-emerald-100/50 dark:border-emerald-500/30 dark:from-[#0f2a1a] dark:via-[#1a1a1c] dark:to-[#102018]',
    cardActive: 'border-2 border-emerald-500 shadow-[0_0_12px_rgba(34,197,94,0.2)]',
    icon: 'border-emerald-300/60 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-[0_0_10px_rgba(34,197,94,0.35)]',
    chevron: 'bg-emerald-100 border-emerald-300/60 text-emerald-800 dark:bg-emerald-500/20 dark:border-emerald-500/40 dark:text-emerald-300',
    chevronActive: 'bg-emerald-500 border-emerald-600 text-white',
  },
  red: {
    card: 'border-red-200/80 bg-gradient-to-br from-red-50 via-white to-red-100/50 dark:border-red-500/30 dark:from-[#2a1010] dark:via-[#1a1a1c] dark:to-[#201010]',
    cardActive: 'border-2 border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.2)]',
    icon: 'border-red-300/60 bg-gradient-to-br from-red-500 to-red-700 text-white shadow-[0_0_10px_rgba(239,68,68,0.35)]',
    chevron: 'bg-red-100 border-red-300/60 text-red-800 dark:bg-red-500/20 dark:border-red-500/40 dark:text-red-300',
    chevronActive: 'bg-red-500 border-red-600 text-white',
  },
  blue: {
    card: 'border-blue-200/80 bg-gradient-to-br from-blue-50 via-white to-orange-50/40 dark:border-blue-500/30 dark:from-[#101a2a] dark:via-[#1a1a1c] dark:to-[#2a1810]',
    cardActive: 'border-2 border-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.2)]',
    icon: 'border-blue-300/60 bg-gradient-to-br from-blue-500 to-orange-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.3)]',
    chevron: 'bg-blue-100 border-blue-300/60 text-blue-800 dark:bg-blue-500/20 dark:border-blue-500/40 dark:text-blue-300',
    chevronActive: 'bg-blue-500 border-blue-600 text-white',
  },
};

export default function MyBetsMenuCard({
  title,
  subtitle,
  theme = 'gold',
  icon,
  iconUrl,
  active = false,
  onClick,
  compactOnDesktop = false,
}) {
  const t = THEMES[theme] || THEMES.gold;

  const iconContent = icon ?? (iconUrl ? (
    <img src={iconUrl} alt="" className="w-5 h-5 object-contain" />
  ) : (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
      <circle cx="12" cy="12" r="8" />
    </svg>
  ));

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full max-w-full box-border text-left rounded-2xl border flex items-center gap-2.5 sm:gap-3 transition-all touch-manipulation py-2.5 px-3 sm:px-3.5 md:py-2.5 md:px-3 ${t.card} ${active ? t.cardActive : 'hover:brightness-[1.02] dark:hover:brightness-110'}`}
    >
      <div
        className={`w-10 h-10 sm:w-11 sm:h-11 shrink-0 rounded-xl border flex items-center justify-center [&>img]:w-5 [&>img]:h-5 ${
          compactOnDesktop ? 'md:w-9 md:h-9' : ''
        } ${t.icon}`}
      >
        {iconContent}
      </div>

      <div className="min-w-0 flex-1 py-0.5">
        <p
          className={`font-bold text-gray-900 dark:text-white leading-snug break-words ${
            compactOnDesktop ? 'text-[15px] md:text-xs md:truncate' : 'text-[15px]'
          }`}
        >
          {title}
        </p>
        {subtitle ? (
          <p
            className={`text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed break-words ${
              compactOnDesktop ? 'md:text-[10px] md:truncate md:mt-0.5' : ''
            }`}
          >
            {subtitle}
          </p>
        ) : null}
      </div>

      <div
        className={`w-7 h-7 sm:w-8 sm:h-8 shrink-0 self-center rounded-full border flex items-center justify-center ${
          compactOnDesktop ? 'md:w-6 md:h-6' : ''
        } ${active ? t.chevronActive : t.chevron}`}
        aria-hidden
      >
        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-3.5 md:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}

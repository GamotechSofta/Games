import React from 'react';

/**
 * Reusable list item card for sidebar/menu (Bids, Funds, etc.).
 * One component for both mobile and desktop – change here, updates everywhere.
 */
export default function MenuItemCard({
  title,
  subtitle,
  color = '#f3b61b',
  iconUrl,
  icon,
  active = false,
  onClick,
  className = '',
  asButton = true,
}) {
  const iconContent = icon ?? (iconUrl ? (
    <img src={iconUrl} alt={title} className="w-5 h-5 sm:w-6 sm:h-6 object-contain" />
  ) : (
    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
      <circle cx="12" cy="12" r="8" />
    </svg>
  ));

  const content = (
    <>
      <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0 flex-1">
        <div
          className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-black shadow-[0_10px_20px_rgba(0,0,0,0.35)] shrink-0 [&>img]:w-4 [&>img]:h-4 sm:[&>img]:w-5 sm:[&>img]:h-5 md:[&>img]:w-6 md:[&>img]:h-6 [&>svg]:w-4 [&>svg]:h-4 sm:[&>svg]:w-5 sm:[&>svg]:h-5 md:[&>svg]:w-6 md:[&>svg]:h-6 [&>.text-3xl]:text-xl sm:[&>.text-3xl]:text-2xl md:[&>.text-3xl]:text-3xl"
          style={{ backgroundColor: color }}
        >
          {iconContent}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm md:text-base font-semibold text-white truncate">{title}</p>
          <p className="text-[10px] sm:text-xs text-gray-400 truncate">{subtitle}</p>
        </div>
      </div>
      <div
        className={`w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full border flex items-center justify-center shrink-0 ${
          active ? 'bg-[#d4af37]/15 border-[#d4af37]/35 text-[#d4af37]' : 'bg-black/30 border-white/10 text-white/70'
        }`}
      >
        <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </>
  );

  const baseClass = `w-full min-w-0 min-h-[68px] sm:min-h-[80px] md:min-h-[88px] text-left bg-[#202124] border rounded-2xl py-4 px-2 sm:py-5 sm:px-3 md:py-6 md:px-5 flex items-center justify-between gap-2 shadow-[0_12px_24px_rgba(0,0,0,0.35)] transition-colors cursor-pointer touch-manipulation ${
    active ? 'border-[#d4af37]/40 bg-[#202124]' : 'border-white/10 hover:border-white/20'
  } ${className}`;

  if (asButton) {
    return (
      <button type="button" onClick={onClick} className={baseClass}>
        {content}
      </button>
    );
  }

  return (
    <div role="button" tabIndex={0} onClick={onClick} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick?.()} className={baseClass}>
      {content}
    </div>
  );
}

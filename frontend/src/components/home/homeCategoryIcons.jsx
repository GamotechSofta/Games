import React from 'react';

export function MarketsCategoryIcon({ className = '', style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M5 17V12" strokeLinecap="round" />
      <path d="M12 17V8" strokeLinecap="round" />
      <path d="M19 17V5" strokeLinecap="round" />
      <path d="M4 18.5h16" strokeLinecap="round" />
      <path d="M14 7l2.5-2.5M14 7l2 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StarlineCategoryIcon({ className = '', style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.7l2.58 5.23 5.77.84-4.18 4.08.98 5.75L12 15.86 6.85 18.6l.98-5.75L3.65 8.77l5.77-.84L12 2.7z" />
    </svg>
  );
}

export function CasinoCategoryIcon({ className = '', style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="5.2" stroke="currentColor" strokeWidth="1.2" opacity="0.85" />
      <path
        d="M12 8.2c-1.2 0-2 .75-2 1.65 0 .85.65 1.4 1.65 1.6.55.1.95.45.95.95v.35h1.2v-.35c0-.5.4-.85.95-.95 1-.2 1.65-.75 1.65-1.6 0-.9-.8-1.65-2-1.65z"
        fill="currentColor"
      />
      <path
        d="M12 3.8v1.6M12 18.6v1.6M20.2 12h-1.6M5.8 12H4.2M17.7 6.3l-1.1 1.1M7.4 16.6l-1.1 1.1M17.7 17.7l-1.1-1.1M7.4 7.4l-1.1-1.1"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function KingBazaarCategoryIcon({ className = '', style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
      <path d="M5 6.5 7.2 9.6 12 5.6l4.8 4 2.2-3.1L17.1 17H6.9L5 6.5z" />
      <path d="M8.3 12.8h1.2v2.6H8.3v-2.6zm3.2 0h1.2v2.6h-1.2v-2.6zm3.2 0H16v2.6h-1.3v-2.6z" opacity="0.95" />
    </svg>
  );
}

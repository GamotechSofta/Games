import React from 'react';

export function MarketsCategoryIcon({ className = '', style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M5 18V11" strokeLinecap="round" />
      <path d="M12 18V7" strokeLinecap="round" />
      <path d="M19 18V4" strokeLinecap="round" />
      <path d="M4 19.5h16" strokeLinecap="round" />
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
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 6.2c-1.55 0-2.7 1.05-2.7 2.45 0 1.05.7 1.75 1.85 2.05l.85.22v1.1h1.8v-1.1l.85-.22c1.15-.3 1.85-1 1.85-2.05 0-1.4-1.15-2.45-2.7-2.45zm0 7.8c-1.05 0-1.75.45-1.75 1.05 0 .62.7 1.05 1.75 1.05s1.75-.43 1.75-1.05c0-.6-.7-1.05-1.75-1.05z"
        fill="currentColor"
      />
      <path d="M12 3.5v2M12 18.5v2M20.5 12h-2M5.5 12H3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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

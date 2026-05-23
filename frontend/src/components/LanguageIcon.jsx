import React from 'react';
import { HiOutlineGlobeAlt } from 'react-icons/hi';
import { normalizeLanguageCode } from '../utils/languageCode';

/** ISO 3166-1 alpha-2 for flagcdn.com (emoji flags often show "GB"/"IN" on Windows). */
const FLAG_ISO_BY_CODE = {
  en: 'gb',
  hi: 'in',
  mr: 'in',
  gu: 'in',
  ta: 'in',
  te: 'in',
  bn: 'in',
  kn: 'in',
  ml: 'in',
  pa: 'in',
};

function FlagImage({ iso, className = 'h-4 w-4 shrink-0' }) {
  return (
    <span
      className={`inline-flex overflow-hidden rounded-[3px] border border-black/10 shadow-sm dark:border-white/15 ${className}`}
      aria-hidden
    >
      <img
        src={`https://flagcdn.com/24x18/${iso}.png`}
        srcSet={`https://flagcdn.com/48x36/${iso}.png 2x`}
        alt=""
        className="h-full w-full object-cover"
        width={24}
        height={18}
        loading="lazy"
        draggable={false}
      />
    </span>
  );
}

export default function LanguageIcon({ code, className = 'h-4 w-4 shrink-0' }) {
  const lang = normalizeLanguageCode(code);
  const iso = FLAG_ISO_BY_CODE[lang];

  if (iso) {
    return <FlagImage iso={iso} className={className} />;
  }

  return <HiOutlineGlobeAlt className={className} aria-hidden />;
}

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HiOutlineChevronDown } from 'react-icons/hi2';

const LANGUAGES = [
  { code: 'en', flag: '🇬🇧', label: 'EN' },
  { code: 'hi', flag: '🇮🇳', label: 'HI' },
  { code: 'mr', flag: '🇮🇳', label: 'MR' },
];

export default function SidebarLanguagePill() {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const current = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];

  return (
    <div className="relative ml-auto">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#2a2a2a] px-2.5 py-1.5 text-white/80 transition-all duration-[250ms] hover:bg-[#333]"
        aria-label={t('header.language')}
      >
        <span className="text-base leading-none">{current.flag}</span>
        <span className="text-[12px] font-medium">{current.label}</span>
        <HiOutlineChevronDown
          className={`h-3.5 w-3.5 text-white/40 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40"
            aria-label="Close"
            onClick={() => setOpen(false)}
          />
          <div className="absolute bottom-full right-0 z-50 mb-1 min-w-[120px] rounded-[12px] border border-white/[0.08] bg-[#1a1a1a] py-1 shadow-xl">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => {
                  i18n.changeLanguage(lang.code);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-white/80 hover:bg-white/[0.06]"
              >
                <span>{lang.flag}</span>
                <span>{lang.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

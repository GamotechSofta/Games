import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HiOutlineChevronDown } from 'react-icons/hi2';
import LanguageIcon from './LanguageIcon';
import { normalizeLanguageCode } from '../utils/languageCode';
import { ensureLocaleLoaded } from '../i18n/config';

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'hi', label: 'HI' },
  { code: 'mr', label: 'MR' },
];

export default function SidebarLanguagePill() {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const activeCode = normalizeLanguageCode(i18n.language);
  const current = LANGUAGES.find((l) => l.code === activeCode) || LANGUAGES[0];

  return (
    <div className="relative ml-auto">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1.5 text-gray-700 transition-all duration-[250ms] hover:bg-gray-200 dark:border-white/[0.08] dark:bg-[#2a2a2a] dark:text-white/80 dark:hover:bg-[#333]"
        aria-label={t('header.language')}
      >
        <LanguageIcon code={current.code} className="h-4 w-4 shrink-0" />
        <span className="text-[12px] font-medium">{current.label}</span>
        <HiOutlineChevronDown
          className={`h-3.5 w-3.5 text-gray-900 dark:text-white/40 transition-transform ${open ? 'rotate-180' : ''}`}
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
          <div className="absolute bottom-full right-0 z-50 mb-1 min-w-[120px] rounded-[12px] border border-gray-200 bg-white py-1 shadow-xl dark:border-white/[0.08] dark:bg-[#1a1a1a]">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={async () => {
                  await ensureLocaleLoaded(lang.code);
                  await i18n.changeLanguage(lang.code);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-gray-700 hover:bg-gray-50 dark:text-white/80 dark:hover:bg-white/[0.06]"
              >
                <LanguageIcon code={lang.code} className="h-4 w-4 shrink-0" />
                <span>{lang.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

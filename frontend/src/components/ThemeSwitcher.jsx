import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HiOutlineMoon, HiOutlineSun } from 'react-icons/hi';
import { useTheme } from '../context/ThemeContext';

const options = [
  { value: 'light', labelKey: 'theme.light', Icon: HiOutlineSun },
  { value: 'dark', labelKey: 'theme.dark', Icon: HiOutlineMoon },
];

export default function ThemeSwitcher({ variant = 'auto' }) {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const isLightUi = variant === 'light' || (variant === 'auto' && theme === 'light');
  const CurrentIcon = theme === 'light' ? HiOutlineSun : HiOutlineMoon;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className={`flex items-center gap-1.5 px-2 py-2 sm:px-3 min-w-[36px] min-h-[36px] rounded-lg border transition-colors text-sm font-medium justify-center touch-manipulation ${
          isLightUi
            ? 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
            : 'bg-[#202124] border-white/10 text-white hover:bg-[#2a2b2e] hover:border-white/20'
        }`}
        aria-label={t('theme.label')}
        title={t('theme.label')}
      >
        <CurrentIcon className="w-5 h-5 shrink-0" aria-hidden />
        <span className="hidden lg:inline">{t(theme === 'light' ? 'theme.light' : 'theme.dark')}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} aria-hidden="true" />
          <div
            className={`absolute right-0 mt-2 w-44 border rounded-xl shadow-2xl z-50 overflow-hidden ${
              isLightUi ? 'bg-white border-gray-200' : 'bg-[#1a1a1a] border-white/10'
            }`}
          >
            <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {t('theme.label')}
            </div>
            {options.map(({ value, labelKey, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={(e) => {
                  if (theme !== value) {
                    setTheme(value, { origin: e });
                  }
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors ${
                  theme === value
                    ? isLightUi
                      ? 'bg-red-50 text-[#D32F2F] font-semibold'
                      : 'bg-red-950/40 text-red-400 font-semibold'
                    : isLightUi
                      ? 'text-gray-800 hover:bg-gray-50'
                      : 'text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" aria-hidden />
                {t(labelKey)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

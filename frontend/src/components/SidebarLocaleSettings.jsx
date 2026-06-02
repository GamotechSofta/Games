import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HiMoon, HiSun, HiChevronDown } from 'react-icons/hi';
import { useTheme } from '../context/ThemeContext';
import { isThemeTransitionRunning } from '../utils/themeTransition';
import LanguageIcon from './LanguageIcon';
import { normalizeLanguageCode } from '../utils/languageCode';
import { ensureLocaleLoaded } from '../i18n/config';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', flag: '🇮🇳', label: 'हिंदी' },
  { code: 'mr', flag: '🇮🇳', label: 'मराठी' },
  { code: 'gu', flag: '🇮🇳', label: 'ગુજરાતી' },
  { code: 'ta', flag: '🇮🇳', label: 'தமிழ்' },
  { code: 'te', flag: '🇮🇳', label: 'తెలుగు' },
  { code: 'bn', flag: '🇮🇳', label: 'বাংলা' },
  { code: 'kn', flag: '🇮🇳', label: 'ಕನ್ನಡ' },
  { code: 'ml', flag: '🇮🇳', label: 'മലയാളം' },
  { code: 'pa', flag: '🇮🇳', label: 'ਪੰਜਾਬੀ' },
];

function MenuPanel({ children, collapsed, className = '' }) {
  const position = collapsed
    ? 'absolute left-full top-1/2 z-[130] ml-3 min-w-[190px] -translate-y-1/2'
    : 'absolute bottom-full left-0 right-0 z-[120] mb-1.5';

  return (
    <div className={`${position} ${className}`}>
      <div className="max-h-[min(280px,50vh)] overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:shadow-[0_12px_40px_rgba(0,0,0,0.55)]">
        {children}
      </div>
    </div>
  );
}

export default function SidebarLocaleSettings({ collapsed, horizontal = false }) {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const [langOpen, setLangOpen] = useState(false);

  const activeCode = normalizeLanguageCode(i18n.language);
  const currentLang = LANGUAGES.find((l) => l.code === activeCode) || LANGUAGES[0];
  const ThemeIcon = theme === 'light' ? HiSun : HiMoon;

  const btnClass = collapsed
    ? 'flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 hover:text-gray-900 dark:border-white/[0.08] dark:bg-[#2a2a2a] dark:text-[#b0b0b0] dark:hover:bg-[#333] dark:hover:text-[#d4d4d4]'
    : 'flex w-full items-center gap-2.5 rounded-lg border border-gray-200 bg-gray-100 px-2.5 py-2 text-left text-gray-800 transition-colors hover:bg-gray-200 dark:border-white/[0.08] dark:bg-[#2a2a2a] dark:text-white/80 dark:hover:bg-[#333]';

  const containerClass = collapsed
    ? 'flex flex-col items-center gap-1.5 border-t border-gray-200 pt-2 dark:border-white/[0.06]'
    : `border-t border-gray-200 pt-2 dark:border-white/[0.06] ${horizontal ? 'flex items-center gap-2' : 'flex flex-col gap-1.5'}`;

  return (
    <div
      className={containerClass}
    >
      {/* Theme — click toggles light/dark (no dropdown) */}
      <button
        type="button"
        onClick={(e) => {
          if (!isThemeTransitionRunning()) toggleTheme({ origin: e });
        }}
        className={btnClass}
        aria-label={t('theme.label')}
        title={t(theme === 'light' ? 'theme.dark' : 'theme.light')}
      >
        <ThemeIcon className="h-4 w-4 shrink-0" />
        {!collapsed && (
          <span className="dashboard-nav-label flex-1">
            {t(theme === 'light' ? 'theme.light' : 'theme.dark')}
          </span>
        )}
      </button>

      {/* Language */}
      <div
        className="relative z-10"
        onMouseEnter={() => collapsed && setLangOpen(true)}
        onMouseLeave={() => collapsed && setLangOpen(false)}
      >
        <button
          type="button"
          onClick={() => {
            if (collapsed) {
              setLangOpen(true);
              return;
            }
            setLangOpen((v) => !v);
          }}
          onMouseEnter={() => collapsed && setLangOpen(true)}
          className={btnClass}
          aria-label={t('header.language')}
        >
          <LanguageIcon code={currentLang.code} className="h-4 w-4 shrink-0" />
          {!collapsed && (
            <>
              <span className="dashboard-nav-label flex-1 truncate">{currentLang.label}</span>
              <HiChevronDown
                className={`h-4 w-4 shrink-0 text-gray-400 transition-transform dark:text-white/40 ${langOpen ? 'rotate-180' : ''}`}
              />
            </>
          )}
        </button>
        {langOpen && (
          <>
            {!collapsed && (
              <button
                type="button"
                className="fixed inset-0 z-[110]"
                aria-label="Close"
                onClick={() => setLangOpen(false)}
              />
            )}
            <MenuPanel collapsed={collapsed}>
              <p className="dashboard-nav-label-sm border-b border-gray-100 px-3 py-2 text-gray-500 dark:border-white/[0.06] dark:text-white/45">
                {t('language.selectLanguage')}
              </p>
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={async () => {
                    await ensureLocaleLoaded(lang.code);
                    await i18n.changeLanguage(lang.code);
                    setLangOpen(false);
                  }}
                  className={[
                    'flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition-colors',
                    activeCode === lang.code
                      ? 'bg-gray-100 font-medium text-gray-900 dark:bg-white/[0.08] dark:text-white'
                      : 'text-gray-600 hover:bg-gray-50 dark:text-white/70 dark:hover:bg-white/[0.05]',
                  ].join(' ')}
                >
                  <LanguageIcon code={lang.code} className="h-4 w-4 shrink-0" />
                  <span className="truncate">{lang.label}</span>
                </button>
              ))}
            </MenuPanel>
          </>
        )}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HiMoon, HiSun, HiChevronDown } from 'react-icons/hi';
import { useTheme } from '../context/ThemeContext';

const LANGUAGES = [
  { code: 'en', flag: '🇬🇧', label: 'English' },
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

const THEME_OPTIONS = [
  { value: 'light', labelKey: 'theme.light', Icon: HiSun },
  { value: 'dark', labelKey: 'theme.dark', Icon: HiMoon },
];

function MenuPanel({ children, collapsed, className = '' }) {
  const position = collapsed
    ? 'absolute left-full top-0 z-[120] ml-2 min-w-[180px]'
    : 'absolute bottom-full left-0 right-0 z-[120] mb-1.5';

  return (
    <div className={`${position} ${className}`}>
      <div className="max-h-[min(280px,50vh)] overflow-y-auto rounded-xl border border-white/[0.08] bg-[#1a1a1a] py-1 shadow-[0_12px_40px_rgba(0,0,0,0.55)]">
        {children}
      </div>
    </div>
  );
}

export default function SidebarLocaleSettings({ collapsed }) {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [langOpen, setLangOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);

  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];
  const ThemeIcon = theme === 'light' ? HiSun : HiMoon;

  const btnClass = collapsed
    ? 'flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-[#2a2a2a] text-[#b0b0b0] transition-colors hover:bg-[#333] hover:text-[#d4d4d4]'
    : 'flex w-full items-center gap-3 rounded-xl border border-white/[0.08] bg-[#2a2a2a] px-3 py-2.5 text-left text-white/80 transition-colors hover:bg-[#333]';

  return (
    <div
      className={
        collapsed
          ? 'flex flex-col items-center gap-2 border-t border-white/[0.06] pt-3'
          : 'flex flex-col gap-2 border-t border-white/[0.06] pt-3'
      }
    >
      {/* Theme */}
      <div
        className="relative"
        onMouseLeave={() => collapsed && setThemeOpen(false)}
      >
        <button
          type="button"
          onClick={() => setThemeOpen((v) => !v)}
          onMouseEnter={() => collapsed && setThemeOpen(true)}
          className={btnClass}
          aria-label={t('theme.label')}
        >
          <ThemeIcon className="h-5 w-5 shrink-0" />
          {!collapsed && (
            <>
              <span className="dashboard-nav-label flex-1">
                {t(theme === 'light' ? 'theme.light' : 'theme.dark')}
              </span>
              <HiChevronDown
                className={`h-4 w-4 shrink-0 text-white/40 transition-transform ${themeOpen ? 'rotate-180' : ''}`}
              />
            </>
          )}
        </button>
        {themeOpen && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-[110]"
              aria-label="Close"
              onClick={() => setThemeOpen(false)}
            />
            <MenuPanel collapsed={collapsed}>
              <p className="dashboard-nav-label-sm border-b border-white/[0.06] px-3 py-2 text-white/45">
                {t('theme.label')}
              </p>
              {THEME_OPTIONS.map(({ value, labelKey, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setTheme(value);
                    setThemeOpen(false);
                  }}
                  className={[
                    'flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors',
                    theme === value
                      ? 'bg-white/[0.08] font-medium text-white'
                      : 'text-white/70 hover:bg-white/[0.05]',
                  ].join(' ')}
                >
                  <Icon className="h-4 w-4 shrink-0 text-[#b0b0b0]" />
                  {t(labelKey)}
                </button>
              ))}
            </MenuPanel>
          </>
        )}
      </div>

      {/* Language */}
      <div
        className="relative"
        onMouseLeave={() => collapsed && setLangOpen(false)}
      >
        <button
          type="button"
          onClick={() => setLangOpen((v) => !v)}
          onMouseEnter={() => collapsed && setLangOpen(true)}
          className={btnClass}
          aria-label={t('header.language')}
        >
          <span className="text-lg leading-none">{currentLang.flag}</span>
          {!collapsed && (
            <>
              <span className="dashboard-nav-label flex-1 truncate">{currentLang.label}</span>
              <HiChevronDown
                className={`h-4 w-4 shrink-0 text-white/40 transition-transform ${langOpen ? 'rotate-180' : ''}`}
              />
            </>
          )}
        </button>
        {langOpen && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-[110]"
              aria-label="Close"
              onClick={() => setLangOpen(false)}
            />
            <MenuPanel collapsed={collapsed}>
              <p className="dashboard-nav-label-sm border-b border-white/[0.06] px-3 py-2 text-white/45">
                {t('language.selectLanguage')}
              </p>
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => {
                    i18n.changeLanguage(lang.code);
                    setLangOpen(false);
                  }}
                  className={[
                    'flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition-colors',
                    i18n.language === lang.code
                      ? 'bg-white/[0.08] font-medium text-white'
                      : 'text-white/70 hover:bg-white/[0.05]',
                  ].join(' ')}
                >
                  <span>{lang.flag}</span>
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

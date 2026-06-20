import React, { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { HiMoon, HiSun, HiChevronDown } from 'react-icons/hi';
import { useTheme } from '../context/ThemeContext';
import { isThemeTransitionRunning } from '../utils/themeTransition';
import LanguageIcon from './LanguageIcon';
import { normalizeLanguageCode } from '../utils/languageCode';
import { ensureLocaleLoaded } from '../i18n/config';

const LANGUAGES = [
  { code: 'en', label: 'English', name: 'English' },
  { code: 'hi', label: 'हिंदी', name: 'Hindi' },
  { code: 'mr', label: 'मराठी', name: 'Marathi' },
  { code: 'gu', label: 'ગુજરાતી', name: 'Gujarati' },
  { code: 'ta', label: 'தமிழ்', name: 'Tamil' },
  { code: 'te', label: 'తెలుగు', name: 'Telugu' },
  { code: 'bn', label: 'বাংলা', name: 'Bengali' },
  { code: 'kn', label: 'ಕನ್ನಡ', name: 'Kannada' },
  { code: 'ml', label: 'മലയാളം', name: 'Malayalam' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ', name: 'Punjabi' },
];

function LanguageOption({ lang, active, onSelect }) {
  const isActive = active === lang.code;
  return (
    <button
      type="button"
      onClick={() => onSelect(lang.code)}
      className={[
        'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors touch-manipulation',
        isActive
          ? 'bg-red-50 text-[#c62828] dark:bg-[#d4af37]/15 dark:text-[#e8c547]'
          : 'text-gray-800 hover:bg-gray-50 active:bg-gray-100 dark:text-white/85 dark:hover:bg-white/[0.06] dark:active:bg-white/[0.08]',
      ].join(' ')}
    >
      <LanguageIcon code={lang.code} className="h-5 w-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className={`text-[15px] leading-tight ${isActive ? 'font-semibold' : 'font-medium'}`}>
          {lang.label}
        </div>
        <div className="mt-0.5 text-xs text-gray-500 dark:text-white/45">{lang.name}</div>
      </div>
      {isActive && (
        <svg className="h-5 w-5 shrink-0 text-[#c62828] dark:text-[#d4af37]" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      )}
    </button>
  );
}

function LanguageBottomSheet({ open, onClose, activeCode, onSelect, title }) {
  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <>
      <button
        type="button"
        className="fixed inset-0 z-[10030] bg-black/50 backdrop-blur-[2px] transition-opacity"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed inset-x-0 bottom-0 z-[10040] flex max-h-[min(78vh,520px)] flex-col rounded-t-2xl border border-gray-200/80 bg-white shadow-[0_-16px_48px_rgba(0,0,0,0.22)] dark:border-white/10 dark:bg-[#1a1b1f] dark:shadow-[0_-20px_56px_rgba(0,0,0,0.55)]"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="flex shrink-0 flex-col items-center border-b border-gray-100 px-4 pb-3 pt-3 dark:border-white/[0.06]">
          <span className="mb-3 h-1 w-10 rounded-full bg-gray-300 dark:bg-white/20" aria-hidden />
          <p className="w-full text-center text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
        </div>
        <div className="custom-scrollbar-light dark:custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2">
          <div className="flex flex-col gap-1">
            {LANGUAGES.map((lang) => (
              <LanguageOption
                key={lang.code}
                lang={lang}
                active={activeCode}
                onSelect={(code) => {
                  onSelect(code);
                  onClose();
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}

function CollapsedLanguageFlyout({ anchor, open, onClose, activeCode, onSelect, title }) {
  if (!open || !anchor || typeof document === 'undefined') return null;

  return createPortal(
    <>
      <button
        type="button"
        className="fixed inset-0 z-[110]"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className="fixed z-[130] min-w-[220px]"
        style={{ bottom: anchor.bottom, left: anchor.left }}
        role="listbox"
        aria-label={title}
      >
        <div
          className="custom-scrollbar-light dark:custom-scrollbar overflow-y-auto overscroll-contain rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
          style={{ maxHeight: anchor.maxHeight }}
        >
          <p className="dashboard-nav-label-sm border-b border-gray-100 px-3 py-2 text-gray-500 dark:border-white/[0.06] dark:text-white/45">
            {title}
          </p>
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => onSelect(lang.code)}
              className={[
                'flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] transition-colors',
                activeCode === lang.code
                  ? 'bg-red-50 font-semibold text-[#c62828] dark:bg-[#d4af37]/15 dark:text-[#e8c547]'
                  : 'text-gray-600 hover:bg-gray-50 dark:text-white/70 dark:hover:bg-white/[0.05]',
              ].join(' ')}
            >
              <LanguageIcon code={lang.code} className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{lang.label}</span>
              {activeCode === lang.code && (
                <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>
    </>,
    document.body,
  );
}

function MenuPanel({ children, placement }) {
  const position =
    placement === 'right'
      ? 'absolute left-full top-1/2 z-[130] ml-3 min-w-[220px] -translate-y-1/2'
      : placement === 'down'
        ? 'absolute top-full left-0 right-0 z-[120] mt-1.5'
        : 'absolute bottom-full left-0 right-0 z-[120] mb-1.5';

  return (
    <div className={position}>
      <div className="custom-scrollbar-light dark:custom-scrollbar max-h-[min(280px,50vh)] overflow-y-auto overscroll-contain rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:shadow-[0_12px_40px_rgba(0,0,0,0.55)]">
        {children}
      </div>
    </div>
  );
}

export default function SidebarLocaleSettings({ collapsed, horizontal = false }) {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const [langOpen, setLangOpen] = useState(false);
  const langBtnRef = useRef(null);
  const [collapsedMenuAnchor, setCollapsedMenuAnchor] = useState(null);

  const activeCode = normalizeLanguageCode(i18n.language);
  const currentLang = LANGUAGES.find((l) => l.code === activeCode) || LANGUAGES[0];
  const ThemeIcon = theme === 'light' ? HiSun : HiMoon;

  const updateCollapsedMenuAnchor = useCallback(() => {
    if (!langBtnRef.current) return;
    const rect = langBtnRef.current.getBoundingClientRect();
    setCollapsedMenuAnchor({
      bottom: window.innerHeight - rect.bottom,
      left: rect.right + 8,
      maxHeight: Math.min(280, Math.max(160, rect.bottom - 12)),
    });
  }, []);

  const closeLanguageMenu = useCallback(() => {
    setLangOpen(false);
    setCollapsedMenuAnchor(null);
  }, []);

  const openLanguageMenu = useCallback(() => {
    if (collapsed) updateCollapsedMenuAnchor();
    setLangOpen(true);
  }, [collapsed, updateCollapsedMenuAnchor]);

  const selectLanguage = async (langCode) => {
    await ensureLocaleLoaded(langCode);
    await i18n.changeLanguage(langCode);
    closeLanguageMenu();
  };

  const btnClass = collapsed
    ? 'flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 hover:text-gray-900 dark:border-white/[0.08] dark:bg-[#2a2a2a] dark:text-[#b0b0b0] dark:hover:bg-[#333] dark:hover:text-[#d4d4d4]'
    : [
        'flex items-center gap-2.5 rounded-lg border border-gray-200 bg-gray-100 px-2.5 py-2 text-left text-gray-800 transition-colors hover:bg-gray-200 dark:border-white/[0.08] dark:bg-[#2a2a2a] dark:text-white/80 dark:hover:bg-[#333]',
        horizontal ? 'min-h-[44px] w-full min-w-0 flex-1 touch-manipulation' : 'w-full',
      ].join(' ');

  const containerClass = collapsed
    ? 'flex flex-col items-center gap-1.5 border-t border-gray-200 pt-2 dark:border-white/[0.06]'
    : `border-t border-gray-200 pt-2 dark:border-white/[0.06] ${horizontal ? 'flex items-stretch gap-2' : 'flex flex-col gap-1.5'}`;

  const menuPlacement = collapsed ? 'right' : 'up';

  return (
    <div className={containerClass}>
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
          <span className="dashboard-nav-label min-w-0 flex-1 truncate">
            {t(theme === 'light' ? 'theme.light' : 'theme.dark')}
          </span>
        )}
      </button>

      <div
        className={`relative ${horizontal ? 'min-w-0 flex-1' : ''} ${langOpen && !horizontal && !collapsed ? 'z-[120]' : ''}`}
      >
        <button
          ref={langBtnRef}
          type="button"
          onClick={() => {
            if (collapsed) {
              if (langOpen) closeLanguageMenu();
              else openLanguageMenu();
              return;
            }
            setLangOpen((v) => !v);
          }}
          className={btnClass}
          aria-label={t('header.language')}
          aria-expanded={langOpen}
          aria-haspopup={horizontal ? 'dialog' : 'listbox'}
        >
          <LanguageIcon code={currentLang.code} className="h-4 w-4 shrink-0" />
          {!collapsed && (
            <>
              <span className="dashboard-nav-label min-w-0 flex-1 truncate">{currentLang.label}</span>
              <HiChevronDown
                className={`h-4 w-4 shrink-0 text-gray-400 transition-transform dark:text-white/40 ${langOpen && !horizontal ? 'rotate-180' : ''}`}
              />
            </>
          )}
        </button>

        {horizontal ? (
          <LanguageBottomSheet
            open={langOpen}
            onClose={closeLanguageMenu}
            activeCode={activeCode}
            onSelect={selectLanguage}
            title={t('language.selectLanguage')}
          />
        ) : collapsed ? (
          <CollapsedLanguageFlyout
            anchor={collapsedMenuAnchor}
            open={langOpen}
            onClose={closeLanguageMenu}
            activeCode={activeCode}
            onSelect={selectLanguage}
            title={t('language.selectLanguage')}
          />
        ) : (
          langOpen && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-[110]"
                aria-label="Close"
                onClick={closeLanguageMenu}
              />
              <MenuPanel placement={menuPlacement}>
                <p className="dashboard-nav-label-sm border-b border-gray-100 px-3 py-2 text-gray-500 dark:border-white/[0.06] dark:text-white/45">
                  {t('language.selectLanguage')}
                </p>
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => selectLanguage(lang.code)}
                    className={[
                      'flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] transition-colors',
                      activeCode === lang.code
                        ? 'bg-red-50 font-semibold text-[#c62828] dark:bg-[#d4af37]/15 dark:text-[#e8c547]'
                        : 'text-gray-600 hover:bg-gray-50 dark:text-white/70 dark:hover:bg-white/[0.05]',
                    ].join(' ')}
                  >
                    <LanguageIcon code={lang.code} className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{lang.label}</span>
                    {activeCode === lang.code && (
                      <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                ))}
              </MenuPanel>
            </>
          )
        )}
      </div>
    </div>
  );
}

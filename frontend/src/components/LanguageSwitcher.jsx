import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';

const languages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
];

const LanguageSwitcher = ({ onClose, variant = 'dark' }) => {
  const { i18n, t } = useTranslation();
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];
  const isLight = variant === 'light' || (variant === 'auto' && theme === 'light');

  const changeLanguage = async (langCode) => {
    await i18n.changeLanguage(langCode);
    setIsOpen(false);
    if (onClose) onClose();
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 sm:gap-2 px-2 py-2 sm:px-3 sm:py-2 min-w-[36px] min-h-[36px] rounded-lg border transition-colors text-sm font-medium justify-center touch-manipulation ${
          isLight
            ? 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
            : 'bg-[#202124] border-white/10 hover:bg-[#2a2b2e] hover:border-white/20 text-white'
        }`}
        aria-label={t('header.language')}
      >
        <span className="text-base leading-none">{currentLanguage.code === 'en' ? '🇬🇧' : '🌐'}</span>
        <span className="hidden sm:inline">{currentLanguage.nativeName}</span>
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className={`absolute right-0 mt-2 w-[min(14rem,calc(100vw-2rem))] sm:w-56 border rounded-xl shadow-2xl z-50 overflow-hidden max-h-[min(70vh,320px)] flex flex-col ${
            isLight ? 'bg-white border-gray-200' : 'bg-[#1a1a1a] border-white/10'
          }`}>
            <div className="p-2 shrink-0">
              <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {t('language.selectLanguage')}
              </div>
            </div>
            <div className="overflow-y-auto overscroll-contain p-2 pt-0 min-h-0">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => changeLanguage(lang.code)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    i18n.language === lang.code
                      ? isLight
                        ? 'bg-red-50 text-[#D32F2F] font-semibold'
                        : 'bg-[#d4af37]/20 text-[#d4af37] font-semibold'
                      : isLight
                        ? 'text-gray-800 hover:bg-gray-50'
                        : 'text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{lang.nativeName}</div>
                      <div className="text-xs text-gray-400">{lang.name}</div>
                    </div>
                    {i18n.language === lang.code && (
                      <svg className="w-4 h-4 text-[#d4af37]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSwitcher;

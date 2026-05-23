import React from 'react';
import { useTranslation } from 'react-i18next';
import { HiOutlineMoon, HiOutlineSun } from 'react-icons/hi';
import { useTheme } from '../context/ThemeContext';
import { isThemeTransitionRunning } from '../utils/themeTransition';

export default function ThemeSwitcher({ variant = 'auto' }) {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();

  const isLightUi = variant === 'light' || (variant === 'auto' && theme === 'light');
  const CurrentIcon = theme === 'light' ? HiOutlineSun : HiOutlineMoon;
  const nextLabel = theme === 'light' ? t('theme.dark') : t('theme.light');

  const handleClick = (e) => {
    if (isThemeTransitionRunning()) return;
    toggleTheme({ origin: e });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex items-center gap-1.5 px-2 py-2 sm:px-3 min-w-[36px] min-h-[36px] rounded-lg border transition-colors text-sm font-medium justify-center touch-manipulation ${
        isLightUi
          ? 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
          : 'bg-[#202124] border-white/10 text-gray-900 dark:text-white hover:bg-[#2a2b2e] hover:border-white/20'
      }`}
      aria-label={`${t('theme.label')}: ${nextLabel}`}
      title={`${t('theme.label')}: ${nextLabel}`}
    >
      <CurrentIcon className="w-5 h-5 shrink-0" aria-hidden />
      <span className="hidden lg:inline">{t(theme === 'light' ? 'theme.light' : 'theme.dark')}</span>
    </button>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HiOutlineSearch, HiOutlineBell, HiOutlineDownload, HiOutlinePlus } from 'react-icons/hi';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeSwitcher from './ThemeSwitcher';
import { useWallet } from '../hooks/useWallet';
import { getNotificationUnreadCount } from '../utils/notificationCount';
import { triggerApkDownload } from '../utils/downloads';

export default function DashboardHeader() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, formattedBalance, avatarInitial } = useWallet();
  const [notificationCount, setNotificationCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const refreshNotificationCount = useCallback(() => {
    getNotificationUnreadCount().then(setNotificationCount);
  }, []);

  useEffect(() => {
    refreshNotificationCount();
    window.addEventListener('notificationsSeen', refreshNotificationCount);
    window.addEventListener('userLogin', refreshNotificationCount);
    const intervalId = setInterval(refreshNotificationCount, 45000);
    return () => {
      window.removeEventListener('notificationsSeen', refreshNotificationCount);
      window.removeEventListener('userLogin', refreshNotificationCount);
      clearInterval(intervalId);
    };
  }, [refreshNotificationCount]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/games?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 shrink-0 bg-white dark:bg-[#0a0a0a] border-b border-gray-200 dark:border-white/[0.08] px-5 py-3 shadow-sm dark:shadow-none">
      <div className="flex items-center gap-4">
        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex-1 max-w-xl">
          <div className="relative">
            <HiOutlineSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#707070] pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('dashboard.searchPlaceholder')}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-[#161616] border border-transparent dark:border-white/[0.08] rounded-xl text-sm text-gray-800 dark:text-white placeholder:text-gray-400 dark:placeholder:text-[#707070] focus:outline-none focus:bg-white dark:focus:bg-[#1a1a1a] focus:border-gray-300 dark:focus:border-red-900/40 transition-all"
            />
          </div>
        </form>

        {/* Right actions */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <ThemeSwitcher variant="auto" />
          <LanguageSwitcher variant="auto" />

          <button
            type="button"
            onClick={triggerApkDownload}
            className="w-9 h-9 rounded-lg border border-gray-200 dark:border-white/[0.08] dark:bg-[#161616] flex items-center justify-center text-gray-600 dark:text-[#b0b0b0] hover:bg-gray-50 dark:hover:bg-[#1e1e1e] transition-colors"
            aria-label={t('header.downloadApp')}
          >
            <HiOutlineDownload className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => navigate('/notifications')}
            className="relative w-9 h-9 rounded-lg border border-gray-200 dark:border-white/[0.08] dark:bg-[#161616] flex items-center justify-center text-gray-600 dark:text-[#b0b0b0] hover:bg-gray-50 dark:hover:bg-[#1e1e1e] transition-colors"
            aria-label={t('header.notification')}
          >
            <HiOutlineBell className="w-5 h-5" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-[#e60000] text-white text-[10px] font-bold">
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            )}
          </button>

          {/* Wallet button */}
          <button
            type="button"
            onClick={() => navigate('/funds?tab=add-fund')}
            className="flex items-center gap-2 bg-red-50 dark:bg-gradient-to-r dark:from-[#e60000] dark:to-[#cc0000] border border-red-200 dark:border-[#e60000] rounded-xl pl-3 pr-1.5 py-1.5 hover:bg-red-100 dark:hover:from-[#ff1a1a] dark:hover:to-[#e60000] dark:shadow-[0_0_14px_rgba(230,0,0,0.4)] transition-colors"
          >
            <span className="text-sm font-bold text-[#D32F2F] dark:text-white">{formattedBalance}</span>
            <span className="w-7 h-7 rounded-lg bg-[#D32F2F] dark:bg-white/20 flex items-center justify-center">
              <HiOutlinePlus className="w-4 h-4 text-white" />
            </span>
          </button>

          {/* Avatar */}
          <button
            type="button"
            onClick={() => navigate(user ? '/profile' : '/login')}
            className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-[#2a2a2a] dark:to-[#1a1a1a] border-2 border-white dark:border-white/20 shadow-sm flex items-center justify-center overflow-hidden shrink-0"
            aria-label="Profile"
          >
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-gray-700 dark:text-white">{avatarInitial}</span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

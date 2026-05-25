import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getBalance, updateUserBalance } from '../api/bets';
import { getNotificationUnreadCount } from '../utils/notificationCount';
import { triggerApkDownload } from '../utils/downloads';
import aakdaLogo from '../config/logo';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeSwitcher from './ThemeSwitcher';
import { useTheme } from '../context/ThemeContext';
import MobileInstallBanner from './MobileInstallBanner';

const AppHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { isLight } = useTheme();
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(null);
  const [notificationCount, setNotificationCount] = useState(0);

  const refreshNotificationCount = useCallback(() => {
    getNotificationUnreadCount().then(setNotificationCount);
  }, []);

  const loadStoredBalance = () => {
    try {
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      const b = storedUser?.balance ?? storedUser?.walletBalance ?? storedUser?.wallet ?? 0;
      setBalance(Number(b));
    } catch (_) {
      setBalance(0);
    }
  };

  useEffect(() => {
    const checkUser = () => {
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          setUser(JSON.parse(userData));
        } catch (_) {
          setUser(null);
        }
      } else {
        setUser(null);
        setNotificationCount(0);
      }
      loadStoredBalance();
    };

    checkUser();

    const fetchAndUpdateBalance = async () => {
      try {
        const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
        const userId = storedUser?.id || storedUser?._id;
        if (!userId) return;
        const res = await getBalance();
        if (res.success && res.data?.balance != null) {
          updateUserBalance(res.data.balance);
          setBalance(res.data.balance);
        }
      } catch (_) {}
    };

    fetchAndUpdateBalance();

    window.addEventListener('storage', checkUser);
    window.addEventListener('userLogin', checkUser);
    window.addEventListener('userLogout', checkUser);

    refreshNotificationCount();
    window.addEventListener('notificationsSeen', refreshNotificationCount);
    window.addEventListener('userLogin', refreshNotificationCount);

    const intervalId = setInterval(refreshNotificationCount, 45000);

    return () => {
      window.removeEventListener('storage', checkUser);
      window.removeEventListener('userLogin', checkUser);
      window.removeEventListener('userLogout', checkUser);
      window.removeEventListener('notificationsSeen', refreshNotificationCount);
      window.removeEventListener('userLogin', refreshNotificationCount);
      clearInterval(intervalId);
    };
  }, [refreshNotificationCount]);

  useEffect(() => {
    refreshNotificationCount();
  }, [location.pathname, refreshNotificationCount]);

  const handleProfileClick = () => {
    navigate(user ? '/profile' : '/login');
  };

  const displayBalance = balance != null ? Number(balance) : 0;
  const formattedBalance = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(displayBalance);
  const formattedMobileBalance = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(displayBalance);

  const isDashboardRoute = location.pathname === '/' || location.pathname === '/markets';

  return (
    <>
      <div
        className={`fixed top-0 left-0 right-0 z-50 w-full min-w-0 border-b
          ${isDashboardRoute ? 'md:hidden' : ''}
          ${isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-[#141415] border-white/5'}
          pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))]
          sm:pl-[max(0.75rem,env(safe-area-inset-left))] sm:pr-[max(0.75rem,env(safe-area-inset-right))]
          md:pl-[max(1rem,env(safe-area-inset-left))] md:pr-[max(1rem,env(safe-area-inset-right))]
          lg:pl-[max(1.25rem,env(safe-area-inset-left))] lg:pr-[max(1.25rem,env(safe-area-inset-right))]
          xl:pl-[max(1.5rem,env(safe-area-inset-left))] xl:pr-[max(1.5rem,env(safe-area-inset-right))]
          py-1.5 sm:py-2 md:py-2
          pt-[max(0.5rem,calc(0.25rem+env(safe-area-inset-top,0px)))]
          sm:pt-[max(0.5rem,calc(0.375rem+env(safe-area-inset-top,0px)))]
          md:pt-[max(0.5rem,calc(0.5rem+env(safe-area-inset-top,0px)))]`}
      >
        <div className="flex flex-col gap-2">
          {isDashboardRoute && <MobileInstallBanner />}

          {isDashboardRoute ? (
            <div className="flex items-center justify-between gap-2 min-w-0 md:hidden">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={handleProfileClick}
                  className={`flex h-10 w-10 items-center justify-center active:scale-95 transition ${
                    isLight ? 'text-gray-800' : 'text-white'
                  }`}
                  aria-label={t('navigation.menu', { defaultValue: 'Menu' })}
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
                  </svg>
                </button>
                <Link to="/" className="flex items-center min-w-0">
                  <img
                    src={aakdaLogo}
                    alt="Aakda"
                    className="h-9 w-auto max-w-[122px] object-contain object-left"
                  />
                </Link>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => navigate('/funds?tab=add-fund')}
                  className={`flex items-center gap-1.5 rounded-full border pl-2.5 pr-1.5 py-1.5 transition active:scale-95 ${
                    isLight
                      ? 'border-[#f3d6a0] bg-white text-gray-900 shadow-[0_4px_18px_rgba(15,23,42,0.08)]'
                      : 'border-[#5a4721] bg-[#15120d] text-white shadow-[0_8px_26px_rgba(0,0,0,0.28)]'
                  }`}
                >
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full ${isLight ? 'bg-[#fff3cf]' : 'bg-[#2e220f]'}`}>
                    <img
                      src="https://res.cloudinary.com/dnyp5jknp/image/upload/v1771394532/wallet_n1oyef.png"
                      alt=""
                      className="h-4 w-4 object-contain"
                    />
                  </span>
                  <span className="max-w-[92px] truncate text-[13px] font-extrabold">
                    ₹ {formattedMobileBalance}
                  </span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#f3b61b] text-black shadow-[0_4px_12px_rgba(243,182,27,0.35)]">
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 4a1 1 0 011 1v4h4a1 1 0 110 2h-4v4a1 1 0 11-2 0v-4H5a1 1 0 110-2h4V5a1 1 0 011-1z" />
                    </svg>
                  </span>
                </button>

                <button
                  onClick={() => navigate('/notifications')}
                  className={`relative flex h-10 w-10 items-center justify-center active:scale-95 transition ${
                    isLight ? 'text-gray-800' : 'text-white'
                  }`}
                  aria-label="Notifications"
                  title="Notifications"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg>
                  {notificationCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 min-w-[17px] h-[17px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold">
                      {notificationCount > 99 ? '99+' : notificationCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-1 sm:gap-2 md:gap-3 min-w-0">
              <div className="flex items-center min-w-0 shrink-0">
                <Link
                  to="/"
                  className="flex items-center shrink-0 cursor-pointer active:scale-95 transition-transform duration-200 min-w-0"
                >
                  <img
                    src={aakdaLogo}
                    alt="Aakda"
                    className="h-9 sm:h-10 md:h-11 w-auto max-w-[140px] sm:max-w-[160px] object-contain object-left"
                  />
                </Link>
              </div>

              <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 lg:gap-3 shrink-0 min-w-0">
                <ThemeSwitcher variant="auto" />
                <LanguageSwitcher variant="auto" />

                <button
                  onClick={triggerApkDownload}
                  className={`animate-download-blink shrink-0 w-9 h-9 sm:w-9 sm:h-9 md:w-10 md:h-10 min-w-[36px] min-h-[36px] rounded-lg flex items-center justify-center active:scale-95 transition-all duration-200 touch-manipulation ${
                    isLight
                      ? 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                      : 'bg-[#202124] border border-white/10 text-gray-900 dark:text-white hover:bg-[#2a2b2e] hover:border-white/20'
                  }`}
                  aria-label={t('header.downloadApp')}
                  title={t('header.downloadApp')}
                >
                  <svg className="w-4 h-4 md:w-[18px] md:h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>

                <button
                  onClick={() => navigate('/notifications')}
                  className={`shrink-0 w-9 h-9 sm:w-9 sm:h-9 md:w-10 md:h-10 min-w-[36px] min-h-[36px] rounded-lg flex items-center justify-center active:scale-95 transition-all duration-200 relative touch-manipulation ${
                    isLight
                      ? 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                      : 'bg-[#202124] border border-white/10 text-gray-900 dark:text-white hover:bg-[#2a2b2e] hover:border-white/20'
                  }`}
                  aria-label="Notifications"
                  title="Notifications"
                >
                  <svg className="w-4 h-4 md:w-[18px] md:h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg>
                  {notificationCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-0.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold">
                      {notificationCount > 99 ? '99+' : notificationCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => navigate('/funds?tab=add-fund')}
                  className={`hidden md:flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 lg:px-3 lg:py-2 transition-colors min-w-0 ${
                    isLight
                      ? 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      : 'bg-[#202124] border-white/5 hover:bg-[#2a2b2e]'
                  }`}
                >
                  <img
                    src="https://res.cloudinary.com/dnyp5jknp/image/upload/v1771394532/wallet_n1oyef.png"
                    alt="Wallet"
                    className="w-6 h-6 lg:w-7 lg:h-7 xl:w-8 xl:h-8 object-contain shrink-0"
                  />
                  <span className={`text-xs lg:text-sm xl:text-base font-bold truncate max-w-[80px] lg:max-w-[100px] xl:max-w-none ${isLight ? 'text-gray-900' : 'text-gray-900 dark:text-white'}`}>
                    {formattedBalance}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleProfileClick}
                  className={`hidden md:flex w-9 h-9 lg:w-10 lg:h-10 shrink-0 rounded-lg border items-center justify-center cursor-pointer active:scale-95 transition-all duration-200 touch-manipulation ${
                    isLight
                      ? user
                        ? 'bg-amber-50 border-amber-300 hover:bg-amber-100'
                        : 'bg-gray-100 border-gray-200 hover:bg-gray-200'
                      : `bg-gradient-to-br from-gray-800 to-gray-900 ${user ? 'border-yellow-500/60 hover:bg-yellow-500/20 hover:border-yellow-500/80' : 'border-gray-700/50 hover:bg-gray-700/50'}`
                  }`}
                  title={user ? `${user.username} - ${t('common.view')} Profile` : `${t('header.signIn')} / ${t('header.signUp')}`}
                  aria-label="Profile"
                >
                  <svg
                    className={`w-4 h-4 lg:w-5 lg:h-5 ${user ? 'text-yellow-500 dark:text-yellow-400' : isLight ? 'text-gray-700' : 'text-gray-900 dark:text-white'}`}
                    fill={user ? 'currentColor' : 'none'}
                    stroke={user ? 'none' : 'currentColor'}
                    strokeWidth={user ? 0 : 1.5}
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AppHeader;

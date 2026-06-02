import React, { Suspense, lazy, useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getBalance, updateUserBalance } from '../api/bets';
import { triggerApkDownload } from '../utils/downloads';
import aakdaLogo from '../config/logo';
import { useTheme } from '../context/ThemeContext';
import { formatWalletAmount } from '../utils/walletBalance';

const LanguageSwitcher = lazy(() => import('./LanguageSwitcher'));
const ThemeSwitcher = lazy(() => import('./ThemeSwitcher'));
const MobileInstallBanner = lazy(() => import('./MobileInstallBanner'));

const AppHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { isLight } = useTheme();
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(null);

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

    const balanceDeferId = window.setTimeout(fetchAndUpdateBalance, 2500);

    window.addEventListener('storage', checkUser);
    window.addEventListener('userLogin', checkUser);
    window.addEventListener('userLogout', checkUser);

    return () => {
      window.clearTimeout(balanceDeferId);
      window.removeEventListener('storage', checkUser);
      window.removeEventListener('userLogin', checkUser);
      window.removeEventListener('userLogout', checkUser);
    };
  }, []);

  const handleProfileClick = () => {
    navigate(user ? '/profile' : '/login');
  };

  const formattedBalance = formatWalletAmount(balance != null ? balance : 0);
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
          ${
            isDashboardRoute
              ? 'py-1 sm:py-1.5 pt-[max(0.375rem,calc(0.15rem+env(safe-area-inset-top,0px)))] sm:pt-[max(0.45rem,calc(0.25rem+env(safe-area-inset-top,0px)))] md:py-2 md:pt-[max(0.5rem,calc(0.5rem+env(safe-area-inset-top,0px)))]'
              : 'py-1 sm:py-1.5 pt-[max(0.375rem,calc(0.15rem+env(safe-area-inset-top,0px)))] sm:pt-[max(0.45rem,calc(0.25rem+env(safe-area-inset-top,0px)))] md:py-2 md:pt-[max(0.5rem,calc(0.5rem+env(safe-area-inset-top,0px)))]'
          }`}
      >
        <div className="flex flex-col gap-1.5">
          {isDashboardRoute && (
            <Suspense fallback={null}>
              <MobileInstallBanner />
            </Suspense>
          )}

          {/* Mobile — same navbar as home (logo + download + wallet) on all pages */}
          <div className="flex items-center gap-2.5 min-w-0 md:hidden">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="min-w-0 shrink-0 rounded-xl p-0.5 transition-transform duration-200 active:scale-[0.98]"
              aria-label="Aakda home"
            >
              <img
                src={aakdaLogo}
                alt="Aakda"
                className="h-8 w-auto max-w-[126px] object-contain"
              />
            </button>

            <div className="ml-auto flex min-w-0 shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={triggerApkDownload}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 transition-colors hover:bg-gray-50 dark:border-white/[0.08] dark:bg-[#1d1e20] dark:hover:bg-[#2a2b2e]"
                aria-label={t('header.downloadApp')}
                title={t('header.downloadApp')}
              >
                <svg className="h-4 w-4 text-gray-700 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => navigate('/funds')}
                className="flex min-w-0 max-w-[148px] items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 py-1 pl-2.5 pr-1 transition-colors hover:bg-gray-100 dark:border-white/[0.08] dark:bg-[#1d1e20] dark:hover:bg-[#2a2b2e] dark:shadow-none"
              >
                <span className="flex min-w-0 items-center gap-1 truncate text-[13px] font-semibold leading-none text-gray-900 dark:text-white">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#e60000] text-xs font-bold text-white">
                    ₹
                  </span>
                  {formattedBalance}
                </span>
              </button>

              <button
                type="button"
                onClick={handleProfileClick}
                className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                  isLight
                    ? user
                      ? 'bg-red-50 border-red-300 hover:bg-red-100'
                      : 'bg-gray-100 border-gray-200 hover:bg-gray-200'
                    : user
                      ? 'bg-[#1d1e20] border-red-500/60 hover:bg-red-500/15'
                      : 'bg-[#1d1e20] border-white/[0.08] hover:bg-[#2a2b2e]'
                }`}
                title={user ? `${user.username} - ${t('common.view')} Profile` : `${t('header.signIn')} / ${t('header.signUp')}`}
                aria-label="Profile"
              >
                <svg
                  className={`h-4 w-4 ${user ? 'text-[#e60000] dark:text-red-400' : isLight ? 'text-gray-700' : 'text-white'}`}
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

          {/* Desktop / tablet */}
          <div className="hidden md:flex items-center justify-between gap-1 sm:gap-2 md:gap-3 min-w-0 w-full">
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
                <Suspense fallback={null}>
                  <ThemeSwitcher variant="auto" />
                </Suspense>
                <Suspense fallback={null}>
                  <LanguageSwitcher variant="auto" />
                </Suspense>

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
                  onClick={() => navigate('/funds')}
                  className={`hidden md:flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 lg:px-3 lg:py-2 transition-colors min-w-0 ${
                    isLight
                      ? 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      : 'bg-[#202124] border-white/5 hover:bg-[#2a2b2e]'
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 lg:h-8 lg:w-8 shrink-0 items-center justify-center rounded-lg text-base lg:text-lg font-bold ${
                      isLight ? 'bg-red-50 text-[#e60000]' : 'bg-[#e60000]/20 text-red-400'
                    }`}
                    aria-hidden
                  >
                    ₹
                  </span>
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
                        ? 'bg-red-50 border-red-300 hover:bg-red-100'
                        : 'bg-gray-100 border-gray-200 hover:bg-gray-200'
                      : `bg-gradient-to-br from-gray-800 to-gray-900 ${user ? 'border-red-500/60 hover:bg-red-500/20 hover:border-red-500/80' : 'border-gray-700/50 hover:bg-gray-700/50'}`
                  }`}
                  title={user ? `${user.username} - ${t('common.view')} Profile` : `${t('header.signIn')} / ${t('header.signUp')}`}
                  aria-label="Profile"
                >
                  <svg
                    className={`w-4 h-4 lg:w-5 lg:h-5 ${user ? 'text-[#e60000] dark:text-red-400' : isLight ? 'text-gray-700' : 'text-gray-900 dark:text-white'}`}
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
        </div>
      </div>
    </>
  );
};

export default AppHeader;

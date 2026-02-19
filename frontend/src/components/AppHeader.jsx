import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getBalance, updateUserBalance } from '../api/bets';
import { clearUserAuth } from '../utils/auth';
import { getNotificationUnreadCount } from '../utils/notificationCount';
import LanguageSwitcher from './LanguageSwitcher';

const AppHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(null);
  const [notificationCount, setNotificationCount] = useState(0);

  const refreshNotificationCount = useCallback(() => {
    getNotificationUnreadCount().then(setNotificationCount);
  }, []);

  const menuItems = [
    { key: 'myBets', label: t('header.myBets'), path: '/bids' },
    { key: 'funds', label: t('header.funds'), path: '/funds' },
    { key: 'updateRate', label: t('header.updateRate'), path: '/game-rate' },
    { key: 'topWinners', label: t('header.topWinners'), path: '/top-winners' },
    { key: 'telegramChannel', label: t('header.telegramChannel'), path: '/support' },
    { key: 'notification', label: t('header.notification'), path: '/notifications' },
    { key: 'helpDesk', label: t('header.helpDesk'), path: '/support' },
    { key: 'shareApp', label: t('header.shareApp'), path: '/support' },
    { key: 'logout', label: t('header.logout'), path: '/login' }
  ];

  const loadStoredBalance = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const b = user?.balance ?? user?.walletBalance ?? user?.wallet ?? 0;
      setBalance(Number(b));
    } catch (_) {
      setBalance(0);
    }
  };

  useEffect(() => {
    // Check if user is logged in
    const checkUser = () => {
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          setUser(JSON.parse(userData));
        } catch (e) {
          setUser(null);
        }
      } else {
        setUser(null);
        setNotificationCount(0);
      }
      loadStoredBalance();
    };

    checkUser();

    // Fetch balance from server
    const fetchAndUpdateBalance = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        const userId = user?.id || user?._id;
        if (!userId) return;
        const res = await getBalance();
        if (res.success && res.data?.balance != null) {
          updateUserBalance(res.data.balance);
          setBalance(res.data.balance);
        }
      } catch (_) {}
    };

    fetchAndUpdateBalance();

    // Listen for storage changes (when user logs in/out in another tab)
    window.addEventListener('storage', checkUser);
    
    // Listen for custom login event
    window.addEventListener('userLogin', checkUser);
    window.addEventListener('userLogout', checkUser);

    // Close sidebar when user taps a bottom navbar item (mobile)
    const closeMenu = () => setIsMenuOpen(false);
    window.addEventListener('closeHeaderMenu', closeMenu);

    refreshNotificationCount();
    window.addEventListener('notificationsSeen', refreshNotificationCount);
    window.addEventListener('userLogin', refreshNotificationCount);

    const intervalId = setInterval(refreshNotificationCount, 45000);

    return () => {
      window.removeEventListener('storage', checkUser);
      window.removeEventListener('userLogin', checkUser);
      window.removeEventListener('userLogout', checkUser);
      window.removeEventListener('closeHeaderMenu', closeMenu);
      window.removeEventListener('notificationsSeen', refreshNotificationCount);
      window.removeEventListener('userLogin', refreshNotificationCount);
      clearInterval(intervalId);
    };
  }, [refreshNotificationCount]);

  // Refresh badge when route changes (e.g. leaving /notifications so count updates)
  useEffect(() => {
    refreshNotificationCount();
  }, [location.pathname, refreshNotificationCount]);

  const handleLogout = () => {
    clearUserAuth();
  };

  const displayName = user?.username || t('header.signIn');
  const displayPhone =
    user?.phone ||
    user?.mobile ||
    user?.mobileNumber ||
    user?.phoneNumber ||
    user?.phone_number ||
    user?.mobilenumber ||
    user?.email ||
    '-';
  const sinceDateRaw = user?.createdAt || user?.created_at || user?.createdOn;
  const sinceDate = sinceDateRaw ? new Date(sinceDateRaw) : null;
  const sinceText = sinceDate && !Number.isNaN(sinceDate.getTime())
    ? `Since ${sinceDate.toLocaleDateString('en-GB')}`
    : 'Since -';
  const avatarInitial = displayName ? displayName.charAt(0).toUpperCase() : 'U';

  const handleProfileClick = () => {
    navigate(user ? '/profile' : '/login');
  };

  const displayBalance = balance != null ? Number(balance) : 0;
  const formattedBalance = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(displayBalance);

  return (
    <>
      <div
        className="fixed top-0 left-0 right-0 z-50 w-full bg-black border-b border-white/5 pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] sm:pl-[max(1rem,env(safe-area-inset-left))] sm:pr-[max(1rem,env(safe-area-inset-right))] md:pl-[max(1.25rem,env(safe-area-inset-left))] md:pr-[max(1.25rem,env(safe-area-inset-right))] py-1.5 sm:py-1 md:py-1.5 pt-[calc(0.5rem+env(safe-area-inset-top,0px))] sm:pt-[calc(0.375rem+env(safe-area-inset-top,0px))] md:pt-[calc(0.5rem+env(safe-area-inset-top,0px))]"
      >
        <div className="flex items-center justify-between gap-1.5 sm:gap-2 md:gap-2">
          {/* Hamburger Menu and Logo together on the left */}
          <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3">
            <button
              type="button"
              onClick={() => setIsMenuOpen(true)}
              className="w-8 h-8 sm:w-8 sm:h-8 md:w-9 md:h-9 shrink-0 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700/50 flex items-center justify-center cursor-pointer active:scale-95 hover:bg-gray-700/50 transition-all duration-200"
              aria-label="Open menu"
            >
            <div className="flex flex-col gap-1 sm:gap-1">
              <div className="w-4 sm:w-4 md:w-4 h-[2px] bg-white rounded-full"></div>
              <div className="w-3 sm:w-3 md:w-3.5 h-[2px] bg-white rounded-full"></div>
              <div className="w-2.5 sm:w-3 md:w-3 h-[2px] bg-white rounded-full"></div>
            </div>
            </button>

            {/* Logo - aligned next to hamburger */}
            <Link
              to="/"
              className="flex items-center cursor-pointer active:scale-95 transition-transform duration-200"
            >
              <img
                src="https://res.cloudinary.com/dzd47mpdo/image/upload/v1770208855/copy_of_7db585f9-9318-4d5b-af85-3239bd0ae2be_1b90b5.png"
                alt="Logo"
                className="h-7 sm:h-7 md:h-8 lg:h-9 w-auto object-contain"
              />
            </Link>
          </div>

        {/* Right side buttons - Download App, Wallet, Profile */}
        <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3">
          {/* Language Switcher */}
          <LanguageSwitcher />

          {/* Download App - icon only on mobile, text on larger screens */}
          <button
            onClick={() => navigate('/download')}
            className="shrink-0 rounded-lg md:rounded-lg bg-gradient-to-r from-[#f3b61b] to-[#e5a914] px-2.5 sm:px-2.5 md:px-3 lg:px-4 py-1.5 sm:py-1.5 md:py-2 text-xs sm:text-xs md:text-sm font-bold text-black active:scale-95 hover:from-[#e5a914] hover:to-[#d49a13] transition-all duration-200 flex items-center gap-1 sm:gap-1 md:gap-1.5 min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 justify-center"
          >
            <svg className="w-4 h-4 sm:w-4 sm:h-4 md:w-4 md:h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="hidden sm:inline">{t('header.downloadApp')}</span>
          </button>

          {/* Notification - mobile and desktop (laptop) */}
          <button
            onClick={() => navigate('/notifications')}
            className="shrink-0 w-8 h-8 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-lg bg-[#202124] border border-white/10 flex items-center justify-center text-white hover:bg-[#2a2b2e] hover:border-white/20 active:scale-95 transition-all duration-200 relative"
            aria-label="Notifications"
            title="Notifications"
          >
            <svg className="w-4 h-4 sm:w-4 sm:h-4 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            {notificationCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-0.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold">
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            )}
          </button>

          {/* Wallet - desktop only, responsive size */}
          <button
            onClick={() => navigate('/funds?tab=add-fund')}
            className="hidden md:flex shrink-0 items-center gap-1 md:gap-1.5 rounded-lg bg-[#202124] border border-white/5 px-2 md:px-2.5 py-1 md:py-1.5 hover:bg-[#2a2b2e] transition-colors"
          >
            <img
              src="https://res.cloudinary.com/dnyp5jknp/image/upload/v1771394532/wallet_n1oyef.png"
              alt="Wallet"
              className="w-6 h-6 md:w-6 md:h-6 lg:w-7 lg:h-7 object-contain"
            />
            <span className="text-xs md:text-sm lg:text-base font-bold text-white">{formattedBalance}</span>
          </button>

          {/* Profile Icon - desktop only (hidden on mobile since bottom navbar has it) */}
          <button
            type="button"
            onClick={handleProfileClick}
            className={`hidden md:flex w-8 h-8 md:w-9 md:h-9 shrink-0 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 border items-center justify-center cursor-pointer active:scale-95 transition-all duration-200 ${
              user ? 'border-yellow-500/60 hover:bg-yellow-500/20 hover:border-yellow-500/80' : 'border-gray-700/50 hover:bg-gray-700/50'
            }`}
            title={user ? `${user.username} - ${t('common.view')} Profile` : `${t('header.signIn')} / Sign Up`}
            aria-label="Profile"
          >
            <svg
              className={`w-4 h-4 md:w-4 md:h-4 ${user ? 'text-yellow-400' : 'text-white'}`}
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
      {isMenuOpen && (
        <div className="fixed inset-0 z-[60]">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMenuOpen(false)}
            aria-label="Close menu overlay"
          />
          <aside className="relative h-full w-[86%] max-w-[360px] sm:w-[70%] sm:max-w-[380px] md:w-[420px] md:max-w-none bg-gradient-to-b from-[#0a0a0a] via-black to-[#0a0a0a] shadow-[6px_0_24px_rgba(0,0,0,0.8)] border-r border-white/5">
            {/* User Profile Section */}
            <div className="px-5 sm:px-6 pt-6 pb-5 border-b border-white/10 bg-gradient-to-b from-[#1a1a1a]/50 to-transparent">
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    handleProfileClick();
                  }}
                  className="flex items-center gap-4 flex-1 min-w-0 text-left group"
                  aria-label="Open profile"
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-[#1e1e1e] to-[#2a2a2a] border-2 border-yellow-500/30 flex items-center justify-center text-white text-xl sm:text-2xl font-bold shadow-[0_4px_12px_rgba(212,175,55,0.3)]">
                      {avatarInitial}
                    </div>
                    {user && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-black"></div>
                    )}
                  </div>
                  
                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-base sm:text-lg font-bold text-white truncate">{displayName}</div>
                    <div className="text-xs sm:text-sm text-gray-400 mt-0.5 truncate">{displayPhone}</div>
                    <div className="text-xs sm:text-sm text-gray-500 mt-0.5">{sinceText}</div>
                  </div>
                </button>
                
                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(false)}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#1a1a1a] border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#222] hover:border-white/20 active:scale-95 transition-all duration-200 shrink-0"
                  aria-label="Close menu"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Menu Items */}
            <div className="px-4 sm:px-5 py-4 space-y-2.5 overflow-y-auto h-[calc(100%-140px)] scrollbar-hidden">
              {menuItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    if (item.key === 'logout') {
                      handleLogout();
                    } else {
                      navigate(item.path);
                    }
                  }}
                  className="group w-full bg-gradient-to-r from-[#1a1a1a] to-[#1e1e1e] rounded-xl sm:rounded-2xl px-4 py-3.5 sm:py-4 flex items-center gap-4 border border-white/5 hover:border-yellow-500/30 hover:from-[#222] hover:to-[#252525] hover:shadow-[0_4px_16px_rgba(212,175,55,0.15)] active:scale-[0.98] transition-all duration-200"
                >
                  {/* Icon Container */}
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[#2a2a2a] to-[#1e1e1e] border border-white/10 flex items-center justify-center shrink-0 group-hover:border-yellow-500/30 group-hover:shadow-[0_4px_12px_rgba(212,175,55,0.2)] transition-all duration-200">
                    {item.key === 'topWinners' ? (
                      <img
                        src="https://res.cloudinary.com/dzd47mpdo/image/upload/v1769797561/podium_swqjij.png"
                        alt={item.label}
                        className="w-6 h-6 sm:w-7 sm:h-7 object-contain"
                      />
                    ) : item.key === 'telegramChannel' ? (
                      <img
                        src="https://res.cloudinary.com/dzd47mpdo/image/upload/v1769797952/telegram_yw9hf1.png"
                        alt="Telegram"
                        className="w-6 h-6 sm:w-7 sm:h-7 object-contain"
                      />
                    ) : item.key === 'myBets' ? (
                      <img
                        src="https://res.cloudinary.com/dzd47mpdo/image/upload/v1769777192/auction_ofhpps.png"
                        alt="My Bets"
                        className="w-6 h-6 sm:w-7 sm:h-7 object-contain"
                      />
                    ) : item.key === 'funds' ? (
                      <img
                        src="https://res.cloudinary.com/dzd47mpdo/image/upload/v1769777500/funding_zjmbzp.png"
                        alt="Funds"
                        className="w-6 h-6 sm:w-7 sm:h-7 object-contain"
                      />
                    ) : item.key === 'updateRate' ? (
                      <svg className="w-6 h-6 sm:w-7 sm:h-7 text-[#d4af37]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : item.key === 'notification' ? (
                      <img
                        src="https://res.cloudinary.com/dzd47mpdo/image/upload/v1769798359/notification_1_pflwit.png"
                        alt="Notification"
                        className="w-6 h-6 sm:w-7 sm:h-7 object-contain"
                      />
                    ) : item.key === 'helpDesk' ? (
                      <img
                        src="https://res.cloudinary.com/dzd47mpdo/image/upload/v1769777618/customer-support_du0zcj.png"
                        alt="Help Desk"
                        className="w-6 h-6 sm:w-7 sm:h-7 object-contain"
                      />
                    ) : item.key === 'shareApp' ? (
                      <img
                        src="https://res.cloudinary.com/dzd47mpdo/image/upload/v1769798998/share_a6shgt.png"
                        alt="Share App"
                        className="w-6 h-6 sm:w-7 sm:h-7 object-contain"
                      />
                    ) : item.key === 'logout' ? (
                      <img
                        src="https://res.cloudinary.com/dzd47mpdo/image/upload/v1769798997/logout_mttqvy.png"
                        alt="Logout"
                        className="w-6 h-6 sm:w-7 sm:h-7 object-contain"
                      />
                    ) : (
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-white/40"></div>
                    )}
                  </div>
                  
                  {/* Menu Text */}
                  <span className="text-sm sm:text-base font-semibold text-white group-hover:text-yellow-400 transition-colors duration-200 flex-1 text-left">
                    {item.label}
                  </span>
                  {item.key === 'notification' && notificationCount > 0 && (
                    <span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold shrink-0">
                      {notificationCount > 99 ? '99+' : notificationCount}
                    </span>
                  )}
                  {/* Arrow Indicator */}
                  <svg className="w-5 h-5 text-white/20 group-hover:text-yellow-500/60 group-hover:translate-x-1 transition-all duration-200 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
              
              {/* Version Footer */}
              <div className="text-center text-xs text-gray-600 pt-4 pb-2">Version: 1.0.0</div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};

export default AppHeader;

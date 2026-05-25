import React from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HiOutlineHome, HiOutlineSquares2X2 } from 'react-icons/hi2';
import { MdOutlineAccountBalanceWallet, MdOutlineAssessment, MdOutlineReceiptLong } from 'react-icons/md';

const BottomNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const scrollToTopSmooth = () => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      if (document.documentElement) document.documentElement.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      if (document.body) document.body.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    } catch (_) {}
  };

  const navItems = [
    { id: 'home', label: t('navigation.home'), path: '/', Icon: HiOutlineHome },
    { id: 'my-bids', label: t('navigation.myBets'), path: '/bids', Icon: MdOutlineReceiptLong },
    { id: 'results', label: t('navigation.results', { defaultValue: 'Results' }), path: '/market-result-history', Icon: MdOutlineAssessment },
    { id: 'wallet', label: t('navigation.wallet', { defaultValue: 'Wallet' }), path: '/wallet', Icon: MdOutlineAccountBalanceWallet },
    { id: 'menu', label: t('navigation.menu', { defaultValue: 'Menu' }), path: '/profile', Icon: HiOutlineSquares2X2 },
  ];

  const isActive = (item) => {
    if (item.id === 'home') {
      return location.pathname === '/' || location.pathname === '/markets';
    }
    return location.pathname.startsWith(item.path);
  };

  const handleNavigate = (item) => {
    if (item.id === 'home' && (location.pathname === '/' || location.pathname === '/markets')) {
      scrollToTopSmooth();
      return;
    }
    navigate(item.path);
    setTimeout(scrollToTopSmooth, 100);
  };

  const navEl = (
    <div
      id="app-bottom-nav"
      role="navigation"
      aria-label="Main navigation"
      className="app-bottom-nav-fixed md:hidden"
      style={{
        paddingBottom: 'max(0.4rem, env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(0.5rem, env(safe-area-inset-left))',
        paddingRight: 'max(0.5rem, env(safe-area-inset-right))',
      }}
    >
<<<<<<< Updated upstream
      <div className="absolute inset-0 bg-[#f5f5f7] dark:bg-[#141415] pointer-events-none" />
=======
      <div className="absolute inset-0 bg-[#f5f5f7] dark:bg-black pointer-events-none" />
>>>>>>> Stashed changes
      <div className="relative flex items-end justify-between rounded-[24px] border border-gray-200 bg-white px-1.5 py-2 shadow-[0_-6px_24px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-[#101010] dark:shadow-[0_-12px_28px_rgba(0,0,0,0.42)]">
        {navItems.map((item) => {
          const active = isActive(item);
          const Icon = item.Icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavigate(item)}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1.5 transition active:scale-[0.97] ${
                active
                  ? 'bg-red-50 text-[#e53935] dark:bg-[#2a1212] dark:text-[#ff6a63]'
                  : 'text-gray-500 dark:text-white/65'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className={`text-[10px] font-semibold ${active ? 'text-[#e53935] dark:text-[#ff6a63]' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  try {
    if (typeof document !== 'undefined' && document.body) {
      return createPortal(navEl, document.body);
    }
  } catch (_) {}

  return navEl;
};

export default BottomNavbar;

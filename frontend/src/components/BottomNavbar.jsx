import React from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const BottomNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const scrollToTopSmooth = () => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      if (document.documentElement) document.documentElement.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      if (document.body) document.body.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      setTimeout(() => {
        const scrollableElements = document.querySelectorAll(
          '[class*="overflow-y-auto"], [class*="overflow-y-scroll"], [class*="overflow-auto"], [class*="ios-scroll-touch"]'
        );
        scrollableElements.forEach((el) => {
          if (el && typeof el.scrollTo === 'function') el.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
        });
      }, 50);
    } catch (_) {}
  };

  const navItems = [
    {
      id: 'my-bids',
      label: t('navigation.myBets'),
      path: '/bids',
      icon: (
        <img
          src="https://res.cloudinary.com/dzd47mpdo/image/upload/v1769777192/auction_ofhpps.png"
          alt={t('navigation.myBets')}
          className="w-5 h-5 object-contain [image-rendering:-webkit-optimize-contrast]"
        />
      )
    },
    {
      id: 'funds',
      label: t('navigation.funds'),
      path: '/funds',
      icon: (
        <img
          src="https://res.cloudinary.com/dzd47mpdo/image/upload/v1769777500/funding_zjmbzp.png"
          alt={t('navigation.funds')}
          className="w-5 h-5 object-contain [image-rendering:-webkit-optimize-contrast]"
        />
      )
    },
    {
      id: 'home',
      label: t('navigation.home'),
      path: '/',
      icon: (
        <img
          src="https://res.cloudinary.com/dzd47mpdo/image/upload/v1769777716/home_pvawyw.png"
          alt={t('navigation.home')}
          className="w-5 h-5 object-contain [image-rendering:-webkit-optimize-contrast]"
        />
      ),
      isCenter: true
    },
    {
      id: 'support',
      label: t('navigation.support'),
      path: '/support',
      icon: (
        <img
          src="https://res.cloudinary.com/dnyp5jknp/image/upload/v1770900219/customer-support_1_bibfxx.png"
          alt={t('navigation.support')}
          className="w-5 h-5 object-contain [image-rendering:-webkit-optimize-contrast]"
        />
      )
    },
    {
      id: 'profile',
      label: t('navigation.profile'),
      path: '/profile',
      icon: (
        <img
          src="https://res.cloudinary.com/dnyp5jknp/image/upload/v1770900013/user_bsay8i.png"
          alt={t('navigation.profile')}
          className="w-5 h-5 object-contain [image-rendering:-webkit-optimize-contrast]"
        />
      )
    }
  ];

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const navEl = (
    <div
      id="app-bottom-nav"
      role="navigation"
      aria-label="Main navigation"
      className="app-bottom-nav-fixed md:hidden"
      style={{
        paddingBottom: 'max(0.375rem, env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(0.5rem, env(safe-area-inset-left))',
        paddingRight: 'max(0.5rem, env(safe-area-inset-right))',
      }}
    >
      {/* Backplate to prevent white background showing behind navbar */}
      <div className="absolute inset-0 bg-[#f5f5f7] dark:bg-black pointer-events-none" />
      <div className="relative bg-white dark:bg-black rounded-2xl border border-gray-200 dark:border-gray-700 shadow-[0_2px_12px_rgba(0,0,0,0.12)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.4)] flex items-end justify-around px-0.5 py-1.5 min-h-[52px]">
        {navItems.map((item) => {
          const active = isActive(item.path);
          const isCenter = item.isCenter;

          if (isCenter) {
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.path === '/' && location.pathname === '/') {
                    scrollToTopSmooth();
                    return;
                  }
                  navigate(item.path);
                  setTimeout(scrollToTopSmooth, 100);
                }}
                className="flex flex-col items-center justify-center -mt-4 relative z-10 active:scale-90 transition-transform duration-150 touch-manipulation"
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.35)] transition-all duration-200 ${
                    active
                      ? 'bg-[#f3b61b] ring-2 ring-[#f3b61b]/60 ring-offset-1 ring-offset-white dark:ring-offset-black scale-105'
                      : 'bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700'
                  }`}
                >
                  {/* Icon: white when inactive, dark when active (on yellow bg) */}
                  <div
                    className={`transition-[filter] duration-200 ${
                      active ? '[filter:brightness(0)]' : '[filter:brightness(0)_invert(1)]'
                    }`}
                  >
                    {item.icon}
                  </div>
                </div>
                <span
                  className={`text-[9px] font-bold mt-0.5 transition-colors duration-200 ${
                    active ? 'text-[#f3b61b]' : 'text-gray-600 dark:text-white'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.path === '/' && location.pathname === '/') {
                  scrollToTopSmooth();
                  return;
                }
                // Funds: go to main Funds screen (no tab) so list always shows
                if (item.path === '/funds') {
                  const alreadyOnFunds = location.pathname === '/funds';
                  navigate({ pathname: '/funds', search: '' }, { replace: alreadyOnFunds });
                  setTimeout(scrollToTopSmooth, 100);
                  return;
                }
                navigate(item.path);
                setTimeout(scrollToTopSmooth, 100);
              }}
              className="relative flex flex-col items-center justify-center gap-0.5 px-1 py-1 rounded-lg min-w-[48px] active:scale-95 transition-all duration-150 touch-manipulation"
            >
              {/* Icon: white when inactive, golden when active - same as text */}
              <div
                className={`transition-all duration-200 ${
                  active ? 'scale-105 [filter:brightness(0)_invert(0.88)_sepia(0.25)_saturate(8)_hue-rotate(5deg)]' : 'scale-100 [filter:brightness(0)_invert(1)]'
                }`}
              >
                {item.icon}
              </div>
              {/* Active indicator dot below icon */}
              <div className="h-1 w-full flex items-center justify-center">
                {active && (
                  <div className="w-1 h-1 rounded-full bg-[#f3b61b] shadow-[0_0_6px_rgba(0,0,0,0.4)] mx-auto" />
                )}
              </div>
              <span
                className={`text-[9px] font-bold transition-colors duration-200 ${
                  active ? 'text-[#f3b61b]' : 'text-gray-600 dark:text-white'
                }`}
              >
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
  } catch (_) {
    // fallback if portal fails (e.g. in some SSR or test envs)
  }
  return navEl;
};

export default BottomNavbar;

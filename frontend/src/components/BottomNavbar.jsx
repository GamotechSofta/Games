import React, { Suspense, lazy, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HiOutlineHome, HiOutlineSquares2X2 } from 'react-icons/hi2';
import { MdOutlineAccountBalanceWallet, MdOutlineReceiptLong } from 'react-icons/md';
import { HiOutlineXMark } from 'react-icons/hi2';
import aakdaLogo from '../config/logo';
import { clearUserAuth } from '../utils/auth';
import {
  DashboardIcon,
  HiHome,
  HiCurrencyDollar,
  HiUser,
  HiChatAlt2,
  HiClipboardList,
  HiCash,
  HiChartBar,
  HiLogout,
  HiChevronDown,
  HiChevronRight,
  IconCasinoFilled,
  IconSportsFilled,
} from './dashboard/dashboardIcons';

const SidebarLocaleSettings = lazy(() => import('./SidebarLocaleSettings'));

const MAIN_MENU_NAV = [
  { id: 'home', labelKey: 'navigation.home', path: '/', icon: HiHome },
  {
    id: 'casino',
    labelKey: 'sidebar.casino',
    icon: IconCasinoFilled,
    children: [
      { id: 'casino-games', labelKey: 'sidebar.casinoGames', path: '/games?category=highEarning' },
      { id: 'skills-games', labelKey: 'sidebar.skillsGames', path: '/games?category=skills' },
    ],
  },
  {
    id: 'sports',
    labelKey: 'sidebar.sports',
    icon: IconSportsFilled,
    children: [
      { id: 'starline', labelKey: 'markets.starline', path: '/startline-dashboard' },
      { id: 'king-bazaar', labelKey: 'markets.kingBazaar', path: '/king-bazaar-market' },
    ],
  },
  { id: 'markets', labelKey: 'sidebar.markets', path: '/markets', icon: HiCurrencyDollar },
];

const ACCOUNT_MENU_NAV = [
  { id: 'my-bets', labelKey: 'navigation.myBets', path: '/bids', icon: HiClipboardList },
  { id: 'funds', labelKey: 'navigation.funds', path: '/funds?tab=add-fund', icon: HiCash },
  { id: 'game-rate', labelKey: 'header.updateRate', path: '/game-rate', icon: HiChartBar },
  { id: 'logout', labelKey: 'header.logout', action: 'logout', icon: HiLogout },
];

function pathMatches(pathname, path) {
  const base = (path || '').split('?')[0];
  if (base === '/') return pathname === '/';
  return pathname === base || pathname.startsWith(`${base}/`);
}

const BottomNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState({ casino: true, sports: true });
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const syncUser = () => {
      try {
        setUser(JSON.parse(localStorage.getItem('user') || 'null'));
      } catch {
        setUser(null);
      }
    };

    syncUser();
    window.addEventListener('userLogin', syncUser);
    window.addEventListener('userLogout', syncUser);
    window.addEventListener('storage', syncUser);

    return () => {
      window.removeEventListener('userLogin', syncUser);
      window.removeEventListener('userLogout', syncUser);
      window.removeEventListener('storage', syncUser);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

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
    { id: 'support', label: t('sidebar.support', { defaultValue: 'Support' }), path: '/support', Icon: HiChatAlt2 },
    { id: 'add-funds', label: t('funds.addFund', { defaultValue: 'Add Funds' }), path: '/funds', Icon: MdOutlineAccountBalanceWallet },
    { id: 'menu', label: t('navigation.menu', { defaultValue: 'Menu' }), path: '/profile', Icon: HiOutlineSquares2X2 },
  ];

  const isActive = (item) => {
    if (item.id === 'menu') return menuOpen;
    if (item.id === 'home') {
      return location.pathname === '/' || location.pathname === '/markets';
    }
    return pathMatches(location.pathname, item.path);
  };

  const handleNavigate = (item) => {
    if (item.id === 'menu') {
      setMenuOpen(true);
      return;
    }
    if (item.id === 'home' && (location.pathname === '/' || location.pathname === '/markets')) {
      scrollToTopSmooth();
      return;
    }
    navigate(item.path);
    setTimeout(scrollToTopSmooth, 100);
  };

  const handleDrawerNavigate = (path) => {
    setMenuOpen(false);
    navigate(path);
    setTimeout(scrollToTopSmooth, 100);
  };

  const handleLogout = () => {
    setMenuOpen(false);
    clearUserAuth();
  };

  const renderDrawerRow = (item, { isChild = false } = {}) => {
    const active = item.path ? pathMatches(location.pathname, item.path) : item.children?.some((child) => pathMatches(location.pathname, child.path));
    const Icon = item.icon;
    const hasChildren = Boolean(item.children?.length);
    const open = openMenus[item.id];

    return (
      <div key={item.id} className="w-full">
        <button
          type="button"
          onClick={() => {
            if (hasChildren) {
              setOpenMenus((prev) => ({ ...prev, [item.id]: !prev[item.id] }));
              return;
            }
            if (item.action === 'logout') {
              handleLogout();
              return;
            }
            if (item.path) handleDrawerNavigate(item.path);
          }}
          className={[
            'flex w-full items-center rounded-xl text-left transition-colors',
            isChild ? 'gap-3 px-3 py-2.5 text-[13px]' : 'gap-3 px-3 py-3',
            active
              ? 'bg-gray-100 text-[#d32f2f] dark:bg-[#26272b] dark:text-[#ff6a63]'
              : 'text-gray-700 hover:bg-gray-50 dark:text-white dark:hover:bg-white/[0.04]',
          ].join(' ')}
        >
          {Icon ? (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-[#2a2a2a] dark:text-white">
              <DashboardIcon Icon={Icon} active={active} size="nav" className={active ? 'dark:text-[#ff6a63]' : 'dark:text-white'} />
            </span>
          ) : (
            <span className="h-2 w-2 shrink-0 rounded-full bg-current opacity-70" />
          )}
          <span className="min-w-0 flex-1 truncate font-semibold">
            {t(item.labelKey)}
          </span>
          {hasChildren && (
            <HiChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
          )}
          {!hasChildren && !isChild && item.path && (
            <HiChevronRight className="h-4 w-4 shrink-0 opacity-60" />
          )}
        </button>
        {hasChildren && open && (
          <div className="mt-1 flex flex-col gap-1 pl-4">
            {item.children.map((child) =>
              renderDrawerRow(child, { isChild: true }),
            )}
          </div>
        )}
      </div>
    );
  };

  const navEl = (
    <>
      <>
        <button
          type="button"
          className={`fixed inset-0 z-[10010] bg-black/45 transition-opacity duration-300 md:hidden ${menuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
          aria-label={t('common.close', { defaultValue: 'Close' })}
          onClick={() => setMenuOpen(false)}
        />
        <aside
          aria-hidden={!menuOpen}
          className={`fixed inset-y-0 right-0 z-[10020] flex w-[min(86vw,360px)] max-w-full flex-col border-l border-gray-200/80 bg-white text-gray-900 transition-transform duration-300 ease-out will-change-transform dark:border-white/10 dark:bg-[#16171a] dark:text-white md:hidden ${
            menuOpen
              ? 'translate-x-0 shadow-[-18px_0_44px_rgba(0,0,0,0.24)]'
              : 'pointer-events-none translate-x-full shadow-none'
          }`}
          style={{
            paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))',
            paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
            paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0px))',
            paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))',
          }}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200/80 bg-white px-3 pb-4 dark:border-white/[0.08] dark:bg-[#16171a]">
            <img src={aakdaLogo} alt="Aakda" className="h-9 w-auto object-contain" />
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 transition-colors hover:bg-gray-100 dark:border-white/[0.08] dark:bg-[#1f2024] dark:text-white dark:hover:bg-[#2b2c31]"
              aria-label={t('common.close', { defaultValue: 'Close' })}
            >
              <HiOutlineXMark className="h-5 w-5" />
            </button>
          </div>

          <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4 pt-4">
            <div className="mb-3 rounded-xl border border-gray-200 bg-white px-3 py-3 dark:border-white/10 dark:bg-[#1f2024]">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-700 dark:bg-[#2d2f35] dark:text-white">
                  {user ? (
                    <span className="text-sm font-semibold">
                      {(user.username || 'U').charAt(0).toUpperCase()}
                    </span>
                  ) : (
                    <HiUser className="h-5 w-5" />
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                  {user ? user.username || t('sidebar.defaultUser') : t('sidebar.logIn')}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center rounded-lg bg-[#e60000] px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#cc0000]"
                >
                  {t('header.logout', { defaultValue: 'Logout' })}
                </button>
              </div>

              <div className="mt-3">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-white/45">
                  {t('settings.preferences', { defaultValue: 'Preferences' })}
                </div>
                <Suspense fallback={null}>
                  <SidebarLocaleSettings collapsed={false} horizontal />
                </Suspense>
              </div>
            </div>

            <div>
              <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-white/45">
                {t('navigation.menu', { defaultValue: 'Menu' })}
              </div>
              <div className="flex flex-col gap-1">
                {MAIN_MENU_NAV.map((item) => renderDrawerRow(item))}
              </div>

              <div className="mt-4 border-t border-gray-200/80 pt-4 dark:border-white/[0.08]">
                <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-white/45">
                  {t('sidebar.account', { defaultValue: 'Account' })}
                </div>
                <div className="flex flex-col gap-1">
                  {ACCOUNT_MENU_NAV.map((item) => renderDrawerRow(item))}
                </div>
              </div>

              <div className="mt-4 border-t border-gray-200/80 pt-4 dark:border-white/[0.08]">
                <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-white/45">
                  {t('common.more', { defaultValue: 'More' })}
                </div>
                {renderDrawerRow({
                  id: 'support',
                  labelKey: 'sidebar.support',
                  path: '/support',
                  icon: HiChatAlt2,
                })}

              </div>
            </div>
          </div>
        </aside>
      </>

      <div
        id="app-bottom-nav"
        role="navigation"
        aria-label="Main navigation"
        aria-hidden={menuOpen}
        className={`app-bottom-nav-fixed md:hidden transition-opacity duration-200 ${menuOpen ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="absolute inset-0 bg-[#f5f5f7] dark:bg-[#141415] pointer-events-none" />
        <div className="relative flex items-end justify-between border-t border-gray-200 bg-white px-[max(0.35rem,env(safe-area-inset-left,0px))] py-2 shadow-[0_-8px_16px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-[#101010] dark:shadow-[0_-10px_24px_rgba(0,0,0,0.28)]">
          {navItems.map((item) => {
            const active = isActive(item);
            const Icon = item.Icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item)}
                className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 transition active:scale-[0.97] ${
                  active
                    ? 'text-[#d32f2f] dark:text-[#ff6a63]'
                    : 'text-gray-500 dark:text-white/65'
                }`}
              >
                <span
                  className={`absolute left-1/2 top-0 h-[2px] w-6 -translate-x-1/2 rounded-full transition-opacity ${
                    active ? 'bg-[#d32f2f] opacity-100 dark:bg-[#ff6a63]' : 'opacity-0'
                  }`}
                  aria-hidden
                />
                <Icon className="h-5 w-5" />
                <span className={`text-[10px] font-semibold ${active ? 'text-[#e53935] dark:text-[#ff6a63]' : ''}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );

  try {
    if (typeof document !== 'undefined' && document.body) {
      return createPortal(navEl, document.body);
    }
  } catch (_) {}

  return navEl;
};

export default BottomNavbar;

import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { clearUserAuth } from '../utils/auth';
import SidebarLocaleSettings from './SidebarLocaleSettings';
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
  HiChevronRight,
  HiChevronDown,
  HiChevronLeft,
  IconCasinoFilled,
  IconSportsFilled,
  iconColorClass,
} from './dashboard/dashboardIcons';

const COLLAPSED_W = 72;
const EXPANDED_W = 240;

const BETS_SECTION_PATHS = [
  '/bids',
  '/bet-history',
  '/starline-bet-history',
  '/king-bazaar-bet-history',
  '/market-result-history',
];

const MAIN_NAV = [
  {
    id: 'home',
    labelKey: 'navigation.home',
    path: '/',
    icon: HiHome,
  },
  {
    id: 'casino',
    labelKey: 'sidebar.casino',
    icon: IconCasinoFilled,
    children: [
      { labelKey: 'sidebar.casinoGames', path: '/games?category=highEarning' },
      { labelKey: 'sidebar.skillsGames', path: '/games?category=skills' },
    ],
  },
  {
    id: 'sports',
    labelKey: 'sidebar.sports',
    icon: IconSportsFilled,
    children: [
      { labelKey: 'markets.starline', path: '/startline-dashboard' },
      { labelKey: 'markets.kingBazaar', path: '/king-bazaar-market' },
    ],
  },
  {
    id: 'markets',
    labelKey: 'sidebar.markets',
    path: '/markets',
    icon: HiCurrencyDollar,
  },
];

const ACCOUNT_NAV = [
  { id: 'myBets', labelKey: 'navigation.myBets', path: '/bids', icon: HiClipboardList },
  { id: 'funds', labelKey: 'navigation.funds', path: '/funds', icon: HiCash },
  { id: 'gameRate', labelKey: 'header.updateRate', path: '/game-rate', icon: HiChartBar },
  { id: 'logout', labelKey: 'header.logout', action: 'logout', icon: HiLogout },
];

function pathMatches(pathname, path) {
  const base = (path || '').split('?')[0];
  if (base === '/') return pathname === '/';
  return pathname === base || pathname.startsWith(`${base}/`);
}

function NavRow({
  collapsed,
  active,
  label,
  icon: Icon,
  letter,
  badge,
  hasChildren,
  open,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={[
        'group flex w-full items-center rounded-[12px] transition-all duration-[250ms]',
        collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5',
        active
          ? 'bg-gray-100 text-gray-900 dark:bg-white/[0.08] dark:text-white'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-white dark:hover:bg-white/[0.04] dark:hover:text-white',
      ].join(' ')}
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center">
        {letter ? (
          <span className="text-[17px] font-semibold italic leading-none text-gray-500 dark:text-[#b0b0b0]">{letter}</span>
        ) : (
          <DashboardIcon Icon={Icon} active={active} />
        )}
      </span>
      {!collapsed && (
        <>
          <span className="dashboard-nav-label flex-1 truncate text-left text-gray-800 dark:text-white">
            {label}
          </span>
          {badge != null && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#f97316] px-1.5 text-[11px] font-semibold text-gray-900 dark:text-white">
              {badge}
            </span>
          )}
          {hasChildren && (
            <HiChevronDown
              className={`h-4 w-4 shrink-0 transition-transform duration-[250ms] ${iconColorClass(false)} ${
                open ? 'rotate-180' : ''
              }`}
            />
          )}
        </>
      )}
    </button>
  );
}

export default function DesktopSidebar({ collapsed, onToggleCollapse }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [openMenus, setOpenMenus] = useState({ casino: true, sports: false });
  const [hoveredFlyoutId, setHoveredFlyoutId] = useState(null);

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const sync = () => {
      try {
        setUser(JSON.parse(localStorage.getItem('user') || 'null'));
      } catch {
        setUser(null);
      }
    };
    sync();
    window.addEventListener('userLogin', sync);
    window.addEventListener('userLogout', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('userLogin', sync);
      window.removeEventListener('userLogout', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const width = collapsed ? COLLAPSED_W : EXPANDED_W;

  const toggleMenu = (id) => {
    setOpenMenus((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const go = (path) => navigate(path);

  const isItemActive = (item) => {
    if (item.path) return pathMatches(location.pathname, item.path);
    if (item.children) {
      return item.children.some((c) => pathMatches(location.pathname, c.path));
    }
    return false;
  };

  return (
    <div
      className="relative z-40 hidden h-full min-h-0 shrink-0 overflow-visible transition-[width] duration-300 ease-in-out md:flex"
      style={{ width }}
    >
      {/* Collapse — sits above main content (hero) */}
      <button
        type="button"
        onClick={onToggleCollapse}
        className="absolute -right-3 top-6 z-50 flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-lg transition-all duration-[250ms] hover:border-gray-300 hover:text-gray-800 dark:border-white/[0.08] dark:bg-[#1d1e20] dark:text-white/50 dark:hover:border-white/[0.14] dark:hover:text-white/90"
        aria-label={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
      >
        <HiChevronLeft
          className={`h-3.5 w-3.5 transition-transform duration-[250ms] ${iconColorClass(false)} ${collapsed ? 'rotate-180' : ''}`}
        />
      </button>

    <aside
      className="relative flex h-full w-full flex-col overflow-visible border-r border-gray-200 bg-white font-sans transition-[width] duration-300 ease-in-out dark:border-white/[0.06] dark:bg-[#1d1e20]"
      aria-label={t('sidebar.expand')}
    >
      <div className="flex min-h-0 flex-1 flex-col px-2">
        {/* Scrollable: profile, promo, main nav */}
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden scrollbar-hidden py-3">
        {/* Log in */}
        <button
          type="button"
          onClick={() => go(user ? '/profile' : '/login')}
          className={[
            'mb-3 flex w-full items-center rounded-[14px] transition-all duration-[250ms] hover:bg-gray-50 dark:hover:bg-white/[0.04]',
            collapsed ? 'justify-center p-2' : 'gap-3 px-2 py-2',
          ].join(' ')}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 dark:bg-[#2a2a2a] dark:text-white/60">
            {user ? (
              <span className="text-sm font-semibold text-gray-900 dark:text-white/90">
                {(user.username || 'U').charAt(0).toUpperCase()}
              </span>
            ) : (
              <HiUser className="h-5 w-5 text-[#b0b0b0]" />
            )}
          </span>
          {!collapsed && (
            <>
              <span className="dashboard-nav-label flex-1 truncate text-left text-[15px] text-gray-900 dark:text-white">
                {user ? user.username || t('sidebar.defaultUser') : t('sidebar.logIn')}
              </span>
              <HiChevronRight className={`h-4 w-4 shrink-0 ${iconColorClass(false)}`} />
            </>
          )}
        </button>

        {/* Main nav */}
        <nav className="flex flex-col gap-0.5">
          {MAIN_NAV.map((item) => {
            const active = isItemActive(item);
            const open = openMenus[item.id];
            const hasChildren = Boolean(item.children?.length);
            const Icon = item.icon;

            const showCollapsedFlyout =
              collapsed && hasChildren && hoveredFlyoutId === item.id;

            return (
              <div
                key={item.id}
                className="relative"
                onMouseEnter={() => {
                  if (collapsed && hasChildren) setHoveredFlyoutId(item.id);
                }}
                onMouseLeave={() => {
                  if (collapsed) setHoveredFlyoutId(null);
                }}
              >
                <NavRow
                  collapsed={collapsed}
                  active={active}
                  label={t(item.labelKey)}
                  icon={Icon}
                  letter={item.letter}
                  badge={item.badge}
                  hasChildren={hasChildren && !collapsed}
                  open={open}
                  onClick={() => {
                    if (hasChildren && !collapsed) {
                      toggleMenu(item.id);
                      return;
                    }
                    if (item.path) go(item.path);
                    else if (item.children?.[0]) go(item.children[0].path);
                  }}
                />
                {hasChildren && open && !collapsed && (
                  <div className="mb-1 ml-9 flex flex-col gap-0.5 border-l border-gray-200 pl-2 dark:border-white/[0.06]">
                    {item.children.map((child) => (
                      <button
                        key={child.path}
                        type="button"
                        onClick={() => go(child.path)}
                        className={[
                          'dashboard-nav-label-sm rounded-[10px] px-2 py-1.5 text-left transition-all duration-[250ms]',
                          pathMatches(location.pathname, child.path)
                            ? 'bg-gray-100 font-medium text-gray-900 dark:bg-white/[0.06] dark:text-white'
                            : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50 dark:text-white dark:hover:text-white dark:hover:bg-white/[0.04]',
                        ].join(' ')}
                      >
                        {t(child.labelKey)}
                      </button>
                    ))}
                  </div>
                )}
                {showCollapsedFlyout && (
                  <div
                    className="absolute left-full top-0 z-[120] ml-1 min-w-[200px] pl-1"
                    role="menu"
                    aria-label={t(item.labelKey)}
                  >
                    <div className="rounded-xl border border-gray-200 bg-white py-1.5 shadow-lg dark:border-white/[0.08] dark:bg-[#1d1e20] dark:shadow-[0_12px_40px_rgba(0,0,0,0.55)]">
                      <p className="dashboard-nav-label-sm border-b border-gray-100 px-3 py-2 text-gray-500 dark:border-white/[0.06] dark:text-white">
                        {t(item.labelKey)}
                      </p>
                      {item.children.map((child) => (
                        <button
                          key={child.path}
                          type="button"
                          role="menuitem"
                          onClick={() => go(child.path)}
                          className={[
                            'dashboard-nav-label-sm block w-full rounded-lg px-3 py-2 text-left transition-all duration-[200ms]',
                            pathMatches(location.pathname, child.path)
                              ? 'bg-gray-100 font-medium text-gray-900 dark:bg-white/[0.08] dark:text-white'
                              : 'text-gray-600 hover:bg-gray-50 dark:text-white dark:hover:bg-white/[0.05] dark:hover:text-white',
                          ].join(' ')}
                        >
                          {t(child.labelKey)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <nav className="mt-3 flex flex-col gap-0.5 border-t border-gray-200 pt-3 dark:border-white/[0.06]">
          {ACCOUNT_NAV.map((item) => {
            const active =
              item.id === 'myBets'
                ? BETS_SECTION_PATHS.some((p) => pathMatches(location.pathname, p))
                : item.path
                  ? pathMatches(location.pathname, item.path)
                  : false;
            const Icon = item.icon;
            const isLogout = item.action === 'logout';

            return (
              <NavRow
                key={item.id}
                collapsed={collapsed}
                active={active}
                label={t(item.labelKey)}
                icon={Icon}
                onClick={() => {
                  if (isLogout) {
                    clearUserAuth();
                    return;
                  }
                  if (item.path) go(item.path);
                }}
              />
            );
          })}
        </nav>
        </div>

        {/* Sticky bottom: locale and support */}
        <div className="flex shrink-0 flex-col gap-3 bg-gray-50 px-1 py-3 dark:bg-[#1d1e20]">
          <SidebarLocaleSettings collapsed={collapsed} />
          <div className="border-t border-gray-200 pt-3 flex flex-col gap-3 dark:border-white/[0.06]">
          {/* Support 24/7 */}
          <button
            type="button"
            onClick={() => go('/support')}
            className={[
              'flex w-full items-center rounded-[12px] transition-all duration-[250ms] hover:bg-gray-50 dark:hover:bg-white/[0.04]',
              collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5',
              pathMatches(location.pathname, '/support')
                ? 'bg-gray-100 dark:bg-white/[0.08]'
                : 'text-gray-600 dark:text-white',
            ].join(' ')}
          >
            <DashboardIcon
              Icon={HiChatAlt2}
              active={pathMatches(location.pathname, '/support')}
            />
            {!collapsed && (
              <>
                <span className="dashboard-nav-label flex-1 truncate text-left text-gray-800 dark:text-white">
                  {t('sidebar.support')}
                </span>
                <span className="shrink-0 rounded-full bg-[#2563eb] px-2 py-0.5 text-[11px] font-semibold text-gray-900 dark:text-white">
                  24/7
                </span>
              </>
            )}
          </button>
          </div>
        </div>
      </div>
    </aside>
    </div>
  );
}

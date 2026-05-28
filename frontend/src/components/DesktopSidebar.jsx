import React, { memo, useCallback, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { clearUserAuth } from '../utils/auth';
import SidebarLocaleSettings from './SidebarLocaleSettings';
import {
  DashboardIcon,
  HiHome,
  HiCurrencyDollar,
  HiChatAlt2,
  HiClipboardList,
  HiCash,
  HiChartBar,
  HiLogout,
  HiChevronDown,
  IconCasinoFilled,
  IconStarlineFilled,
  IconKingBazaarFilled,
  iconColorClass,
} from './dashboard/dashboardIcons';

export const SIDEBAR_COLLAPSED_W = 72;
export const SIDEBAR_EXPANDED_W = 200;

const COLLAPSED_W = SIDEBAR_COLLAPSED_W;
const EXPANDED_W = SIDEBAR_EXPANDED_W;

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
    id: 'starline',
    labelKey: 'markets.starline',
    path: '/startline-dashboard',
    icon: IconStarlineFilled,
  },
  {
    id: 'king-bazaar',
    labelKey: 'markets.kingBazaar',
    path: '/king-bazaar-market',
    icon: IconKingBazaarFilled,
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
        'group relative flex w-full items-center overflow-visible rounded-[10px] transition-colors duration-150',
        collapsed ? 'flex-col justify-center gap-1 px-1 py-2 text-center' : 'gap-2.5 px-2.5 py-2',
        active
          ? 'text-gray-900 dark:text-white'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-white dark:hover:bg-white/[0.04] dark:hover:text-white',
      ].join(' ')}
    >
      {active ? (
        <>
          <span className="pointer-events-none absolute left-0 right-0 top-0 h-px bg-[linear-gradient(90deg,rgba(230,0,0,1)_0%,rgba(230,0,0,0.45)_45%,rgba(230,0,0,0)_100%)]" />
          <span className="pointer-events-none absolute left-0 right-0 bottom-0 h-px bg-[linear-gradient(90deg,rgba(230,0,0,1)_0%,rgba(230,0,0,0.45)_45%,rgba(230,0,0,0)_100%)]" />
        </>
      ) : null}
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
        {letter ? (
          <span className="text-[15px] font-semibold italic leading-none text-gray-500 dark:text-[#b0b0b0]">{letter}</span>
        ) : (
          <DashboardIcon Icon={Icon} active={active} size="sm" />
        )}
      </span>
      {collapsed && (
        <span className="dashboard-nav-label-sm max-w-[60px] whitespace-normal break-words text-center text-[9px] leading-[1.1] text-gray-700 dark:text-white/88">
          {label}
        </span>
      )}
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

function DesktopSidebar({ collapsed }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [openMenus, setOpenMenus] = useState({ casino: true });
  const [hoveredFlyoutId, setHoveredFlyoutId] = useState(null);
  const [flyoutAnchor, setFlyoutAnchor] = useState(null);

  const width = collapsed ? COLLAPSED_W : EXPANDED_W;

  const showFlyoutFor = useCallback(
    (id, el) => {
      if (!collapsed || !el) return;
      const rect = el.getBoundingClientRect();
      setFlyoutAnchor({ id, top: rect.top, left: rect.right + 4 });
      setHoveredFlyoutId(id);
    },
    [collapsed],
  );

  const hideFlyout = useCallback(() => {
    setHoveredFlyoutId(null);
    setFlyoutAnchor(null);
  }, []);

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
      className="sidebar-width-shell relative z-40 hidden h-full min-h-0 shrink-0 overflow-hidden md:flex"
      style={{ width }}
    >
      <aside
        className="relative flex h-full flex-col border-r border-gray-200 bg-white font-sans dark:border-white/[0.06] dark:bg-[#1d1e20]"
        style={{ width: EXPANDED_W }}
        aria-label={t('sidebar.expand')}
      >
        <div className="flex min-h-0 flex-1 flex-col px-1.5">
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden scrollbar-hidden py-2">
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
                onMouseEnter={(e) => {
                  if (collapsed && hasChildren) showFlyoutFor(item.id, e.currentTarget);
                }}
                onMouseLeave={() => {
                  if (collapsed) hideFlyout();
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
                  <div className="mb-1 ml-7 flex flex-col gap-0.5 border-l border-gray-200 pl-1.5 dark:border-white/[0.06]">
                    {item.children.map((child) => (
                      <button
                        key={child.path}
                        type="button"
                        onClick={() => go(child.path)}
                        className={[
                          'dashboard-nav-label-sm rounded-[10px] px-2 py-1.5 text-left transition-colors duration-150',
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
                {showCollapsedFlyout && flyoutAnchor?.id === item.id && (
                  <div
                    className="fixed z-[120] min-w-[200px]"
                    style={{ top: flyoutAnchor.top, left: flyoutAnchor.left }}
                    role="menu"
                    aria-label={t(item.labelKey)}
                    onMouseEnter={() => setHoveredFlyoutId(item.id)}
                    onMouseLeave={hideFlyout}
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
                            'dashboard-nav-label-sm block w-full rounded-lg px-3 py-2 text-left transition-colors duration-150',
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

        <nav className="mt-2 flex flex-col gap-0.5 border-t border-gray-200 pt-2 dark:border-white/[0.06]">
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
        <div className="relative flex shrink-0 flex-col gap-2 bg-gray-50 px-0.5 py-2 dark:bg-[#1d1e20]">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-10 h-10 bg-[linear-gradient(180deg,rgba(249,250,251,0),rgba(243,244,246,0.92)_52%,#f9fafb_100%)] dark:bg-[linear-gradient(180deg,rgba(29,30,32,0),rgba(26,27,29,0.88)_52%,#1d1e20_100%)]"
          />
          <SidebarLocaleSettings collapsed={collapsed} />
          <div className="flex flex-col gap-2 border-t border-gray-200 pt-2 dark:border-white/[0.06]">
          {/* Support 24/7 */}
          <button
            type="button"
            onClick={() => go('/support')}
            className={[
              'flex w-full items-center rounded-[12px] transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-white/[0.04]',
              collapsed ? 'flex-col justify-center gap-1 px-1 py-2 text-center' : 'gap-2.5 px-2.5 py-2',
              pathMatches(location.pathname, '/support')
                ? 'bg-gray-100 dark:bg-white/[0.08]'
                : 'text-gray-600 dark:text-white',
            ].join(' ')}
          >
            <DashboardIcon
              Icon={HiChatAlt2}
              active={pathMatches(location.pathname, '/support')}
              size="sm"
            />
            {collapsed && (
              <span className="dashboard-nav-label-sm max-w-[60px] whitespace-normal break-words text-center text-[9px] leading-[1.1] text-gray-700 dark:text-white/88">
                {t('sidebar.support')}
              </span>
            )}
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

export default memo(DesktopSidebar);

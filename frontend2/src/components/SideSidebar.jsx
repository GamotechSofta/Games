import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Home,
  Dices,
  Trophy,
  Wallet,
  Gift,
  Sparkles,
  Headphones,
  Settings,
  Globe,
  Sun,
  Moon,
  Bell,
  User,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronsLeft,
  ChevronsRight,
  MessageCircle,
  Send,
  Link2,
} from 'lucide-react';
import { useSidebar } from '../context/SidebarContext';
import { getCurrentUser } from '../session/userSession';

const SIDEBAR_COLLAPSED = 72;
const SIDEBAR_EXPANDED = 240;
const LAYOUT_GUTTER = 20;

/** Shared motion for panel + page offset */
const SIDEBAR_TRANSITION = {
  type: 'spring',
  stiffness: 280,
  damping: 30,
  mass: 0.9,
};

const MAIN_NAV = [
  { id: 'home', label: 'Home', path: '/', icon: Home },
  { id: 'casino', label: 'Casino', path: '/games', icon: Dices },
  { id: 'sports', label: 'Sports', path: '/lottery', icon: Trophy },
  { id: 'wallet', label: 'Wallet', path: '/funds', icon: Wallet },
  { id: 'promotions', label: 'Promotions', path: '/funds?tab=add-fund', icon: Gift },
  { id: 'rewards', label: 'Rewards', path: '/top-winners', icon: Sparkles },
  { id: 'support', label: 'Support', path: '/support', icon: Headphones },
];

const SOCIAL = [
  { id: 'telegram', label: 'Telegram', href: 'https://t.me/', icon: Send },
  { id: 'chat', label: 'Community', href: 'https://t.me/', icon: MessageCircle },
  { id: 'link', label: 'Links', href: '/', icon: Link2 },
];

function isPathActive(pathname, path) {
  const base = path.split('?')[0];
  if (base === '/') return pathname === '/';
  return pathname === base || pathname.startsWith(`${base}/`);
}

function NavItem({ item, active, expanded, onClick }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      title={!expanded ? item.label : undefined}
      className={[
        'group relative flex w-full items-center rounded-[14px] transition-colors duration-200',
        expanded ? 'gap-3 px-3 py-2.5' : 'justify-center p-2.5',
        active ? 'text-white' : 'text-white/65 hover:text-white/90',
      ].join(' ')}
    >
      {active && (
        <span
          className="absolute inset-0 rounded-[14px] border border-white/[0.08] bg-[#1B2230]/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
          style={{
            boxShadow:
              'inset 0 1px 0 rgba(255,255,255,0.06), 0 0 24px rgba(59,130,246,0.12)',
          }}
        />
      )}
      <span
        className={[
          'relative z-[1] flex shrink-0 items-center justify-center rounded-[12px] transition-colors duration-200',
          expanded ? 'h-9 w-9' : 'h-10 w-10',
          active
            ? 'bg-[rgba(59,130,246,0.22)] text-white'
            : 'bg-transparent group-hover:bg-white/[0.04]',
        ].join(' ')}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
      </span>
      <span
        className={[
          'relative z-[1] overflow-hidden whitespace-nowrap text-[13px] font-medium tracking-[-0.01em] text-white/90 transition-[max-width,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          expanded ? 'max-w-[160px] opacity-100' : 'max-w-0 opacity-0',
        ].join(' ')}
      >
        {item.label}
      </span>
    </button>
  );
}

function SidebarPanel({ expanded, onNavigate, onCloseMobile }) {
  const { pathname } = useLocation();
  const { toggleExpanded, toggleTheme, theme } = useSidebar();
  const user = getCurrentUser();
  const avatarInitial = (user?.username || 'U').charAt(0).toUpperCase();

  const go = (path) => {
    onNavigate(path);
    onCloseMobile?.();
  };

  const fadeBlock = (show, children, className = '') => (
    <div
      className={[
        'overflow-hidden transition-[max-height,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
        show ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );

  return (
    <div className="flex h-full min-h-0 w-full flex-col font-[family-name:var(--font-sans)]">
      <div
        className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden scrollbar-hidden ${
          expanded ? 'px-3' : 'px-2'
        }`}
      >
        <div className={`flex flex-col gap-3 ${expanded ? 'pt-3' : 'items-center pt-3'}`}>
          <button
            type="button"
            onClick={() => go(user ? '/profile' : '/login')}
            className={[
              'flex items-center rounded-[18px] border border-white/[0.06] bg-white/[0.03] transition-colors duration-200 hover:bg-white/[0.06]',
              expanded ? 'w-full gap-3 p-2.5' : 'h-11 w-11 justify-center',
            ].join(' ')}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-[#161B22] text-sm font-semibold text-white/90 ring-1 ring-white/[0.06]">
              {user ? avatarInitial : <User className="h-4 w-4" strokeWidth={1.75} />}
            </span>
            {fadeBlock(
              expanded,
              <div className="min-w-0 text-left">
                <p className="truncate text-[13px] font-medium text-white/90">
                  {user?.username || 'Guest'}
                </p>
                <p className="truncate text-[11px] text-white/45">View profile</p>
              </div>,
            )}
          </button>

          <button
            type="button"
            onClick={() => go('/')}
            className={[
              'flex items-center rounded-[18px] transition-colors duration-200 hover:bg-white/[0.04]',
              expanded ? 'w-full gap-3 px-2.5 py-2' : 'h-11 w-11 justify-center',
            ].join(' ')}
            title="SHRI BALAJI"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-[#1B2230] ring-1 ring-white/[0.08]">
              <span className="text-[11px] font-bold tracking-tight text-white/90">SB</span>
            </span>
            {fadeBlock(
              expanded,
              <span className="truncate text-[13px] font-semibold tracking-tight text-white/90">
                SHRI BALAJI
              </span>,
            )}
          </button>

          <div className="h-px w-full bg-white/[0.06]" />
        </div>

        <nav
          className={`flex flex-col gap-1.5 pb-2 ${expanded ? 'py-2' : 'items-center py-2'}`}
        >
          {MAIN_NAV.map((item) => (
            <NavItem
              key={item.id}
              item={item}
              expanded={expanded}
              active={isPathActive(pathname, item.path)}
              onClick={() => go(item.path)}
            />
          ))}
        </nav>
      </div>

      <div
        className={`shrink-0 flex flex-col gap-1.5 border-t border-white/[0.06] bg-[#11161F] ${
          expanded ? 'px-3 py-3' : 'items-center px-2 py-3'
        }`}
      >
        <NavItem
          item={{ id: 'settings', label: 'Settings', path: '/profile', icon: Settings }}
          expanded={expanded}
          active={isPathActive(pathname, '/profile')}
          onClick={() => go('/profile')}
        />

        <button
          type="button"
          title="Language"
          className={[
            'flex w-full items-center rounded-[14px] text-white/65 transition-colors duration-200 hover:bg-white/[0.04] hover:text-white/90',
            expanded ? 'gap-3 px-3 py-2.5' : 'justify-center p-2.5',
          ].join(' ')}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px]">
            <Globe className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </span>
          <span
            className={[
              'overflow-hidden whitespace-nowrap text-[13px] font-medium transition-[max-width,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
              expanded ? 'max-w-[120px] opacity-100' : 'max-w-0 opacity-0',
            ].join(' ')}
          >
            English
          </span>
        </button>

        <button
          type="button"
          onClick={toggleTheme}
          title="Toggle theme"
          className={[
            'flex w-full items-center rounded-[14px] text-white/65 transition-colors duration-200 hover:bg-white/[0.04] hover:text-white/90',
            expanded ? 'gap-3 px-3 py-2.5' : 'justify-center p-2.5',
          ].join(' ')}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px]">
            {theme === 'dark' ? (
              <Sun className="h-[18px] w-[18px]" strokeWidth={1.75} />
            ) : (
              <Moon className="h-[18px] w-[18px]" strokeWidth={1.75} />
            )}
          </span>
          <span
            className={[
              'overflow-hidden whitespace-nowrap text-[13px] font-medium transition-[max-width,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
              expanded ? 'max-w-[120px] opacity-100' : 'max-w-0 opacity-0',
            ].join(' ')}
          >
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </span>
        </button>

        <div
          className={[
            'rounded-[16px] border border-white/[0.06] bg-white/[0.02] p-2 transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
            expanded ? 'w-full' : 'w-[52px]',
          ].join(' ')}
        >
          <div
            className={`grid gap-1 transition-[grid-template-columns] duration-300 ${expanded ? 'grid-cols-4' : 'grid-cols-2'}`}
          >
            {SOCIAL.map(({ id, href, icon: Icon, label }) => (
              <a
                key={id}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                title={label}
                className="flex h-8 w-8 items-center justify-center rounded-[10px] text-white/50 transition-colors duration-200 hover:bg-white/[0.05] hover:text-white/85"
              >
                <Icon className="h-4 w-4" strokeWidth={1.75} />
              </a>
            ))}
            <button
              type="button"
              onClick={() => go('/profile')}
              title="Notifications"
              className="relative flex h-8 w-8 items-center justify-center rounded-[10px] text-white/50 transition-colors duration-200 hover:bg-white/[0.05] hover:text-white/85"
            >
              <Bell className="h-4 w-4" strokeWidth={1.75} />
              <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[#3B82F6]" />
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleExpanded}
          title={expanded ? 'Collapse' : 'Expand'}
          className={[
            'mt-1 flex w-full items-center rounded-[14px] text-white/40 transition-colors duration-200 hover:bg-white/[0.04] hover:text-white/70',
            expanded ? 'gap-3 px-3 py-2' : 'justify-center p-2',
          ].join(' ')}
        >
          {expanded ? (
            <PanelLeftClose className="h-[18px] w-[18px]" strokeWidth={1.75} />
          ) : (
            <PanelLeftOpen className="h-[18px] w-[18px]" strokeWidth={1.75} />
          )}
          <span
            className={[
              'overflow-hidden whitespace-nowrap text-[12px] font-medium transition-[max-width,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
              expanded ? 'max-w-[80px] opacity-100' : 'max-w-0 opacity-0',
            ].join(' ')}
          >
            Collapse
          </span>
        </button>
      </div>
    </div>
  );
}

function SidebarShell({ expanded, onNavigate, onCloseMobile }) {
  return (
    <aside
      className="relative flex h-full w-full flex-col overflow-hidden rounded-[20px] border border-white/[0.06] bg-[#11161F]/80 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-xl backdrop-saturate-150"
      style={{
        background:
          'linear-gradient(165deg, rgba(17,22,31,0.92) 0%, rgba(11,15,20,0.88) 100%)',
        boxShadow:
          '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
      aria-label="Main navigation"
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-[20px] opacity-60"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(59,130,246,0.06) 0%, transparent 70%)',
        }}
      />
      <div className="relative flex h-full min-h-0 w-full flex-col">
        <SidebarPanel expanded={expanded} onNavigate={onNavigate} onCloseMobile={onCloseMobile} />
      </div>
    </aside>
  );
}

const SideSidebar = () => {
  const navigate = useNavigate();
  const { expanded, isWide, mobileOpen, closeMobile, toggleExpanded } = useSidebar();

  const panelWidth = isWide ? SIDEBAR_EXPANDED : SIDEBAR_COLLAPSED;
  const layoutOffset = panelWidth + LAYOUT_GUTTER * 2;

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', `${layoutOffset}px`);
    document.documentElement.style.setProperty('--sidebar-panel-width', `${panelWidth}px`);
  }, [layoutOffset, panelWidth]);

  const handleNavigate = (path) => navigate(path);

  return (
    <>
      <motion.div
        className="fixed z-[60] hidden md:flex"
        initial={false}
        animate={{ width: panelWidth }}
        transition={SIDEBAR_TRANSITION}
        style={{
          left: LAYOUT_GUTTER,
          top: LAYOUT_GUTTER,
          bottom: LAYOUT_GUTTER,
        }}
      >
        <motion.button
          type="button"
          onClick={toggleExpanded}
          layout
          transition={SIDEBAR_TRANSITION}
          className="absolute -right-3 top-28 z-[70] flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.08] bg-[#1a1f27] text-white/60 shadow-lg transition-colors duration-200 hover:border-white/[0.14] hover:text-white/90"
          aria-label={isWide ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {isWide ? (
            <ChevronsLeft className="h-3.5 w-3.5" strokeWidth={2} />
          ) : (
            <ChevronsRight className="h-3.5 w-3.5" strokeWidth={2} />
          )}
        </motion.button>
        <SidebarShell expanded={isWide} onNavigate={handleNavigate} />
      </motion.div>

      {createPortal(
        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.button
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
                className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-[2px] md:hidden"
                onClick={closeMobile}
                aria-label="Close navigation"
              />
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={SIDEBAR_TRANSITION}
                className="fixed left-0 top-0 z-[71] flex h-full w-[min(280px,88vw)] md:hidden"
                style={{ padding: LAYOUT_GUTTER }}
              >
                <div className="flex h-full w-full flex-col">
                  <SidebarShell
                    expanded
                    onNavigate={handleNavigate}
                    onCloseMobile={closeMobile}
                  />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
};

export default SideSidebar;

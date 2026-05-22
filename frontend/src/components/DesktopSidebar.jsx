import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlinePhone,
  HiOutlineDownload,
  HiOutlineCurrencyDollar,
  HiOutlineClipboardList,
  HiOutlineCash,
  HiOutlineShare,
} from 'react-icons/hi';
import { FaTelegramPlane } from 'react-icons/fa';
import { clearUserAuth } from '../utils/auth';
import { triggerApkDownload } from '../utils/downloads';
import aakdaLogo from '../config/logo';

const LOGOUT_ICON_URL =
  'https://res.cloudinary.com/dzd47mpdo/image/upload/v1769798997/logout_mttqvy.png';

/** Single sidebar list — nav + support + download + logout */
const SIDEBAR_ITEMS = [
  {
    key: 'myBets',
    labelKey: 'header.myBets',
    path: '/bids',
    Icon: HiOutlineClipboardList,
    iconColor: 'text-amber-600',
  },
  {
    key: 'funds',
    labelKey: 'header.funds',
    path: '/funds',
    Icon: HiOutlineCash,
    iconColor: 'text-emerald-600',
  },
  {
    key: 'updateRate',
    labelKey: 'header.updateRate',
    path: '/game-rate',
    Icon: HiOutlineCurrencyDollar,
    iconColor: 'text-blue-600',
  },
  {
    key: 'telegramChannel',
    labelKey: 'header.telegramChannel',
    path: '/support',
    Icon: FaTelegramPlane,
    iconColor: 'text-sky-500',
  },
  {
    key: 'shareApp',
    labelKey: 'header.shareApp',
    path: '/support',
    Icon: HiOutlineShare,
    iconColor: 'text-violet-600',
  },
  {
    key: 'support247',
    labelKey: 'sidebar.support247',
    subtitleKey: 'sidebar.supportSubtitle',
    path: '/support',
    Icon: HiOutlinePhone,
    iconColor: 'text-[#D32F2F]',
  },
  {
    key: 'downloadApp',
    labelKey: 'header.downloadApp',
    action: 'download',
    Icon: HiOutlineDownload,
    iconColor: 'text-gray-700',
    showStoreBadges: true,
  },
  {
    key: 'logout',
    labelKey: 'header.logout',
    subtitleKey: 'sidebar.logoutSubtitle',
    action: 'logout',
    iconImg: LOGOUT_ICON_URL,
    iconBoxClass: 'bg-red-50 dark:bg-[#1a1a1a] border-red-200 dark:border-red-900/40',
  },
];

const navBtnInactive =
  'bg-white dark:bg-[#161616] border-2 border-gray-200 dark:border-white/[0.08] text-gray-800 dark:text-[#e8e8e8] hover:bg-gray-50 dark:hover:bg-[#1e1e1e] hover:border-gray-300 dark:hover:border-red-900/30 shadow-sm';
const navBtnActive =
  'bg-gradient-to-r from-[#ff1a1a] to-[#e60000] text-white border-2 border-[#e60000] shadow-md shadow-red-900/40 dark:shadow-[0_0_16px_rgba(230,0,0,0.35)]';

function NavItemIcon({ Icon, iconColor, active, iconImg, iconBoxClass }) {
  const boxClass = `w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border-2 ${
    active
      ? 'bg-white border-white/50'
      : iconBoxClass || 'bg-gray-50 dark:bg-[#1a1a1a] border-gray-200 dark:border-white/[0.08]'
  }`;

  if (iconImg) {
    return (
      <div className={boxClass}>
        <img src={iconImg} alt="" className="w-6 h-6 object-contain" />
      </div>
    );
  }

  const IconComp = Icon;
  return (
    <div className={boxClass}>
      <IconComp className={`w-[22px] h-[22px] ${iconColor}`} aria-hidden />
    </div>
  );
}

export default function DesktopSidebar({ collapsed, onToggleCollapse }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const isActive = (item) => {
    if (item.action === 'logout' || item.action === 'download') return false;
    if (item.key === 'telegramChannel' || item.key === 'shareApp' || item.key === 'support247') {
      return location.pathname.startsWith('/support');
    }
    if (!item.path) return false;
    return location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
  };

  const handleItemClick = (item) => {
    if (item.action === 'logout') {
      clearUserAuth();
      return;
    }
    if (item.action === 'download') {
      triggerApkDownload();
      return;
    }
    if (item.path) navigate(item.path);
  };

  return (
    <aside
      className={`hidden md:flex flex-col shrink-0 bg-white dark:bg-[#0c0c0c] border-r border-gray-200 dark:border-white/[0.08] h-screen sticky top-0 transition-all duration-300 dark:shadow-[inset_-8px_0_32px_rgba(230,0,0,0.06)] ${
        collapsed ? 'w-[72px]' : 'w-[260px]'
      }`}
    >
      {/* Logo */}
      <div
        className={`shrink-0 flex items-center border-b border-gray-200 dark:border-white/[0.08] dark:bg-gradient-to-br dark:from-red-950/35 dark:via-[#0c0c0c] dark:to-[#0c0c0c] ${
          collapsed ? 'justify-center px-2 py-3' : 'gap-2 px-3 py-3'
        }`}
      >
        <Link
          to="/"
          className={`flex items-center min-w-0 ${
            collapsed ? 'w-full justify-center' : 'flex-1'
          }`}
        >
          <img
            src={aakdaLogo}
            alt="Aakda"
            className={
              collapsed
                ? 'h-8 w-auto max-w-[52px] object-contain'
                : 'h-10 w-auto max-w-[172px] object-contain object-left'
            }
          />
        </Link>
        {!collapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="w-7 h-7 rounded-full border-2 border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-white/20 transition-colors shrink-0"
            aria-label={t('sidebar.collapse')}
          >
            <HiOutlineChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {collapsed && (
        <button
          type="button"
          onClick={onToggleCollapse}
          className="shrink-0 mx-auto mt-2 w-7 h-7 rounded-full border-2 border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          aria-label={t('sidebar.expand')}
        >
          <HiOutlineChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* Single menu — fills sidebar height, last button at screen bottom */}
      <nav className="flex-1 flex flex-col min-h-0 px-3 pt-3 pb-4 overflow-hidden">
        <div className="flex flex-col flex-1 min-h-0 justify-between gap-2">
          {SIDEBAR_ITEMS.map((item) => {
            const active = isActive(item);
            return (
              <button
                key={item.key}
                type="button"
                title={collapsed ? t(item.labelKey) : undefined}
                onClick={() => handleItemClick(item)}
                className={`w-full shrink-0 flex items-center transition-all duration-200 ${
                  collapsed
                    ? 'justify-center p-2 rounded-xl'
                    : 'gap-3 px-3 py-2.5 rounded-xl'
                } ${active ? navBtnActive : navBtnInactive}`}
              >
                <NavItemIcon
                  Icon={item.Icon}
                  iconColor={item.iconColor}
                  active={active}
                  iconImg={item.iconImg}
                  iconBoxClass={item.iconBoxClass}
                />
                {!collapsed && (
                  <>
                    <div className="flex-1 min-w-0 text-left">
                      <p
                        className={`text-sm font-semibold truncate ${
                          active ? 'text-white' : 'text-gray-800 dark:text-gray-200'
                        }`}
                      >
                        {t(item.labelKey)}
                      </p>
                      {item.subtitleKey && (
                        <p
                          className={`text-[11px] truncate mt-0.5 ${
                            active ? 'text-white/85' : 'text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {t(item.subtitleKey)}
                        </p>
                      )}
                    </div>
                    {item.showStoreBadges ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] bg-gray-100 dark:bg-[#252528] border border-gray-200 dark:border-white/10 rounded px-1 py-0.5">
                          🤖
                        </span>
                        <span className="text-[10px] bg-gray-100 dark:bg-[#252528] border border-gray-200 dark:border-white/10 rounded px-1 py-0.5">
                          🍎
                        </span>
                      </div>
                    ) : active ? (
                      <HiOutlineChevronRight className="w-4 h-4 text-white shrink-0" />
                    ) : (
                      <HiOutlineChevronRight className="w-4 h-4 text-gray-400 dark:text-[#707070] shrink-0" />
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}

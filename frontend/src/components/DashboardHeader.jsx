import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HiMenu, HiUser } from 'react-icons/hi';
import { HiBell, HiDownload, HiPlus, ICON_SIZE_NAV, iconColorClass } from './dashboard/dashboardIcons';
import { useWallet } from '../hooks/useWallet';
import { triggerApkDownload } from '../utils/downloads';
import DashboardNavPill from './home/DashboardNavPill';
import { SIDEBAR_COLLAPSED_W } from './DesktopSidebar';
import aakdaLogo from '../config/logo';
import useNotificationCount from '../hooks/useNotificationCount';

export default function DashboardHeader({ activePanel, onPanelChange, sidebarCollapsed, onToggleSidebar }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { formattedBalance } = useWallet();
  const { notificationCount } = useNotificationCount();
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

  return (
    <header className="sticky top-0 z-50 shrink-0 border-b border-gray-200 bg-white font-sans shadow-sm dark:border-white/[0.08] dark:bg-[#141415] dark:shadow-none">
      <div className="flex items-center py-3">
        <div
          className="flex shrink-0 items-center justify-center border-r border-gray-200 dark:border-white/[0.06]"
          style={{ width: SIDEBAR_COLLAPSED_W }}
        >
          <button
            type="button"
            onClick={onToggleSidebar}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/[0.08] dark:bg-[#1d1e20] dark:text-white dark:hover:bg-[#2a2b2e]"
            aria-label={sidebarCollapsed ? t('sidebar.expand') : t('sidebar.collapse')}
            title={sidebarCollapsed ? t('sidebar.expand') : t('sidebar.collapse')}
          >
            <HiMenu className={[ICON_SIZE_NAV, iconColorClass(false)].join(' ')} />
          </button>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-3 px-4">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="shrink-0 rounded-lg p-0.5 transition-transform duration-200 hover:scale-[1.02]"
            aria-label="Aakda home"
          >
            <img src={aakdaLogo} alt="Aakda" className="h-9 w-auto object-contain" />
          </button>
          {onPanelChange && (
            <DashboardNavPill activePanel={activePanel} onPanelChange={onPanelChange} />
          )}
          <div className="ml-auto flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/funds?tab=add-fund')}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 pl-3 pr-1.5 py-1.5 transition-colors hover:bg-gray-100 dark:border-white/[0.08] dark:bg-[#1d1e20] dark:hover:bg-[#2a2b2e] dark:shadow-none"
            aria-label={t('navigation.funds')}
          >
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{formattedBalance}</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#e60000]">
              <HiPlus className="h-4 w-4 text-white" />
            </span>
          </button>

          <button
            type="button"
            onClick={triggerApkDownload}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 transition-colors hover:bg-gray-50 dark:border-white/[0.08] dark:bg-[#1d1e20] dark:hover:bg-[#2a2b2e]"
            aria-label={t('header.downloadApp')}
          >
            <HiDownload className={[ICON_SIZE_NAV, iconColorClass(false)].join(' ')} />
          </button>

          <button
            type="button"
            onClick={() => navigate('/notifications')}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 transition-colors hover:bg-gray-50 dark:border-white/[0.08] dark:bg-[#1d1e20] dark:hover:bg-[#2a2b2e]"
            aria-label={t('header.notification')}
          >
            <HiBell className={[ICON_SIZE_NAV, iconColorClass(false)].join(' ')} />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#e60000] px-1 text-[10px] font-bold text-white">
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => navigate(user ? '/profile' : '/login')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 transition-colors hover:bg-gray-50 dark:border-white/[0.08] dark:bg-[#1d1e20] dark:hover:bg-[#2a2b2e]"
            title={user ? `${user.username} — ${t('common.view', { defaultValue: 'View' })} Profile` : t('sidebar.logIn')}
            aria-label={user ? t('sidebar.account', { defaultValue: 'Account' }) : t('sidebar.logIn')}
          >
            {user ? (
              <span className={`text-sm font-semibold ${iconColorClass(false)}`}>
                {(user.username || 'U').charAt(0).toUpperCase()}
              </span>
            ) : (
              <HiUser className={[ICON_SIZE_NAV, iconColorClass(false)].join(' ')} />
            )}
          </button>
          </div>
        </div>
      </div>
    </header>
  );
}

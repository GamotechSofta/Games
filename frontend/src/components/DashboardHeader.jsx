import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HiBell, HiDownload, HiPlus, ICON_SIZE_NAV, iconColorClass } from './dashboard/dashboardIcons';
import { useWallet } from '../hooks/useWallet';
import { getNotificationUnreadCount } from '../utils/notificationCount';
import { triggerApkDownload } from '../utils/downloads';
import DashboardNavPill from './home/DashboardNavPill';

export default function DashboardHeader({ activePanel, onPanelChange }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, formattedBalance, avatarInitial } = useWallet();
  const [notificationCount, setNotificationCount] = useState(0);

  const refreshNotificationCount = useCallback(() => {
    getNotificationUnreadCount().then(setNotificationCount);
  }, []);

  useEffect(() => {
    refreshNotificationCount();
    window.addEventListener('notificationsSeen', refreshNotificationCount);
    window.addEventListener('userLogin', refreshNotificationCount);
    const intervalId = setInterval(refreshNotificationCount, 45000);
    return () => {
      window.removeEventListener('notificationsSeen', refreshNotificationCount);
      window.removeEventListener('userLogin', refreshNotificationCount);
      clearInterval(intervalId);
    };
  }, [refreshNotificationCount]);

  return (
    <header className="sticky top-0 z-50 shrink-0 border-b border-gray-200 bg-white px-5 py-3 font-sans shadow-sm dark:border-white/[0.08] dark:bg-[#0a0a0a] dark:shadow-none">
      <div className="flex items-center gap-4">
        {onPanelChange && (
          <DashboardNavPill activePanel={activePanel} onPanelChange={onPanelChange} />
        )}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={triggerApkDownload}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 transition-colors hover:bg-gray-50 dark:border-white/[0.08] dark:bg-[#161616] dark:hover:bg-[#1e1e1e]"
            aria-label={t('header.downloadApp')}
          >
            <HiDownload className={[ICON_SIZE_NAV, iconColorClass(false)].join(' ')} />
          </button>

          <button
            type="button"
            onClick={() => navigate('/notifications')}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 transition-colors hover:bg-gray-50 dark:border-white/[0.08] dark:bg-[#161616] dark:hover:bg-[#1e1e1e]"
            aria-label={t('header.notification')}
          >
            <HiBell className={[ICON_SIZE_NAV, iconColorClass(false)].join(' ')} />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-[#e60000] text-white text-[10px] font-bold">
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            )}
          </button>

          {/* Wallet button */}
          <button
            type="button"
            onClick={() => navigate('/funds?tab=add-fund')}
            className="flex items-center gap-2 bg-red-50 dark:bg-gradient-to-r dark:from-[#e60000] dark:to-[#cc0000] border border-red-200 dark:border-[#e60000] rounded-xl pl-3 pr-1.5 py-1.5 hover:bg-red-100 dark:hover:from-[#ff1a1a] dark:hover:to-[#e60000] dark:shadow-[0_0_14px_rgba(230,0,0,0.4)] transition-colors"
          >
            <span className="text-sm font-semibold text-[#D32F2F] dark:text-white">{formattedBalance}</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#D32F2F] dark:bg-white/20">
              <HiPlus className="h-4 w-4 text-white" />
            </span>
          </button>

          {/* Avatar */}
          <button
            type="button"
            onClick={() => navigate(user ? '/profile' : '/login')}
            className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-[#2a2a2a] dark:to-[#1a1a1a] border-2 border-white dark:border-white/20 shadow-sm flex items-center justify-center overflow-hidden shrink-0"
            aria-label="Profile"
          >
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-gray-700 dark:text-white">{avatarInitial}</span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

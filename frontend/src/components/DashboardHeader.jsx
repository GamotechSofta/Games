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
  const { formattedBalance } = useWallet();
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
    <header className="sticky top-0 z-50 shrink-0 border-b border-gray-200 bg-white px-5 py-3 font-sans shadow-sm dark:border-white/[0.08] dark:bg-[#141415] dark:shadow-none">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="shrink-0 rounded-xl p-1 transition-transform duration-200 hover:scale-[1.02]"
          aria-label="Aakda home"
        >
          <img
            src="/aakdaLogo.png"
            alt="Aakda"
            className="h-10 w-auto object-contain"
          />
        </button>
        {onPanelChange && (
          <DashboardNavPill activePanel={activePanel} onPanelChange={onPanelChange} />
        )}
        <div className="ml-auto flex shrink-0 items-center gap-2">
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
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-[#e60000] text-white text-[10px] font-bold">
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            )}
          </button>

          {/* Wallet button */}
          <button
            type="button"
            onClick={() => navigate('/funds?tab=add-fund')}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 pl-3 pr-1.5 py-1.5 transition-colors hover:bg-gray-100 dark:border-white/[0.08] dark:bg-[#1d1e20] dark:hover:bg-[#2a2b2e] dark:shadow-none"
          >
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{formattedBalance}</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#e60000]">
              <HiPlus className="h-4 w-4 text-white" />
            </span>
          </button>

        </div>
      </div>
    </header>
  );
}

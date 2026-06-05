import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import aakdaLogo from '../config/logo';
import { triggerApkDownload } from '../utils/downloads';
import {
  isMobileInstallBannerDismissed,
  setMobileInstallBannerDismissed,
} from '../utils/mobileInstallBanner';
import { isIosDevice, isStandalonePwa } from '../services/callNotificationService';

export default function MobileInstallBanner() {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(isMobileInstallBannerDismissed());
  }, []);

  const closeBanner = () => {
    setDismissed(true);
    setMobileInstallBannerDismissed(true);
  };

  if (dismissed) return null;

  const ios = isIosDevice();
  const iosNeedsInstall = ios && !isStandalonePwa();

  if (iosNeedsInstall) {
    return (
      <div className="md:hidden">
        <div className="rounded-[22px] border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 shadow-sm">
          <div className="flex items-start gap-2.5">
            <button
              type="button"
              onClick={closeBanner}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-amber-800/80 active:scale-95"
              aria-label={t('common.close') || 'Close'}
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l8 8M14 6l-8 8" />
              </svg>
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-amber-900 dark:text-amber-100">
                Add to Home Screen for calls
              </p>
              <p className="mt-1 text-[11px] leading-snug text-amber-800/90 dark:text-amber-200/90">
                Safari → Share → Add to Home Screen. Then open Aakda from that icon and enable call alerts on Profile.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="md:hidden">
      <div className="rounded-[22px] border border-black/5 bg-white px-3 py-2 shadow-[0_12px_30px_rgba(0,0,0,0.12)]">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={closeBanner}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#5a606a] active:scale-95"
            aria-label={t('common.close') || 'Close'}
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l8 8M14 6l-8 8" />
            </svg>
          </button>

          <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[16px] bg-[#334155] p-2 shadow-inner">
            <img src={aakdaLogo} alt="Aakda app" className="max-h-full max-w-full object-contain" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-semibold leading-tight text-[#111827]">
              {t('header.downloadApp')}
            </div>
            <div className="mt-1 flex items-center gap-1 text-[#fbbf24]">
              {Array.from({ length: 5 }).map((_, idx) => (
                <svg key={idx} className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.538 1.118l-2.8-2.034a1 1 0 00-1.176 0l-2.8 2.034c-.783.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.363-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81H7.03a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
              <span className="ml-1 text-[12px] font-medium text-[#111827]">5.0</span>
            </div>
            <div className="mt-1 text-[11px] font-medium text-[#6b7280]">Android app</div>
          </div>

          <div className="flex shrink-0 flex-col items-end">
            <button
              type="button"
              onClick={triggerApkDownload}
              className="rounded-[14px] bg-[#1d71f2] px-4 py-2 text-[13px] font-semibold text-white shadow-[0_10px_24px_rgba(29,113,242,0.28)] active:scale-95"
            >
              Install
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

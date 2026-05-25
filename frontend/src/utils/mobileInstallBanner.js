export const MOBILE_INSTALL_BANNER_STORAGE_KEY = 'mobileInstallBannerDismissed';
export const MOBILE_INSTALL_BANNER_EVENT = 'mobileInstallBannerChange';

export function isMobileInstallBannerDismissed() {
  try {
    return localStorage.getItem(MOBILE_INSTALL_BANNER_STORAGE_KEY) === '1';
  } catch (_) {
    return false;
  }
}

export function setMobileInstallBannerDismissed(dismissed) {
  try {
    if (dismissed) {
      localStorage.setItem(MOBILE_INSTALL_BANNER_STORAGE_KEY, '1');
    } else {
      localStorage.removeItem(MOBILE_INSTALL_BANNER_STORAGE_KEY);
    }
  } catch (_) {}

  try {
    window.dispatchEvent(
      new CustomEvent(MOBILE_INSTALL_BANNER_EVENT, {
        detail: { dismissed },
      }),
    );
  } catch (_) {}
}

export function shouldShowMobileInstallBanner(pathname) {
  return pathname === '/' || pathname === '/markets';
}

export function getMobileDashboardSubHeaderTop(hasPromoBanner) {
  return hasPromoBanner
    ? 'calc(6.75rem + env(safe-area-inset-top, 0px))'
    : 'calc(3rem + env(safe-area-inset-top, 0px))';
}

export function getMobileDashboardContentTop(hasPromoBanner) {
  return hasPromoBanner
    ? 'calc(9.5rem + env(safe-area-inset-top, 0px))'
    : 'calc(5.5rem + env(safe-area-inset-top, 0px))';
}

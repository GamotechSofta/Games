import {
  isIosDevice,
  isStandalonePwa,
  isNotificationGranted,
} from './callNotificationService';

export const IOS_SETUP_DISMISS_KEY = 'iosCallSetupDismissedAt';

/** @typedef {'ready' | 'need-pwa' | 'need-alerts'} IosCallSetupStep */

/**
 * iPhone locked-screen calls need: Home Screen PWA + notification permission + push subscription.
 * @returns {IosCallSetupStep}
 */
export function getIosCallSetupStep({ pushAlertsEnabled }) {
  if (!isIosDevice()) return 'ready';
  if (!isStandalonePwa()) return 'need-pwa';
  if (!pushAlertsEnabled || !isNotificationGranted()) return 'need-alerts';
  return 'ready';
}

export function isIosCallReady(pushAlertsEnabled) {
  if (!isIosDevice()) return true;
  return getIosCallSetupStep({ pushAlertsEnabled }) === 'ready';
}

export function shouldShowIosCallSetupModal(pushAlertsEnabled) {
  if (!isIosDevice()) return false;
  if (getIosCallSetupStep({ pushAlertsEnabled }) === 'ready') return false;
  try {
    const dismissed = Number(localStorage.getItem(IOS_SETUP_DISMISS_KEY) || 0);
    if (dismissed && Date.now() - dismissed < 24 * 60 * 60 * 1000) return false;
  } catch (_) {}
  return true;
}

export function dismissIosCallSetupModal() {
  try {
    localStorage.setItem(IOS_SETUP_DISMISS_KEY, String(Date.now()));
  } catch (_) {}
}

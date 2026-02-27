/**
 * Haptic feedback for better UX. Uses expo-haptics when available; no-op on web/unsupported.
 */
import * as Haptics from 'expo-haptics';

export const haptics = {
  /** Light tap - buttons, list items, tab press */
  light() {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}
  },
  /** Medium tap - primary actions (submit, confirm) */
  medium() {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (_) {}
  },
  /** Success - copy, save success, payment submitted */
  success() {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (_) {}
  },
  /** Warning - validation error, insufficient balance */
  warning() {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (_) {}
  },
};

export default haptics;

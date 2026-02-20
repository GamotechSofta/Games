/**
 * Clear user auth and redirect to login.
 * Use on logout or when API returns 401.
 */
import { storage } from './storage';
import { resetToLogin } from '../navigationRef';

export const clearUserAuth = async () => {
  await storage.removeItem('user');
  resetToLogin();
};

/**
 * If response is 401, clear auth and redirect. Returns true if redirected.
 */
export const redirectToLoginIf401 = (response) => {
  if (response?.status === 401) {
    clearUserAuth();
    return true;
  }
  return false;
};

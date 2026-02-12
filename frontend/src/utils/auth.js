/**
 * Clear user auth and redirect to login.
 * Use on logout or when API returns 401.
 */
export const clearUserAuth = () => {
  localStorage.removeItem('user');
  window.dispatchEvent(new Event('userLogout'));
  window.location.href = '/login';
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

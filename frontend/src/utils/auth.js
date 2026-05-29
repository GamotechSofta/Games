/**
 * Clear user auth and redirect to login.
 * Use on logout or when API returns 401.
 */
export const AUTH_TOKEN_KEY = 'userToken';

export const getUserToken = () => localStorage.getItem(AUTH_TOKEN_KEY);

const parseJwtPayload = (token) => {
  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return null;
    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(base64);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

export const isTokenExpired = (token) => {
  if (!token) return true;
  const payload = parseJwtPayload(token);
  if (!payload?.exp) return false; // keep backward compatibility if exp missing
  const currentUnixSeconds = Math.floor(Date.now() / 1000);
  return payload.exp <= currentUnixSeconds;
};

export const setUserAuth = ({ user, token }) => {
  if (user) {
    const stored = { ...user };
    const bal = Number(stored.balance ?? stored.walletBalance ?? stored.wallet);
    if (Number.isFinite(bal)) {
      stored.balance = bal;
      stored.walletBalance = bal;
      stored.wallet = bal;
    }
    localStorage.setItem('user', JSON.stringify(stored));
  }
  if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
  window.dispatchEvent(new Event('userLogin'));
};

export const clearUserAuth = () => {
  localStorage.removeItem('user');
  localStorage.removeItem(AUTH_TOKEN_KEY);
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

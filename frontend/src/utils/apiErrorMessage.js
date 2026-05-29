/**
 * Map axios/fetch errors to user-visible messages (login, bet place, etc.).
 */
export function getApiErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  const data = err?.response?.data;
  if (data?.code === 'DB_TIMEOUT' || data?.code === 'DB_NOT_READY') {
    return data.message || 'Server is busy. Please wait a moment and try again.';
  }
  if (data?.message) return String(data.message);
  if (err?.code === 'ECONNABORTED' || err?.message?.includes('timeout')) {
    return 'Request timed out. Please check your connection and try again.';
  }
  if (!err?.response) {
    return 'Cannot reach server. Check your internet or try again.';
  }
  return fallback;
}

/** Map axios/fetch errors to user-visible messages. */
export function getApiErrorMessage(error, fallback = 'Request failed') {
  const data = error?.response?.data;
  if (data?.message) return data.message;
  if (data?.code === 'DB_TIMEOUT' || data?.code === 'DB_NOT_READY') {
    return data.message || 'Server database is slow. Please try again.';
  }
  if (error?.code === 'ECONNABORTED') {
    return 'Request timed out. Server or database may be slow — please retry.';
  }
  if (!error?.response) {
    return 'Cannot reach server. Check your connection and try again.';
  }
  return fallback;
}

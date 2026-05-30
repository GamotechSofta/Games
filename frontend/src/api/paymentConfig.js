import { API_BASE_URL } from '../config/api';

export const PAYMENT_CONFIG_DEFAULTS = {
  minDeposit: 100,
  maxDeposit: 50000,
  minWithdrawal: 500,
  maxWithdrawal: 25000,
};

export async function fetchPaymentConfig() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const userId = user?.id || user?._id;
  const url = `${API_BASE_URL}/payments/config${userId ? `?userId=${encodeURIComponent(userId)}` : ''}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || !data?.success) {
    throw new Error(data?.message || 'Failed to load payment config');
  }
  return { ...PAYMENT_CONFIG_DEFAULTS, ...(data.data || {}) };
}

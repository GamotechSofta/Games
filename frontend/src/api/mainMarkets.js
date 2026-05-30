import { API_BASE_URL } from '../config/api';
import { transformMarkets } from '../utils/homeTransforms';

export async function fetchMainMarkets(popularOnly = false) {
  const params = new URLSearchParams({
    marketType: 'main',
    fields: 'home',
  });
  if (popularOnly) params.set('popularOnly', 'true');
  const response = await fetch(`${API_BASE_URL}/markets/get-markets?${params.toString()}`);
  const data = await response.json();
  if (!response.ok || !data?.success) {
    throw new Error(data?.message || 'Failed to load markets');
  }
  return transformMarkets(data.data);
}

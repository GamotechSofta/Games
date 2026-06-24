import { API_BASE_URL } from '../config/api';
import { transformMarkets } from '../utils/homeTransforms';
import fetchNoStore from '../utils/fetchNoStore';

export async function fetchMainMarkets(popularOnly = false) {
  const params = new URLSearchParams({
    marketType: 'main',
    fields: 'home',
    limit: '500',
  });
  if (popularOnly) params.set('popularOnly', 'true');
  const response = await fetchNoStore(`${API_BASE_URL}/markets/get-markets?${params.toString()}`);
  const data = await response.json();
  if (!response.ok || !data?.success) {
    throw new Error(data?.message || 'Failed to load markets');
  }
  return transformMarkets(data.data);
}

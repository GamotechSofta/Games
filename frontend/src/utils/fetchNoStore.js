/** Browser fetch that bypasses HTTP cache (required for live market results). */
export function fetchNoStore(url, options = {}) {
  return fetch(url, { ...options, cache: 'no-store' });
}

export default fetchNoStore;

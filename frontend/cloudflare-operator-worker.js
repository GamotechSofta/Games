/**
 * Cloudflare Worker — proxy PotLudo operator callbacks on aakda.in → api.aakda.in
 *
 * Why: Ludo config uses APP_OPERATOR_BASE_URL=https://aakda.in
 * Render static site returns empty HTTP 200 for POST /operator and /service,
 * so PotLudo session fails with:
 *   "Operator gateway request failed with status 200."
 *
 * Deploy (Cloudflare Dashboard → Workers → Create → Quick edit, then Routes):
 *   aakda.in/operator*
 *   aakda.in/service*
 *   www.aakda.in/operator*
 *   www.aakda.in/service*
 *
 * Or: wrangler deploy with routes in wrangler.toml
 */
const API_ORIGIN = 'https://api.aakda.in';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (!path.startsWith('/operator') && !path.startsWith('/service')) {
      return fetch(request);
    }

    const target = new URL(path + url.search, API_ORIGIN);
    const headers = new Headers(request.headers);
    headers.set('host', new URL(API_ORIGIN).host);
    headers.delete('cf-connecting-ip');

    return fetch(target.toString(), {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
      redirect: 'manual',
    });
  },
};

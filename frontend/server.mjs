/**
 * Production server for aakda.in (Render Web Service).
 *
 * PotLudo calls:
 *   POST https://aakda.in/operator/user/login
 *   POST https://aakda.in/service/user/detail
 *   POST https://aakda.in/service/operator/user/balance/v2
 *
 * Static hosting returns empty HTTP 200 for those paths → PotLudo 502:
 *   "Operator gateway request failed with status 200."
 *
 * This server proxies /operator and /service to the API, then serves the SPA.
 *
 * Start: npm run build && npm start
 */
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, 'dist');
const PORT = Number(process.env.PORT || 4173);
const API_ORIGIN = String(
  process.env.OPERATOR_PROXY_TARGET ||
    process.env.VITE_BACKEND_BASE_URL ||
    'https://api.aakda.in'
).replace(/\/$/, '');

const app = express();

const operatorProxy = createProxyMiddleware({
  target: API_ORIGIN,
  changeOrigin: true,
  secure: true,
  xfwd: true,
  // Keep full path (/operator/... or /service/...) — do not mount under a stripped prefix
  pathFilter: (pathname) =>
    pathname.startsWith('/operator') || pathname.startsWith('/service'),
  onError(err, _req, res) {
    console.error('[operator-proxy]', err.message);
    if (!res.headersSent) {
      res.status(502).json({
        status: 502,
        code: 502,
        errorCode: 502,
        message: 'Operator proxy failed',
        errorMessage: err.message,
      });
    }
  },
});

app.use(operatorProxy);

app.use(express.static(distDir, { index: false, maxAge: '1h' }));

app.get('*', (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'), (err) => {
    if (err) {
      res.status(500).send('Frontend build missing — run npm run build');
    }
  });
});

app.listen(PORT, () => {
  console.log(`[aakda-frontend] http://0.0.0.0:${PORT}`);
  console.log(`[aakda-frontend] proxy /operator /service → ${API_ORIGIN}`);
});

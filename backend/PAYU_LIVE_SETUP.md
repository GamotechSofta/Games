# PayU: Switch from Test to Live Mode

When you set `PAYU_MODE=live`, payments go to **secure.payu.in** (real money). To avoid errors, do the following.

## 1. Use Production Key & Salt (required)

- In **PayU Dashboard** go to **Integration** or **API Keys**.
- Select **LIVE / Production** (not Test).
- Copy the **Key** and **Salt** for the **Live** environment.
- In `.env` set:
  ```env
  PAYU_MODE=live
  PAYU_KEY=<your-production-key>
  PAYU_SALT=<your-production-salt>
  ```
- **Do not** use Test Key/Salt with `PAYU_MODE=live`. That causes "incorrect hash" or "merchant" errors.

## 2. Set production redirect URLs (for deployed app)

When your app is deployed (not localhost), set:

```env
FRONTEND_BASE_URL=https://yourdomain.com
BACKEND_BASE_URL=https://api.yourdomain.com
```

So PayU redirects users back to your real site after payment.

## 3. Restart the backend

After changing `.env`, restart the Node server so it reads the new values.

## Quick checklist

- [ ] `PAYU_MODE=live` in `.env`
- [ ] `PAYU_KEY` = **Production** Key from PayU dashboard (Live)
- [ ] `PAYU_SALT` = **Production** Salt from PayU dashboard (Live)
- [ ] `FRONTEND_BASE_URL` and `BACKEND_BASE_URL` = production URLs (if deployed)
- [ ] Backend restarted

If you still get errors after switching to live, check the server console for the `[PayU] LIVE mode` warning and confirm Key/Salt are from the **Live** section in the PayU dashboard.

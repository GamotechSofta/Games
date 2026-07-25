# Fix PotLudo 502: "Operator gateway request failed with status 200."

## Root cause (verified live)

```text
POST https://aakda.in/operator/user/login   → HTTP 200, empty body
POST https://api.aakda.in/operator/user/login → JSON { code: 0, ... }  ✅
```

PotLudo is configured to call **aakda.in**. The Render **static site** does not
proxy `/operator` / `/service`, so PotLudo sees empty HTTP 200 and returns 502.

## Fix options (pick one)

### A) Fastest — change PotLudo operator base URL

Set operator / callback base to:

```text
https://api.aakda.in
```

Paths stay the same:

- `/operator/user/login`
- `/service/user/detail`
- `/service/operator/user/balance/v2`

### B) Keep https://aakda.in — convert frontend to Web Service

1. In Render, open the **aakda.in** service
2. If it is a **Static Site**, create/switch to a **Web Service**:
   - Root: `frontend`
   - Build: `npm ci && npm run build`
   - Start: `npm start`
   - Env: `OPERATOR_PROXY_TARGET=https://api.aakda.in`
3. Deploy this repo (`frontend/server.mjs` proxies `/operator` + `/service`)

### C) Keep Static Site — Dashboard rewrites

Render → aakda.in → **Redirects/Rewrites** (above SPA catch-all):

| Type    | Source        | Destination                     |
|---------|---------------|---------------------------------|
| Rewrite | `/operator/*` | `https://api.aakda.in/operator/*` |
| Rewrite | `/service/*`  | `https://api.aakda.in/service/*`  |
| Rewrite | `/*`          | `/index.html`                   |

> Note: some Render static setups do not forward POST bodies correctly.
> If C still returns empty 200, use **A** or **B**.

## Verify after deploy

```bash
curl -sS -X POST https://aakda.in/operator/user/login \
  -H 'Content-Type: application/json' \
  -d '{"id":"test"}'
```

Expect JSON (e.g. `code: 401`), **not** an empty response.
Then retry PotLudo Play Online.

# Fix PotLudo session 502 (read with backend/.md)

Per `backend/.md`, Ludo is configured as:

```dotenv
APP_OPERATOR_BASE_URL=https://aakda.in
APP_OPERATOR_LOGIN_PATH=/operator/user/login
APP_OPERATOR_USER_DETAIL_PATH=/service/user/detail
APP_OPERATOR_BALANCE_PATH=/service/operator/user/balance/v2
APP_OPERATOR_GAME_ID=2
```

Flow:

1. Platform opens `https://fashionbuddies.in/play/online?id=<TOKEN>&game_id=2`
2. Client `POST /api/v1/identity/operator/session` with `{ "id": "<TOKEN>", "gameId": 2 }`
3. Ludo backend calls **aakda.in** user-detail / login / balance

## Verified failure

```text
POST https://aakda.in/operator/user/login     → HTTP 200, empty body ❌
POST https://api.aakda.in/operator/user/login → JSON { code: 0, ... } ✅
```

Empty HTTP 200 on `aakda.in` → PotLudo error:
`Operator gateway request failed with status 200.`

## Fix (pick one — required for session 200)

### 1) Cloudflare Worker (fastest if aakda.in is orange-cloud)

File: `frontend/cloudflare-operator-worker.js`

Routes:

- `aakda.in/operator*`
- `aakda.in/service*`
- `www.aakda.in/operator*`
- `www.aakda.in/service*`

### 2) Render Web Service proxy

`frontend/server.mjs` + `npm start`  
Env: `OPERATOR_PROXY_TARGET=https://api.aakda.in`

### 3) Render Static Site rewrites

| Type | Source | Destination |
|------|--------|-------------|
| Rewrite | `/operator/*` | `https://api.aakda.in/operator/*` |
| Rewrite | `/service/*` | `https://api.aakda.in/service/*` |

## Verify before testing Play Online

```bash
curl -sS -X POST https://aakda.in/operator/user/login \
  -H 'Content-Type: application/json' \
  -d '{"id":"test"}'
```

Must return **JSON**, not empty. Then session can succeed.

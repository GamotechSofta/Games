# Deployment: AWS backend + Render frontend (aakda.in)

Your layout:

| Service | Host | URL |
|---------|------|-----|
| **Player frontend** | Render | [https://www.aakda.in](https://www.aakda.in/) |
| **Backend API + Socket.IO** | AWS | `https://api.aakda.in` |
| **TURN (coturn)** | AWS EC2 (same or second instance) | `turn:YOUR_EC2_IP:3478` |

---

## 1. AWS backend (`api.aakda.in`)

Environment variables on the **EC2 / Elastic Beanstalk / ECS** task:

```env
NODE_ENV=production
PORT=3010
MONGODB_URI=...
BACKEND_BASE_URL=https://api.aakda.in

# Player site (for call push links — must match live frontend)
FRONTEND_BASE_URL=https://www.aakda.in

CORS_ORIGINS=https://aakda.in,https://www.aakda.in,https://aakdatelecaller.onrender.com
TELECALLER_BASE_URL=https://aakdatelecaller.onrender.com

# Web Push (already in your .env — copy to AWS)
WEB_PUSH_VAPID_PUBLIC_KEY=...
WEB_PUSH_VAPID_PRIVATE_KEY=...
WEB_PUSH_SUBJECT=mailto:support@aakda.in

# Self-hosted TURN (coturn on EC2 65.1.60.233)
TURN_URL=turn:65.1.60.233:3478
TURN_USERNAME=games
TURN_PASSWORD=<same as turnserver.conf user line>
STUN_URLS=stun:65.1.60.233:3478
```

After deploy:

```bash
npm run check-turn
curl https://api.aakda.in/api/v1/call/ice-config
```

Expect `"turnConfigured": true`.

### AWS Security Group (for coturn on same EC2)

| Type | Port | Protocol |
|------|------|----------|
| Custom | 3478 | UDP |
| Custom | 3478 | TCP |
| Custom | 5349 | TCP (optional TLS) |
| HTTP/HTTPS | 80/443 | TCP (API) |

### Run coturn on the EC2

```bash
cd backend/turn-server
cp turnserver.conf.template turnserver.conf
# external-ip = EC2 public IPv4
# user = same as TURN_USERNAME:TURN_PASSWORD
docker compose up -d
```

See [turn-server/README.md](./turn-server/README.md).

---

## 2. Render frontend ([www.aakda.in](https://www.aakda.in/))

**Environment variables** in Render dashboard (Static Site / Web Service):

```env
VITE_API_BASE_URL=https://api.aakda.in/api/v1
VITE_SOCKET_URL=https://api.aakda.in
```

Redeploy after changing env vars (Vite bakes them at build time).

**Required for instant market results:**

```env
VITE_API_BASE_URL=https://api.aakda.in/api/v1
VITE_SOCKET_URL=https://api.aakda.in
```

If `VITE_SOCKET_URL` is missing, the app falls back to deriving the host from `VITE_API_BASE_URL`. Set both explicitly on Render/Vercel.

Custom domain: `www.aakda.in` and `aakda.in` → Render, as you already have.

### Instant market results in production

The player app receives admin declares via:

1. **SSE** (primary in production) — `GET https://api.aakda.in/api/v1/markets/live-updates`  
   Works through nginx without WebSocket. **nginx must disable buffering** for this path (see [nginx-api.example.conf](./nginx-api.example.conf)).

2. **Socket.IO** (optional) — `wss://api.aakda.in/socket.io/`  
   Requires nginx `Upgrade` headers (same example config).

After deploy, verify in browser DevTools → Network:

- `live-updates` stays **pending** (EventStream) while logged in — if **404**, backend not deployed yet; **revision poll** still works after deploy
- `revision` returns `{"success":true,"data":{"ts":...}}` every ~5s in production
- Declaring a result triggers a new event and market cards update without refresh

Quick checks from your machine:

```bash
curl -s https://api.aakda.in/api/v1/markets/revision
curl -sI -H "Origin: https://www.aakda.in" https://api.aakda.in/api/v1/markets/live-updates
curl -s "https://api.aakda.in/socket.io/?EIO=4&transport=polling"
```

| curl result | Meaning |
|---------------|---------|
| `revision` → 404 | **Deploy backend** — player app cannot detect declares |
| `live-updates` → 404 | Deploy backend + nginx SSE block (see example config) |
| `socket.io` → JSON with `"sid"` | Socket reachable; instant updates work once backend emits + frontend redeployed |

---

## 3. Telecaller (if on Render)

```env
VITE_API_BASE_URL=https://api.aakda.in/api/v1
```

On **AWS backend** (`api.aakda.in`), add telecaller to CORS (required or browser blocks all API calls):

```env
TELECALLER_BASE_URL=https://aakdatelecaller.onrender.com
CORS_ORIGINS=https://aakda.in,https://www.aakda.in,https://aakdatelecaller.onrender.com
```

Restart the Node process after changing env. On startup you should see:
`[CORS]   - https://aakdatelecaller.onrender.com`

---

## 4. Calls flow checklist

- [ ] `https://api.aakda.in/api/v1/call/ice-config` → `turnConfigured: true`
- [ ] Player opens [www.aakda.in](https://www.aakda.in/) → Profile → **Enable call alerts**
- [ ] Telecaller: no red “Cross-network calls disabled” banner
- [ ] Test: telecaller Wi‑Fi, player mobile data → both hear audio

---

## 5. Common mistakes

| Issue | Fix |
|-------|-----|
| `FRONTEND_BASE_URL` still `player-p15g.onrender.com` | Set `https://www.aakda.in` on AWS |
| Frontend build without `VITE_API_BASE_URL` | Set on Render, rebuild |
| CORS error in browser | Add frontend + telecaller origins to `CORS_ORIGINS` on AWS (see above) |
| Telecaller CORS from `aakdatelecaller.onrender.com` | Set `TELECALLER_BASE_URL` + add URL to `CORS_ORIGINS`, restart API |
| `504 Gateway Time-out` on API | EC2/nginx timeout or Node/Mongo down — fix CORS first, then check `pm2 logs` / MongoDB |
| Red TURN banner | coturn + `TURN_*` on AWS, security group UDP 3478 |
| Socket connects but no voice | TURN not configured (STUN only) |
| Market result not instant in prod (works locally) | 1) Redeploy backend + frontend with latest code 2) Set `VITE_SOCKET_URL` on frontend build 3) nginx: proxy `/socket.io/` + disable buffering on `/api/v1/markets/live-updates` ([nginx-api.example.conf](./nginx-api.example.conf)) 4) `CORS_ORIGINS` must include `https://www.aakda.in` |
| `live-updates` 504 in Network tab | nginx `proxy_read_timeout` too low or buffering on — use example nginx config |

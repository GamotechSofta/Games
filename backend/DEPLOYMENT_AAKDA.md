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

CORS_ORIGINS=https://aakda.in,https://www.aakda.in
# Add telecaller URL when deployed, e.g. https://telecaller.aakda.in

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

Custom domain: `www.aakda.in` and `aakda.in` → Render, as you already have.

---

## 3. Telecaller (if on Render)

```env
VITE_API_BASE_URL=https://api.aakda.in/api/v1
```

On **AWS backend**, add telecaller origin to `CORS_ORIGINS` and set:

```env
TELECALLER_BASE_URL=https://your-telecaller-domain
```

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
| CORS error in browser | Add `https://www.aakda.in` to `CORS_ORIGINS` on AWS |
| Red TURN banner | coturn + `TURN_*` on AWS, security group UDP 3478 |
| Socket connects but no voice | TURN not configured (STUN only) |

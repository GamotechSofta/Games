# Self-hosted TURN + STUN (your own server)

WebRTC calls on **different internet** need a **TURN relay**. You can run your own with **coturn** on a VPS — no Metered or other TURN SaaS.

Your **Node backend** (`api.aakda.in`) only **reads** TURN settings from `.env` and exposes them to apps via `GET /api/v1/call/ice-config`. The TURN process runs separately (usually on a VPS).

## Architecture

```
Telecaller / Player apps  →  api.aakda.in (ice-config)
                              ↓
                         TURN_URL, TURN_USERNAME, TURN_PASSWORD
                              ↓
                         Your VPS : coturn (UDP 3478)
```

**Note:** Render / serverless hosts are **not** suitable for coturn (UDP). Use a small VPS (DigitalOcean, AWS EC2, Hetzner, etc.) with a **public IP**.

## 1. Open firewall ports on the VPS

| Port | Protocol | Purpose |
|------|----------|---------|
| 3478 | UDP + TCP | STUN + TURN |
| 5349 | TCP | TURNS (TLS), optional |

## 2. Install coturn (Docker)

```bash
cd backend/turn-server
cp turnserver.conf.template turnserver.conf
```

Edit `turnserver.conf`:

- `external-ip=` → your VPS **public** IPv4
- `user=username:password` → pick a strong password

```bash
docker compose up -d
```

## 3. Configure the Games backend

On **api.aakda.in** (and local `backend/.env`), add:

```env
# Your VPS public IP or DNS (e.g. turn.aakda.in pointing to the VPS)
TURN_URL=turn:203.0.113.10:3478
TURN_USERNAME=games
TURN_PASSWORD=your_long_secret_same_as_turnserver.conf

# Optional: use your coturn for STUN too (recommended)
STUN_URLS=stun:203.0.113.10:3478
```

Restart the backend, then:

```bash
cd backend
npm run check-turn
```

Must show: `TURN configured: YES ✓`

## 4. Verify from browser

Open: `https://api.aakda.in/api/v1/call/ice-config`

Expect `"turnConfigured": true` and `turn:` entries in `iceServers`.

## 5. Generate a random TURN password

```bash
cd backend
npm run generate-turn-secret
```

## Troubleshooting

- **Still `stun-only`:** `.env` not loaded on production — add vars in Render/host panel and redeploy.
- **No audio cross-network:** firewall blocking UDP 3478; wrong `external-ip`; username/password mismatch.
- **Telecaller red banner:** disappears once `turnConfigured` is true on live API.

## Optional: TLS (TURNS)

For strict corporate networks, add certificates to `turnserver.conf` and set:

```env
TURN_URLS=turn:YOUR_IP:3478,turn:YOUR_IP:3478?transport=tcp,turns:YOUR_IP:5349?transport=tcp
```

The backend expands `TURN_URL` automatically when only one URL is set.

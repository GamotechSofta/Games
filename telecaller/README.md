# Telecaller dashboard

Read-only panel for telecallers: player name, phone, online status, last deposit/withdrawal, admin wallet add/deduct, and last bet. **Does not** show wallet balance, emails, IPs, or passwords.

Uses the shared `backend` service (same as `admin`, `frontend`, `bookie`).

## Setup

1. Start MongoDB and the backend from `Games/backend` (`npm run dev` or your usual process).
2. Create telecaller logins (pick one):

- **Admin panel** → Configuration → **Telecallers** → Add Telecaller with **10-digit mobile** + password (super admin only)
- Or CLI: `cd backend` then `node scripts/createTelecaller.js 9876543210 mypassword`

Super admin and specific admins with the **Telecaller app** tab can also use this panel.

In the admin panel, **Configuration → Telecallers** lists each login ID and password. After refresh, use **View** and enter your **secret declare password** (set under **Settings**) to reveal a stored password. Requires `ENCRYPTION_KEY` on the backend.

3. Install and run the app:

```bash
cd telecaller
npm install
npm run dev
```

Open http://localhost:5177

After login, use the **sidebar** tasks:

- **Overview** — stats and online players (tap to open details)  
- **Player calls** — call list; **tap any player** for a popup with mobile, deposits, withdrawals, wallet balance, wallet activity times, and last bet time  
- **Bet follow-up** — last bet **date/time only** (no amount or market)  

## Environment

Copy `.env.example` to `.env` if needed:

- `VITE_API_BASE_URL=http://localhost:3010/api/v1` (production / explicit URL)
- In dev, defaults to `/api/v1` with Vite proxy to port 3010.

**CORS:** In `backend/.env`, add `http://localhost:5177` and `http://127.0.0.1:5177` to `CORS_ORIGINS`, or set `TELECALLER_BASE_URL=http://localhost:5177` (see `backend/.env.example`). Restart the backend after changing CORS.

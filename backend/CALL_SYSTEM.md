# Click-to-Call (WebRTC + Socket.IO)

## Socket events

| Event | Direction | Description |
|-------|-----------|-------------|
| `register` | Client → Server | `{ userId, role: 'user' \| 'telecaller', name?, phone? }` |
| `call-request` | User → Server | `{ userId, name, phone }` → broadcasts `new-call-request` |
| `call-user` | Telecaller → Server | `{ from, to, offer }` → user gets `incoming-call` |
| `answer-call` | User → Server | `{ from, to, answer }` → telecaller gets `call-answered` |
| `reject-call` | User → Server | `{ from, to }` |
| `ice-candidate` | Both | `{ from, to, candidate }` |
| `end-call` | Both | `{ from, to }` → `call-ended` |

## WebRTC (different networks / mobile data)

Same Wi‑Fi often works with STUN only. **Different networks require TURN** (relay). Without TURN, the UI may show "connected" but **no audio**.

1. Set in backend `.env` either:
   - `METERED_TURN_API_KEY` (or `OPENRELAY_API_KEY`) from [Metered Open Relay](https://www.metered.ca/tools/openrelay/) — sign up for a free API key, or
   - `TURN_URL`, `TURN_USERNAME`, `TURN_PASSWORD` (your coturn server; TCP/TLS variants are auto-expanded)
2. Restart backend and confirm log: `[ice] WebRTC TURN ready`.
3. Clients load `GET /api/v1/call/ice-config` automatically (ICE candidates are queued until SDP is applied).

- Audio only: `{ audio: true, video: false }`

## Apps

- **telecaller** — `/live-calls` tab
- **frontend** — Profile & Support: Request a Call
- **mobile-app** — Flutter equivalent

Socket path: `/socket.io` (same server as wallet socket).

## Incoming call when user left site / phone locked (no Firebase)

1. Run `npm run generate-vapid` in backend, add `WEB_PUSH_VAPID_*` to **production** env (Render/host) and restart.
2. Player taps **Enable call alerts** on Profile (or the banner) — grants notification permission and registers Web Push.
3. On telecaller **Call Now**, server stores offer + sends **Web Push** (and shows a notification if the tab is backgrounded but socket is still connected).
4. Tapping opens `/?incomingCall={callId}` and loads pending offer from `GET /api/v1/call/pending/:callId`.

**iPhone:** Web Push works only from the **Home Screen PWA** (Safari → Share → Add to Home Screen), iOS 16.4+.

**Android Chrome:** Allow notifications for the site; keep call alerts enabled after login.

**Flutter app:** foreground background service + native CallKit-style UI (`flutter_callkit_incoming`), no FCM.

**Limits:** iOS Safari requires Add to Home Screen for best background push; true phone-call behavior on native app install.

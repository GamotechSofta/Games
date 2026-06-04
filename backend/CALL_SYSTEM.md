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

Same Wi‑Fi often works with STUN only. **Different networks require TURN** (relay).

1. Set in backend `.env` either:
   - `METERED_TURN_API_KEY` from [Metered.ca](https://www.metered.ca/) (easiest), or
   - `TURN_URL`, `TURN_USERNAME`, `TURN_PASSWORD` (your coturn server)
2. Restart backend.
3. Clients load `GET /api/v1/call/ice-config` automatically.

- Audio only: `{ audio: true, video: false }`

## Apps

- **telecaller** — `/live-calls` tab
- **frontend** — Profile & Support: Request a Call
- **mobile-app** — Flutter equivalent

Socket path: `/socket.io` (same server as wallet socket).

## Incoming call when user left site / phone locked (no Firebase)

1. Run `npm run generate-vapid` in backend, add keys to `.env`.
2. User taps **Enable call alerts** on Profile (web) — grants notification permission.
3. On telecaller **Call Now**, server stores offer + sends **Web Push**: "Aakda.in is calling" with Answer / Decline.
4. Tapping opens `/?incomingCall={callId}` and loads pending offer from `GET /api/v1/call/pending/:callId`.

**Flutter app:** foreground background service + native CallKit-style UI (`flutter_callkit_incoming`), no FCM.

**Limits:** iOS Safari requires Add to Home Screen for best background push; true phone-call behavior on native app install.

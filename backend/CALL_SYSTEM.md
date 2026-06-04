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

## WebRTC

- Audio only: `{ audio: true, video: false }`
- ICE: `stun:stun.l.google.com:19302` + TURN placeholder in each client

## Apps

- **telecaller** — `/live-calls` tab
- **frontend** — Profile & Support: Request a Call
- **mobile-app** — Flutter equivalent

Socket path: `/socket.io` (same server as wallet socket).

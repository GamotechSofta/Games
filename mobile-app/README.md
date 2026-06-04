# Games Mobile — Click to Call

Flutter user app: **Request a Call** + incoming WebRTC audio calls (same signaling as web).

## Setup

```bash
cd mobile-app
flutter pub get
```

## Run

```bash
# Android emulator → backend on host machine
flutter run --dart-define=SOCKET_URL=http://10.0.2.2:3010

# Physical device on same Wi‑Fi
flutter run --dart-define=SOCKET_URL=http://YOUR_PC_IP:3010
```

Enter the same **MongoDB user `_id`** as the web app `localStorage.user.id`.

## Packages

- `socket_io_client` — signaling (`register`, `call-request`, `incoming-call`, etc.)
- `flutter_webrtc` — audio-only peer connection

## FCM (background incoming calls)

See `lib/services/fcm_service.dart`. Add Firebase, then on push `incoming_call` reconnect socket and open `IncomingCallScreen`.

## Cross-network calls (not only same Wi‑Fi)

Configure TURN on the **backend** `.env` (`METERED_TURN_API_KEY` or `TURN_*`). The app loads ICE servers from `GET /api/v1/call/ice-config`.

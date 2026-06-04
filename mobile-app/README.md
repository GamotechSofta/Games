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

## Incoming calls (no Firebase)

- **Socket.IO** — `incoming-call` when the app is open or background service is running
- **Background service** — `lib/services/background_call_service.dart` keeps the socket alive on Android
- **Native lock screen UI** — `lib/services/native_call_service.dart` (CallKit-style Answer / Decline)
- **Pending call API** — `GET /api/v1/call/pending/:callId` if the app was killed and reopened from a web push link

The **web player app** uses **Web Push (VAPID)** via the service worker — not Firebase Cloud Messaging.

## Cross-network calls (not only same Wi‑Fi)

Configure TURN on the **backend** `.env` (`METERED_TURN_API_KEY` or `TURN_*`). The app loads ICE servers from `GET /api/v1/call/ice-config`.

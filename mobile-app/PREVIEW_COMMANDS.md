# Mobile App – Preview / Run Commands

## Development preview (run and see on device/simulator)

From project root, go to mobile-app and start Expo:

```bash
cd mobile-app
npx expo start
```

Then:
- **Android:** Press `a` in terminal, or run `npx expo start --android`
- **iOS (Mac only):** Press `i` in terminal, or run `npx expo start --ios`
- **Physical device:** Scan the QR code with Expo Go (Android) or Camera (iOS)

Clear cache if needed:

```bash
cd mobile-app
npx expo start --clear
```

## One-line from repo root

```bash
cd e:\Games\mobile-app && npx expo start --clear
```

## Build for installable preview (optional)

If you use [EAS Build](https://docs.expo.dev/build/introduction/), you can create a preview build:

```bash
cd mobile-app
npx eas build --platform android --profile preview
```

(Requires `eas.json` with a `preview` profile; run `npx eas build:configure` first if needed.)

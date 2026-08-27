# Pocket Draw

[![Copier](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/copier-org/copier/refs/heads/master/img/badge/black-badge.json)](https://github.com/copier-org/copier)

## Getting started

This is a [React Native](https://reactnative.dev/) app built with [Expo](https://expo.dev/).

### 1. Install prerequisites

- [Node.js](https://nodejs.org/) (v24 recommended, see `mise.toml`)
- npm (comes with Node.js)

You do **not** need Xcode or Android Studio installed to run the app during development — see below.

### 2. Install dependencies

```bash
npm install
```

### 3. Run the app

```bash
npx expo start
```

This starts the Metro bundler and prints a QR code in your terminal.

### 4. View it on your iPhone

This project targets **Expo SDK 54** and uses `react-native-ble-manager`, so it must run in an Expo development build. Expo Go does not include the native Bluetooth module.

1. Build and install the development client on your iPhone with `npx expo run:ios --device`.
2. Start Metro with `npm run start:dev-client`.
3. Open the Pocket Draw development client and connect to the displayed server.

> ⚠️ **Why SDK 54, not the latest one:** Expo Go on the App Store only supports one SDK
> version at a time, and Apple's review process means it regularly lags behind the newest
> Expo SDK release by several versions. As of writing, Expo Go on the App Store only
> supports SDK 54, so this project is pinned there deliberately — do **not** bump `expo`
> past what the current App Store Expo Go supports without checking first — running
> `npx expo start` will say "project is incompatible with this version of Expo Go" if
> you do. The native Bluetooth module requires the development build described above.
>
> Note: your iPhone and your computer need to be on the same Wi-Fi network for the QR
> code to connect. On restrictive networks (e.g. university wifi with client isolation),
> run `npm run start:tunnel` instead — it routes the connection over the internet so
> it works even when your phone and laptop can't see each other on the LAN.

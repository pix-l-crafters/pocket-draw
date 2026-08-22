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

This project uses **`expo-dev-client`** instead of the plain Expo Go app. That means you can't just scan the QR code with the regular Expo Go app from the App Store — Expo Go only supports Expo's built-in native modules, and we may add third-party native modules (drawing/gesture libraries etc.) that Expo Go can't run.

Instead, everyone needs our own custom-built "dev client" installed once:

1. Install the **EAS CLI**: `npm install -g eas-cli`
2. `eas login` with the team's Expo account (ask in the group chat if you don't have the login).
3. Build the dev client for iOS: `eas build --profile development --platform ios`
4. Once the build finishes, EAS gives you an install link/QR code — open it on your iPhone to install the dev client app (this is a one-time setup, not needed again unless a native dependency changes).

> ⚠️ Installing on a **physical iPhone** requires the device to be registered with an Apple Developer account (EAS will prompt you through this on first build). If nobody on the team has an Apple Developer account yet, that needs to be sorted out first — ping the team about this.

After the dev client is installed once, day-to-day development is the same as before:

1. Run `npx expo start`
2. Open the **dev client app** on your iPhone (not Expo Go) and scan the QR code from the terminal
3. It hot-reloads as the code changes, same as Expo Go did

> Note: your iPhone and your computer need to be on the same Wi-Fi network for the QR code to connect.

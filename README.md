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

This project targets **Expo SDK 54** and uses the plain **Expo Go** app — no custom dev client or Apple Developer account needed.

1. Install **Expo Go** from the App Store on your iPhone.
2. Run `npx expo start`.
3. Scan the QR code printed in your terminal with your iPhone's camera (it'll prompt to open in Expo Go).

> ⚠️ **Why SDK 54, not the latest one:** Expo Go on the App Store only supports one SDK
> version at a time, and Apple's review process means it regularly lags behind the newest
> Expo SDK release by several versions. As of writing, Expo Go on the App Store only
> supports SDK 54, so this project is pinned there deliberately — do **not** bump `expo`
> past what the current App Store Expo Go supports without checking first — running
> `npx expo start` will say "project is incompatible with this version of Expo Go" if
> you do. If we later need a native module Expo Go doesn't include, we'll revisit using
> `expo-dev-client` + EAS builds instead.
>
> Note: your iPhone and your computer need to be on the same Wi-Fi network for the QR
> code to connect. On restrictive networks (e.g. university wifi with client isolation),
> run `npx expo start --tunnel` instead — it routes the connection over the internet so
> it works even when your phone and laptop can't see each other on the LAN.

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

This project targets **Expo SDK 54** and duels over a local WebRTC connection (`react-native-webrtc`, `react-native-tcp-socket`), so it must run in an Expo development build. Expo Go does not include these native modules.

1. Build and install the development client on your iPhone with `npx expo run:ios --device`.
2. Start Metro with `npm run start:dev-client`.
3. Open the Pocket Draw development client and connect to the displayed server.

> ⚠️ **Why SDK 54, not the latest one:** Expo Go on the App Store only supports one SDK
> version at a time, and Apple's review process means it regularly lags behind the newest
> Expo SDK release by several versions. As of writing, Expo Go on the App Store only
> supports SDK 54, so this project is pinned there deliberately — do **not** bump `expo`
> past what the current App Store Expo Go supports without checking first — running
> `npx expo start` will say "project is incompatible with this version of Expo Go" if
> you do. The native WebRTC and socket modules require the development build described above.
>
> Note: your iPhone and your computer need to be on the same Wi-Fi network for the QR
> code to connect. On restrictive networks (e.g. university wifi with client isolation),
> run `npm run start:tunnel` instead — it routes the connection over the internet so
> it works even when your phone and laptop can't see each other on the LAN.

### 5. View it on an Android phone

The map tab on Android uses the Google Maps SDK, which needs an API key. Without one the
map renders as a blank grey area with a Google logo and **no error is shown**.

1. Copy `.env.sample` to `.env` if you have not already, and fill in
   `GOOGLE_MAPS_ANDROID_API_KEY` with the team's "Maps SDK for Android" key (ask in the
   team chat; it is not committed).
2. Build and install the development client with `npx expo run:android --device`.
3. Start Metro with `npm run start:dev-client` as above.

The key is read by [app.config.ts](./app.config.ts) at build time and written into
`AndroidManifest.xml`, so you must rebuild the development client after changing it.
Metro reloads alone are not enough. EAS builds get the same variable from the project's
EAS environment variables instead of `.env`.

### Build Android locally with mise

Install [mise](https://mise.jdx.dev/getting-started.html), then run:

```sh
mise trust
mise install
mise run prepare
mise run build-android       # AAB
mise run build-android-apk   # APK
```

Both build tasks install the required Android SDK packages, generate the native
Android project with Expo, and run its Gradle wrapper. Android Studio, an emulator,
and an Expo account are not needed to compile. SDK packages live in a stable
machine-local directory selected by `ANDROID_HOME` in `mise.toml`.

Outputs are `android/app/build/outputs/bundle/release/app-release.aab` and
`android/app/build/outputs/apk/release/app-release.apk`. The generated project uses
a debug signing key by default; configure release signing before publishing.

These tasks include commands for Linux, macOS, and native Windows. In WSL, install
mise and the tools inside WSL and keep the checkout in its Linux filesystem. Use
separate SDK installations for Windows and WSL. Linux requires x86-64 for the
current Android CLI; macOS supports Intel and Apple Silicon.

To refresh the managed tools, run `mise upgrade android-cli java node` and review
`mise.lock`. Update the SDK package versions in `android-setup` when upgrading
Expo/React Native. The project's Gradle wrapper supplies the compatible Gradle
version; a standalone Gradle installation is unnecessary.

If `android/` was generated with a different Expo version, save any custom native
changes and run `mise exec -- npx expo prebuild --platform android --clean --no-install`
once before building. `--clean` deletes and regenerates that native directory;
the normal build tasks preserve it.

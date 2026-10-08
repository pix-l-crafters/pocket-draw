# Pocket Draw

[![Copier](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/copier-org/copier/refs/heads/master/img/badge/black-badge.json)](https://github.com/copier-org/copier)

## Getting started

This is a [React Native](https://reactnative.dev/) app built with [Expo](https://expo.dev/).

### 1. Install prerequisites

- [Node.js](https://nodejs.org/) (v24 recommended, see `mise.toml`)
- npm (comes with Node.js)

Metro can serve an already installed development build without Xcode or Android
Studio. Building and installing an iPhone development build locally with
`npx expo run:ios --device` requires full Xcode and a signed physical device.
An EAS development build is another way to install the app on an iPhone.

### 2. Install dependencies

```bash
npm install
```

### 3. Run the app

```bash
npm run start:dev-client
```

This starts Metro for the development build and prints a QR code. On university
Wi-Fi, use `npm run start:tunnel` instead: the network may block connections
between the iPhone and Mac even when both are on the same Wi-Fi.

### 4. View it on your iPhone

This project targets **Expo SDK 54** and duels over a local WebRTC connection (`react-native-webrtc`, `react-native-tcp-socket`), so it must run in an Expo development build. Expo Go does not include these native modules.

1. Install a development build on your iPhone. The `development` profile in
   `eas.json` builds with Xcode 26: run
   `npx eas build --platform ios --profile development` if you need a new build.
   `npx expo run:ios --device` is another option with a compatible local Xcode.
2. Start Metro with `npm run start:tunnel` on university Wi-Fi, or
   `npm run start:dev-client` on a network that allows devices to reach each other.
3. Open the installed Pocket Draw development client and scan the current QR code.
   Do not scan it with Expo Go. Keep Metro running while testing.

If the iPhone scanner says the QR code has unusable data, open Pocket Draw
directly and enter the HTTPS tunnel URL shown after `url=` in Metro's
`exp+pocket-draw://` link into the development launcher. If there is no
development launcher, install a development build on that iPhone first.
With the iPhone connected to the Mac, the full `exp+pocket-draw://` link can
also be opened using `xcrun devicectl device process openURL --device <UDID> '<link>'`.

If the app cannot load, open the Metro URL's `/status` endpoint in iPhone Safari.
It should say `packager-status:running`. For a LAN session, use the Mac's Wi-Fi
address and Metro port (usually `http://<mac-ip>:8081/status`). If that works
on the Mac but not the phone, check that both devices are on the same network
and that the network allows device-to-device traffic. Check the macOS firewall
if it is enabled. On a restricted network, restart Metro with
`npm run start:tunnel` and test the HTTPS tunnel URL's `/status` endpoint.
If the tunnel URL works in Safari but Pocket Draw still cannot load, check that
the development build is installed and rebuild it after native dependency or
app configuration changes.
On iOS 27, a development build compiled locally with Xcode 27 may exit at
launch before it requests a Metro bundle because this SDK 54 native app does
not yet use the iOS scene lifecycle. Use the `development` EAS profile above,
which builds with Xcode 26, and install that build on the registered iPhone.

> ⚠️ **Why SDK 54, not the latest one:** Expo Go on the App Store only supports one SDK
> version at a time, and Apple's review process means it regularly lags behind the newest
> Expo SDK release by several versions. As of writing, Expo Go on the App Store only
> supports SDK 54, so this project is pinned there deliberately — do **not** bump `expo`
> past what the current App Store Expo Go supports without checking first — running
> `npx expo start` will say "project is incompatible with this version of Expo Go" if
> you do. The native WebRTC and socket modules require the development build described above.
>
> The tunnel carries the Expo development bundle. Duels still use a direct
> phone-to-phone connection, so university Wi-Fi client isolation can also block
> pairing. Use a network that allows devices to reach each other or the app's
> hotspot mode for a two-phone duel.

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

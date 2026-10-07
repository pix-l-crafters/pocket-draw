# Android APK builds with mise

Researched: 2026-10-08. Scope: command-line APK builds for this Expo project on
WSL, macOS, Linux, and native Windows. This report proposes configuration; it
records the initial research before installation.

The setup was subsequently implemented in `mise.toml`, with commands documented
in `README.md`. Both local APK and AAB tasks passed on Linux. macOS, Windows,
and WSL were not executed; the platform table describes the supported tooling
route rather than verified builds on those hosts.

## Recommendation

Use mise for Java, Node, and Google's current `android-cli`; install SDK
packages into a stable SDK directory using `android sdk install`. Build with
the project's Gradle Wrapper, selecting `gradlew.bat` on Windows. This avoids
tying installed SDK packages to a changing mise tool-version directory.

Google now documents Android CLI as the terminal interface for SDK management.
Its latest listed release is **1.0.16500706, October 2026**. mise's current
registry has an `android-cli` HTTP backend with Google download URLs and
checksums. The binary's printed version can lag its published build number,
so that difference alone does not prove an outdated installation.
[Android CLI release notes](https://developer.android.com/tools/agents/android-cli/release-notes),
[mise registry source](https://github.com/jdx/mise/blob/main/registry/android-cli.toml).

“Up to date” should mean current patched tooling compatible with this app,
with explicit upgrades. It should not mean replacing every compiler, SDK,
and build plugin independently with its newest major version.

## What this repository needs

The following are local findings from `package.json`, `mise.toml`,
`android/gradle/wrapper/gradle-wrapper.properties`, the installed React Native
version catalog, and the generated Android project:

| Component             | Current project                              | Recommendation                                           |
| --------------------- | -------------------------------------------- | -------------------------------------------------------- |
| Expo / React Native   | Expo 54 / React Native 0.81.5                | Keep their Android versions aligned                      |
| Node                  | mise requests 24                             | Retain this major and use current patches                |
| Java                  | mise requests 21                             | Prefer patched Temurin 17 for the documented RN baseline |
| Android platform      | compile/target API 36                        | Install `platforms/android-36`                           |
| Build Tools           | 36.0.0                                       | Install that exact package path                          |
| NDK                   | 27.1.12297006                                | Install that exact package path                          |
| CMake                 | Local native-module build records use 3.22.1 | Provision 3.22.1; recheck when dependencies change       |
| Android Gradle Plugin | 8.11.0                                       | Keep aligned with the Expo/RN upgrade                    |
| Gradle Wrapper        | Local wrapper currently requests 9.3.1       | Verify compatibility; prefer the Expo-generated baseline |

React Native 0.81 recommends JDK 17 and warns about higher JDK versions.
AGP 8.11 documents JDK 17, Gradle 8.13, and a maximum supported API of 36.
Java 21 is supported for running Gradle starting at 8.5, but that does not
establish compatibility with every plugin in this app.
[React Native environment guide](https://reactnative.dev/docs/0.81/set-up-your-environment),
[AGP 8.11 compatibility](https://developer.android.com/build/releases/agp-8-11-0-release-notes),
[Gradle Java compatibility](https://docs.gradle.org/current/userguide/compatibility.html).

CMake 3.30.5 appears in React Native's source-build setup; that is a different
path from the usual app build using published React Native artifacts. Do not
infer that every normal Expo build needs that newer CMake. Confirm native
module requirements in the generated build before upgrading it.

## Minimal proposed mise configuration

Merge the following into the existing tables; do not replace the repository's
unrelated tools, hooks, or environment settings. Remove the `android-sdk`
tool entry for this approach, and remove standalone `gradle` once no other
task requires it. Do not remove existing SDK directories during migration.

```toml
[tools]
java = "temurin-17"
node = "24"
android-cli = "latest"

[env]
ANDROID_HOME = "{{ xdg_data_home }}/android-sdk"
_.path = ["{{ xdg_data_home }}/android-sdk/platform-tools"]

[tasks.android-sdk-install]
run = 'android --sdk="{{ env.ANDROID_HOME }}" sdk install platform-tools platforms/android-36 build-tools/36.0.0 ndk/27.1.12297006 cmake/3.22.1'

[tasks.android-prebuild]
run = "npx expo prebuild --platform android"

[tasks.android-apk]
dir = "android"
run = "./gradlew :app:assembleRelease"
run_windows = '.\gradlew.bat :app:assembleRelease'
```

`xdg_data_home` is a documented mise template value. This deliberately uses
a machine-local data directory on each host, rather than a checked-in
absolute path. To reuse Android Studio's SDK, override `ANDROID_HOME` and
the matching PATH entry in `mise.local.toml`, and pass that same root to
`android --sdk`. mise sets `JAVA_HOME` in tasks and `mise exec`.
[mise templates](https://mise.jdx.dev/templates.html),
[mise Java support](https://mise.jdx.dev/lang/java.html).

The Android CLI accepts slash-separated package paths, multiple packages,
and an optional `@revision`; stable is the default channel. SDK packages
are separate from the Android CLI launcher version. Review any license
prompt during package installation. Current CLI release notes confirm that
accepted licenses are stored compatibly with older SDK tools and Gradle.
[SDK installation reference](https://developer.android.com/tools/agents/android-cli/commands/sdk_install),
[SDK package listing reference](https://developer.android.com/tools/agents/android-cli/commands/sdk_list),
[Android CLI release notes](https://developer.android.com/tools/agents/android-cli/release-notes).

The Wrapper downloads the project's declared Gradle distribution, so a
separate mise Gradle install is unnecessary for building. `run_windows`
supplies the native Windows command without requiring Bash there.
[Gradle Wrapper](https://docs.gradle.org/current/userguide/gradle_wrapper.html),
[mise task configuration](https://mise.jdx.dev/tasks/task-configuration.html).

After applying and reviewing the configuration:

```text
mise trust
mise install java node android-cli
mise exec -- npm ci
mise run android-sdk-install
mise exec -- android --sdk=<resolved-ANDROID_HOME> sdk list
mise run android-prebuild
mise run android-apk
```

Replace `<resolved-ANDROID_HOME>` with the actual path shown by `mise env`;
the placeholder is explanatory, not a runnable command. The install task
already passes the configured root correctly. `android/` is ignored here,
so a fresh checkout needs prebuild before calling the Wrapper. Review
generated native changes; `--clean` is unnecessary for the first generation.
[Expo Prebuild](https://docs.expo.dev/workflow/prebuild/).

The usual APK output is
`android/app/build/outputs/apk/release/app-release.apk`.
For a development APK, substitute `:app:assembleDebug`. The current generated
release build uses the debug signing configuration: building an APK does not
make it ready for Play Store distribution. Configure a release keystore
separately when producing distributable releases.
[Android command-line builds and signing](https://developer.android.com/build/building-cmdline).

## Platform coverage and limits

| Host                | Proposed path                                         | Qualification                                                |
| ------------------- | ----------------------------------------------------- | ------------------------------------------------------------ |
| Linux x86-64        | Linux mise, Java, CLI, SDK and Wrapper                | Google supplies the launcher binary                          |
| WSL x86-64          | Install all build tools inside WSL; use Linux Wrapper | Separate SDK from Windows; keep checkout in Linux filesystem |
| macOS Intel         | Native mise, Java, CLI, SDK and Wrapper               | Google supplies x86-64 launcher                              |
| macOS Apple Silicon | Native ARM Java and CLI; host SDK packages            | Google supplies ARM launcher                                 |
| Windows x86-64      | Windows mise, Java, CLI, SDK and `.bat` Wrapper       | No Bash required for these tasks                             |
| Windows ARM64       | Registry selects x86-64 launcher under emulation      | Whole native toolchain still needs validation                |
| Linux/WSL ARM64     | Not covered by this launcher route                    | No Linux ARM64 launcher in the current registry              |

These rows establish available paths, not an end-to-end compatibility
guarantee. SDK/NDK host binaries and project dependencies also constrain
architecture support. Do not share one SDK installation between Windows
and WSL: host packages differ. Microsoft's WSL guidance recommends keeping
Linux-command-line projects in the Linux filesystem for performance.
[mise Android CLI platform definitions](https://github.com/jdx/mise/blob/main/registry/android-cli.toml),
[Microsoft WSL filesystem guidance](https://learn.microsoft.com/en-us/windows/wsl/filesystems).

Emulators and USB/device forwarding are separate setup work. Neither is
required to compile an APK. The CLI overview currently lists a disabled
Windows emulator command, another reason to distinguish builds from device
automation. Android Studio is optional for this CLI provisioning route.
[Android CLI overview](https://developer.android.com/tools/agents/android-cli),
[Android SDK command-line tools](https://developer.android.com/tools).

## Existing configuration pitfalls

- `android-sdk` currently resolves through a vfox plugin whose environment
  hook exports both SDK variables to its versioned tool installation.
  Updating that tool changes the SDK root; already installed platforms,
  NDK installations, and build tools stay in the old directory.
  [mise registry](https://github.com/jdx/mise/blob/main/registry/android-sdk.toml),
  [plugin environment hook](https://github.com/mise-plugins/vfox-android-sdk/blob/main/hooks/env_keys.lua).
- Use one SDK root across `ANDROID_HOME`, CLI `--sdk`, Android Studio, and
  generated `android/local.properties`. `ANDROID_SDK_ROOT` is deprecated;
  remove a stale value or ensure it matches exactly.
  [Android environment variables](https://developer.android.com/tools/variables).
- Existing `build-android` uses EAS `--local`, which officially supports
  macOS/Linux; native Windows is unsupported and WSL is not officially
  tested. Its production profile defaults to AAB rather than APK unless
  configured otherwise. Direct Wrapper builds meet the native Windows
  requirement; EAS cloud remains an optional separate route.
  [EAS local-build limitations](https://docs.expo.dev/build-reference/local-builds/),
  [EAS APK configuration](https://docs.expo.dev/build-reference/apk/).
- Replace the large inline `android-cli` download definition with the
  registry shorthand only after checking the installed mise registry.
  Registry snapshots ship with mise; update mise before assuming it has
  the same definitions as current upstream source.
  [mise registry behavior](https://mise.jdx.dev/registry.html).

## Keeping it current and checking it

Keep `mise.lock` committed and update deliberately with `mise upgrade`,
then refresh platform lock entries for the supported OS/architecture matrix.
The lockfile covers mise tools, not independently installed SDK packages;
the SDK install task records the app's requirements. Upgrade Expo/RN and
their AGP/Wrapper/SDK/NDK requirements together.
[mise lockfile](https://mise.jdx.dev/dev-tools/mise-lock.html).

On each supported host, verify `java -version`, `javac -version`, the CLI
SDK listing, the Wrapper's `--version`, and `:app:assembleRelease` through
mise. Check the resulting APK signature with the required Build Tools'
`apksigner`. A CI matrix for Linux, macOS, and Windows, plus an actual WSL
run, is the evidence needed before promising this app builds everywhere.

The configured mise/hk MCP tools were unavailable in this research session.
Restore the connection through `mise run ai-setup` and reload the agent if
it is stale. Tooling integration references:
[mise MCP](https://mise.jdx.dev/mcp.html),
[hk MCP](https://hk.jdx.dev/agents.html#mcp).

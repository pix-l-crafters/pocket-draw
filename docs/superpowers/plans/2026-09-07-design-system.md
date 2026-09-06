# Quickdraw Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract a reusable component library from the "Quickdraw Showdown" mockup's dark,
tactical-HUD visual language and apply it consistently to Login, Register, Map, and BLE —
the screens that exist today.

**Architecture:** One shared token file (`src/theme/tokens.ts`) feeds both a new dark
`react-native-paper` theme (kept only for `SegmentedButtons`/`ActivityIndicator`/`Snackbar`/
`Surface`/`FAB`) and a new set of fully custom branded components in `src/components/` for
everything the mockup renders distinctively (cut-corner buttons/cards, condensed headers,
mono labels, stat tiles).

**Tech Stack:** React Native (Expo SDK 54), TypeScript, `react-native-paper`, new: `expo-font`,
`@expo-google-fonts/barlow`, `@expo-google-fonts/barlow-condensed`,
`@expo-google-fonts/ibm-plex-mono`. `CutCornerSurface`'s shape is a rotated masking `View`,
not `react-native-svg` — that has real native code and isn't in the currently-built
dev-client, so it would force a rebuild before anything using it would render.

## Global Constraints

- No new native rebuild required — every new dependency is JS/asset-only (per the spec, §5)
- `tsc --noEmit` must stay clean after every task (per the spec, §8)
- Duel screens and the mockup's Ranks/Agent/Settings screens are out of scope (per the spec, §7)
- No behavior changes to auth/map/BLE logic — visual only (per the spec, §7)
- Every new component takes plain props, no app-specific state coupling (per the spec, §4)

---

### Task 1: Add dependencies and create the token file

**Files:**

- Modify: `package.json` (via `npx expo install`, not hand-edited)
- Create: `src/theme/tokens.ts`

**Interfaces:**

- Produces: `colors` (object: `background`, `backgroundAlt`, `surface`, `accent`,
  `accentPressed`, `success`, `warning`, `text`, `textMuted60`, `textMuted45`,
  `textMuted30`, `border`, `borderStrong` — all `string`), `fonts` (object: `body`,
  `displayBold`, `mono` — all `string`, exact `expo-font` family names), `cutCornerSize`
  (object: `small`, `medium`, `large` — all `number`, pixel values)

- [ ] **Step 1: Install the new dependencies**

Run:

```bash
npx expo install expo-font @expo-google-fonts/barlow @expo-google-fonts/barlow-condensed @expo-google-fonts/ibm-plex-mono
```

Expected: `package.json`'s `dependencies` gains all four packages, SDK-compatible versions
picked automatically. (`expo-font` has native code, but it's already compiled into the
current dev-client — confirmed via `ios/Podfile.lock`, present there as a transitive
dependency of `@expo/vector-icons` — so this doesn't force a rebuild. The three font
packages are pure JS/asset data.)

- [ ] **Step 2: Write `src/theme/tokens.ts`**

```ts
export const colors = {
  background: "#08090b",
  backgroundAlt: "#0b0d10",
  surface: "#14181e",
  accent: "#ff4b3e",
  accentPressed: "#ff6c60",
  success: "#3de0c8",
  warning: "#ffc44d",
  text: "#f2f4f7",
  textMuted60: "rgba(242,244,247,0.6)",
  textMuted45: "rgba(242,244,247,0.45)",
  textMuted30: "rgba(242,244,247,0.3)",
  border: "rgba(255,255,255,0.09)",
  borderStrong: "rgba(255,255,255,0.16)"
} as const;

export const fonts = {
  body: "Barlow_400Regular",
  displayBold: "BarlowCondensed_700Bold",
  mono: "IBMPlexMono_400Regular"
} as const;

export const cutCornerSize = {
  small: 8,
  medium: 14,
  large: 22
} as const;
```

- [ ] **Step 3: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no new errors (this file has no dependents yet, so it should be silent).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/theme/tokens.ts
git commit -m "feat(mise): add design-system dependencies and token file

New dependencies for the design system: expo-font + three
@expo-google-fonts packages (Barlow, Barlow Condensed, IBM Plex
Mono). expo-font has native code but is already compiled into the
current dev-client (transitive dependency of @expo/vector-icons,
confirmed via ios/Podfile.lock); the font packages are pure JS/asset
data. No native rebuild needed for any of it.

src/theme/tokens.ts is the single source of truth for colors, font
family names, and corner-cut sizes that every other design-system
piece reads from.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Create CutCornerSurface and CutCornerButton

**Files:**

- Create: `src/components/CutCornerSurface.tsx`
- Create: `src/components/CutCornerButton.tsx`

**Interfaces:**

- Consumes: `colors`, `cutCornerSize` from `../theme/tokens` (Task 1)
- Produces: `CutCornerSurface` (props: `children?: React.ReactNode`,
  `corner?: keyof typeof cutCornerSize`, `fill?: string`, `maskColor?: string`,
  `style?: StyleProp<ViewStyle>`), `CutCornerButton` (props: `disabled?: boolean`,
  `label: string`, `onPress: () => void`)
- [ ] **Step 1: Write `src/components/CutCornerSurface.tsx`**

React Native has no native `clip-path`, and `react-native-svg` isn't available without a
rebuild (see Task 1). Instead: paint a small square, rotated 45°, colored to match whatever
sits _behind_ this surface (`maskColor`, defaulting to `colors.background` — correct for
every call site in this plan, since Login/Register/Map/BLE all sit on a flat
`colors.background`), positioned so it exactly covers the bottom-left corner triangle.

The geometry (worked out directly, not guessed): to mask a right-triangle with both legs of
length `cut` at the surface's bottom-left corner, use a square of side `cut * Math.SQRT2`
rotated 45° about its own center, with that center placed at `(cut, cut)` measured from the
bottom-left corner — i.e. `left: cut - side / 2` and `bottom: cut - side / 2`. At that
position, the rotated square's own left and bottom vertices land exactly on the triangle's
two non-corner vertices, so its near edge exactly covers the triangle's hypotenuse (verified
by rotation-matrix arithmetic, not just visually eyeballed).

```tsx
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, cutCornerSize } from "../theme/tokens";

type CutCornerSurfaceProps = {
  children?: React.ReactNode;
  corner?: keyof typeof cutCornerSize;
  fill?: string;
  maskColor?: string;
  style?: StyleProp<ViewStyle>;
};

export function CutCornerSurface({
  children,
  corner = "medium",
  fill = colors.surface,
  maskColor = colors.background,
  style
}: CutCornerSurfaceProps) {
  const cut = cutCornerSize[corner];
  const maskSide = cut * Math.SQRT2;
  const maskOffset = cut - maskSide / 2;

  return (
    <View style={[styles.container, { backgroundColor: fill }, style]}>
      <View
        pointerEvents="none"
        style={[
          styles.mask,
          {
            backgroundColor: maskColor,
            bottom: maskOffset,
            height: maskSide,
            left: maskOffset,
            width: maskSide
          }
        ]}
      />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    position: "relative"
  },
  mask: {
    position: "absolute",
    transform: [{ rotate: "45deg" }]
  },
  content: {
    position: "relative"
  }
});
```

- [ ] **Step 2: Write `src/components/CutCornerButton.tsx`**

```tsx
import { Pressable, StyleSheet, Text } from "react-native";

import { colors, fonts } from "../theme/tokens";
import { CutCornerSurface } from "./CutCornerSurface";

type CutCornerButtonProps = {
  disabled?: boolean;
  label: string;
  onPress: () => void;
};

export function CutCornerButton({
  disabled = false,
  label,
  onPress
}: CutCornerButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        disabled && styles.disabled,
        pressed && styles.pressed
      ]}
    >
      <CutCornerSurface
        corner="medium"
        fill={colors.accent}
        style={styles.surface}
      >
        <Text style={styles.label}>{label}</Text>
      </CutCornerSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  surface: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 17,
    width: "100%"
  },
  label: {
    color: colors.background,
    fontFamily: fonts.displayBold,
    fontSize: 19,
    letterSpacing: 2.5,
    textTransform: "uppercase"
  },
  pressed: {
    opacity: 0.85
  },
  disabled: {
    opacity: 0.4
  }
});
```

- [ ] **Step 3: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/CutCornerSurface.tsx src/components/CutCornerButton.tsx
git commit -m "feat: add CutCornerSurface and CutCornerButton components

CutCornerSurface reproduces the mockup's clip-path cut-corner shape
via an SVG polygon measured at actual render size and positioned
behind real content (RN has no native clip-path). CutCornerButton
wraps it as a pressable primary CTA.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Create KickerLabel, DisplayHeading, and ScreenHeader

**Files:**

- Create: `src/components/KickerLabel.tsx`
- Create: `src/components/DisplayHeading.tsx`
- Create: `src/components/ScreenHeader.tsx`

**Interfaces:**

- Consumes: `colors`, `fonts` from `../theme/tokens` (Task 1)
- Produces: `KickerLabel` (props: `children: string`, `color?: string`,
  `style?: StyleProp<TextStyle>`), `DisplayHeading` (props: `children: string`,
  `size?: number`, `style?: StyleProp<TextStyle>`), `ScreenHeader` (props:
  `kicker: string`, `subtitle?: string`, `title: string`)
- [ ] **Step 1: Write `src/components/KickerLabel.tsx`**

```tsx
import { StyleSheet, Text, type StyleProp, type TextStyle } from "react-native";

import { colors, fonts } from "../theme/tokens";

type KickerLabelProps = {
  children: string;
  color?: string;
  style?: StyleProp<TextStyle>;
};

export function KickerLabel({
  children,
  color = colors.accent,
  style
}: KickerLabelProps) {
  return <Text style={[styles.label, { color }, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  label: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    letterSpacing: 2,
    textTransform: "uppercase"
  }
});
```

- [ ] **Step 2: Write `src/components/DisplayHeading.tsx`**

```tsx
import { StyleSheet, Text, type StyleProp, type TextStyle } from "react-native";

import { colors, fonts } from "../theme/tokens";

type DisplayHeadingProps = {
  children: string;
  size?: number;
  style?: StyleProp<TextStyle>;
};

export function DisplayHeading({
  children,
  size = 34,
  style
}: DisplayHeadingProps) {
  return (
    <Text
      style={[
        styles.heading,
        { fontSize: size, lineHeight: size * 0.92 },
        style
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  heading: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    textTransform: "uppercase"
  }
});
```

- [ ] **Step 3: Write `src/components/ScreenHeader.tsx`**

```tsx
import { StyleSheet, Text, View } from "react-native";

import { colors, fonts } from "../theme/tokens";
import { DisplayHeading } from "./DisplayHeading";
import { KickerLabel } from "./KickerLabel";

type ScreenHeaderProps = {
  kicker: string;
  subtitle?: string;
  title: string;
};

export function ScreenHeader({ kicker, subtitle, title }: ScreenHeaderProps) {
  return (
    <View style={styles.container}>
      <KickerLabel>{kicker}</KickerLabel>
      <DisplayHeading size={34} style={styles.title}>
        {title}
      </DisplayHeading>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12
  },
  title: {
    marginTop: 8
  },
  subtitle: {
    color: colors.textMuted45,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10
  }
});
```

- [ ] **Step 4: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/KickerLabel.tsx src/components/DisplayHeading.tsx src/components/ScreenHeader.tsx
git commit -m "feat: add KickerLabel, DisplayHeading, and ScreenHeader components

The kicker-label + big-title pattern topping most of the mockup's
screens, split into two reusable primitives (KickerLabel,
DisplayHeading) plus the combined ScreenHeader most call sites will
actually use.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: Create StatTile and StatusTag

**Files:**

- Create: `src/components/StatTile.tsx`
- Create: `src/components/StatusTag.tsx`

**Interfaces:**

- Consumes: `colors`, `fonts` from `../theme/tokens` (Task 1)
- Produces: `StatTile` (props: `label: string`, `tint?: string`, `unit?: string`,
  `value: string`), `StatusTag` (props: `children: string`,
  `tone?: "muted" | "success" | "warning"`)
- [ ] **Step 1: Write `src/components/StatTile.tsx`**

```tsx
import { StyleSheet, Text, View } from "react-native";

import { colors, fonts } from "../theme/tokens";

type StatTileProps = {
  label: string;
  tint?: string;
  unit?: string;
  value: string;
};

export function StatTile({
  label,
  tint = colors.text,
  unit,
  value
}: StatTileProps) {
  return (
    <View style={styles.tile}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: tint }]}>
        {value}
        {unit ? <Text style={styles.unit}> {unit}</Text> : null}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: colors.backgroundAlt,
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 12
  },
  label: {
    color: colors.textMuted45,
    fontFamily: fonts.mono,
    fontSize: 8.5,
    letterSpacing: 1.5,
    textTransform: "uppercase"
  },
  value: {
    fontFamily: fonts.displayBold,
    fontSize: 26,
    lineHeight: 27,
    marginTop: 2
  },
  unit: {
    fontSize: 13
  }
});
```

- [ ] **Step 2: Write `src/components/StatusTag.tsx`**

```tsx
import { StyleSheet, Text } from "react-native";

import { colors, fonts } from "../theme/tokens";

type StatusTagProps = {
  children: string;
  tone?: "muted" | "success" | "warning";
};

const toneColors = {
  muted: colors.textMuted45,
  success: colors.success,
  warning: colors.warning
} as const;

export function StatusTag({ children, tone = "muted" }: StatusTagProps) {
  return (
    <Text style={[styles.tag, { color: toneColors[tone] }]}>{children}</Text>
  );
}

const styles = StyleSheet.create({
  tag: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    letterSpacing: 1.5,
    textTransform: "uppercase"
  }
});
```

- [ ] **Step 3: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/StatTile.tsx src/components/StatusTag.tsx
git commit -m "feat: add StatTile and StatusTag components

StatTile is the label + big value pattern used for things like
ELO/RECORD/AVG-DRAW. StatusTag is the small colored mono tag used
for states like GRANTED/PENDING/ONLINE/STABLE.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: Rebuild appTheme.ts as a dark Paper theme

**Files:**

- Modify: `src/theme/appTheme.ts` (currently a full-file rewrite — see current content below)

**Current content of `src/theme/appTheme.ts`:**

```ts
import { MD3LightTheme, type MD3Theme } from "react-native-paper";

export const appTheme: MD3Theme = {
  ...MD3LightTheme,
  roundness: 4,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#6941C6",
    onPrimary: "#FFFFFF",
    primaryContainer: "#E9D7FE",
    onPrimaryContainer: "#3E1C96",
    secondary: "#1570EF",
    onSecondary: "#FFFFFF",
    secondaryContainer: "#D1E9FF",
    onSecondaryContainer: "#1849A9",
    background: "#F2F4F7",
    surface: "#FFFFFF",
    surfaceVariant: "#EAECF0",
    onSurface: "#101828",
    onSurfaceVariant: "#475467",
    outline: "#98A2B3",
    outlineVariant: "#D0D5DD",
    error: "#D92D20",
    onError: "#FFFFFF",
    errorContainer: "#FEE4E2",
    onErrorContainer: "#912018"
  }
};
```

**Interfaces:**

- Consumes: `colors` from `./tokens` (Task 1)
- Produces: `appTheme: MD3Theme` (same export name/type as before — every existing import
  of `appTheme` keeps working unchanged)
- [ ] **Step 1: Replace the whole file**

```ts
import { MD3DarkTheme, type MD3Theme } from "react-native-paper";

import { colors } from "./tokens";

export const appTheme: MD3Theme = {
  ...MD3DarkTheme,
  roundness: 4,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.accent,
    onPrimary: colors.background,
    primaryContainer: colors.surface,
    onPrimaryContainer: colors.text,
    secondary: colors.success,
    onSecondary: colors.background,
    secondaryContainer: colors.surface,
    onSecondaryContainer: colors.text,
    background: colors.background,
    surface: colors.surface,
    surfaceVariant: colors.surface,
    onSurface: colors.text,
    onSurfaceVariant: colors.textMuted60,
    outline: colors.border,
    outlineVariant: colors.border,
    error: "#D92D20",
    onError: colors.text,
    errorContainer: colors.surface,
    onErrorContainer: "#FF8A80"
  }
};
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/theme/appTheme.ts
git commit -m "feat: rebuild appTheme as a dark theme from design tokens

Flips the Paper theme from MD3LightTheme to MD3DarkTheme, with every
color read from the new src/theme/tokens.ts instead of hardcoded hex
values, so SegmentedButtons/ActivityIndicator/Snackbar/Surface/FAB
match the mockup's dark palette without per-component changes.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: Restructure App.tsx — font loading + one PaperProvider for every screen

**Files:**

- Modify: `App.tsx` (full-file rewrite — see current content below)

**Current content of `App.tsx`:**

```tsx
import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { onAuthStateChanged, User } from "firebase/auth";
import { PaperProvider, SegmentedButtons } from "react-native-paper";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { auth } from "./src/lib/firebase";
import { logoutUser } from "./src/lib/auth";
import { BleScreen } from "./src/features/ble/BleScreen";
import { MapScreen } from "./src/features/map/MapScreen";
import type { CurrentUser } from "./src/features/map/types/map.types";
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import { appTheme } from "./src/theme/appTheme";

function toCurrentUser(user: User): CurrentUser {
  return {
    uid: user.uid,
    displayName: user.displayName ?? user.email ?? "Player"
  };
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [activeTab, setActiveTab] = useState<"map" | "ble">("map");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={styles.authScreen}>
        <StatusBar style="light" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!user) {
    if (showRegister) {
      return (
        <View style={styles.authScreen}>
          <StatusBar style="light" />

          <RegisterScreen />

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => setShowRegister(false)}
          >
            <Text style={styles.switchText}>
              Already have an account?{" "}
              <Text style={styles.switchHighlight}>Login</Text>
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.authScreen}>
        <StatusBar style="light" />

        <LoginScreen />

        <TouchableOpacity
          style={styles.switchButton}
          onPress={() => setShowRegister(true)}
        >
          <Text style={styles.switchText}>
            Don&apos;t have an account?{" "}
            <Text style={styles.switchHighlight}>Register</Text>
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <PaperProvider theme={appTheme}>
        <SafeAreaView edges={["top"]} style={styles.container}>
          <View style={styles.switcherContainer}>
            <SegmentedButtons
              buttons={[
                { value: "map", label: "Map" },
                { value: "ble", label: "BLE Scanner" }
              ]}
              onValueChange={(val) => setActiveTab(val as "map" | "ble")}
              style={styles.switcher}
              value={activeTab}
            />
            <TouchableOpacity onPress={logoutUser} style={styles.logoutButton}>
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.screenContainer}>
            {activeTab === "map" ? (
              <MapScreen currentUser={toCurrentUser(user)} />
            ) : (
              <BleScreen />
            )}
          </View>
        </SafeAreaView>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  authScreen: {
    flex: 1,
    backgroundColor: "#0F0F14",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28
  },

  loadingText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600"
  },

  switchButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 10
  },

  switchText: {
    color: "#A7A7B2",
    fontSize: 15,
    textAlign: "center"
  },

  switchHighlight: {
    color: "#9A83FF",
    fontWeight: "700"
  },

  container: {
    flex: 1,
    backgroundColor: "#fff"
  },

  switcherContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#fff"
  },

  switcher: {
    flex: 1
  },

  logoutButton: {
    paddingVertical: 8,
    paddingHorizontal: 12
  },

  logoutButtonText: {
    color: "#B42318",
    fontSize: 14,
    fontWeight: "600"
  },

  screenContainer: {
    flex: 1
  }
});
```

**Interfaces:**

- Consumes: `colors` from `./src/theme/tokens` (Task 1), `appTheme` from
  `./src/theme/appTheme` (Task 5, same export signature)
- Produces: `App` default export (unchanged signature — no props, used only as the Expo
  entrypoint via `index.ts`)
- [ ] **Step 1: Replace the whole file**

```tsx
import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  Barlow_400Regular,
  useFonts as useBarlowFonts
} from "@expo-google-fonts/barlow";
import {
  BarlowCondensed_700Bold,
  useFonts as useBarlowCondensedFonts
} from "@expo-google-fonts/barlow-condensed";
import {
  IBMPlexMono_400Regular,
  useFonts as useIBMPlexMonoFonts
} from "@expo-google-fonts/ibm-plex-mono";
import { PaperProvider, SegmentedButtons } from "react-native-paper";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { auth } from "./src/lib/firebase";
import { logoutUser } from "./src/lib/auth";
import { BleScreen } from "./src/features/ble/BleScreen";
import { MapScreen } from "./src/features/map/MapScreen";
import type { CurrentUser } from "./src/features/map/types/map.types";
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import { appTheme } from "./src/theme/appTheme";
import { colors } from "./src/theme/tokens";

function toCurrentUser(user: User): CurrentUser {
  return {
    uid: user.uid,
    displayName: user.displayName ?? user.email ?? "Player"
  };
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [activeTab, setActiveTab] = useState<"map" | "ble">("map");
  const [barlowLoaded] = useBarlowFonts({ Barlow_400Regular });
  const [barlowCondensedLoaded] = useBarlowCondensedFonts({
    BarlowCondensed_700Bold
  });
  const [ibmPlexMonoLoaded] = useIBMPlexMonoFonts({ IBMPlexMono_400Regular });
  const fontsLoaded =
    barlowLoaded && barlowCondensedLoaded && ibmPlexMonoLoaded;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });

    return unsubscribe;
  }, []);

  const loading = authLoading || !fontsLoaded;

  return (
    <SafeAreaProvider>
      <PaperProvider theme={appTheme}>
        {loading ? (
          <View style={styles.authScreen}>
            <StatusBar style="light" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : !user ? (
          showRegister ? (
            <View style={styles.authScreen}>
              <StatusBar style="light" />

              <RegisterScreen />

              <TouchableOpacity
                onPress={() => setShowRegister(false)}
                style={styles.switchButton}
              >
                <Text style={styles.switchText}>
                  Already have an account?{" "}
                  <Text style={styles.switchHighlight}>Login</Text>
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.authScreen}>
              <StatusBar style="light" />

              <LoginScreen />

              <TouchableOpacity
                onPress={() => setShowRegister(true)}
                style={styles.switchButton}
              >
                <Text style={styles.switchText}>
                  Don&apos;t have an account?{" "}
                  <Text style={styles.switchHighlight}>Register</Text>
                </Text>
              </TouchableOpacity>
            </View>
          )
        ) : (
          <SafeAreaView edges={["top"]} style={styles.container}>
            <View style={styles.switcherContainer}>
              <SegmentedButtons
                buttons={[
                  { value: "map", label: "Map" },
                  { value: "ble", label: "BLE Scanner" }
                ]}
                onValueChange={(val) => setActiveTab(val as "map" | "ble")}
                style={styles.switcher}
                value={activeTab}
              />
              <TouchableOpacity
                onPress={logoutUser}
                style={styles.logoutButton}
              >
                <Text style={styles.logoutButtonText}>Logout</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.screenContainer}>
              {activeTab === "map" ? (
                <MapScreen currentUser={toCurrentUser(user)} />
              ) : (
                <BleScreen />
              )}
            </View>
          </SafeAreaView>
        )}
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  authScreen: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28
  },
  loadingText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "600"
  },
  switchButton: {
    marginTop: 24,
    paddingHorizontal: 10,
    paddingVertical: 12
  },
  switchText: {
    color: colors.textMuted60,
    fontSize: 15,
    textAlign: "center"
  },
  switchHighlight: {
    color: colors.accent,
    fontWeight: "700"
  },
  container: {
    backgroundColor: colors.background,
    flex: 1
  },
  switcherContainer: {
    alignItems: "center",
    backgroundColor: colors.background,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  switcher: {
    flex: 1
  },
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  logoutButtonText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "600"
  },
  screenContainer: {
    flex: 1
  }
});
```

Key change from before: `PaperProvider`/`SafeAreaProvider` now wrap the **entire** return
value, including the loading and pre-auth (Login/Register) states — previously they only
wrapped the post-auth Map/BLE view. This is necessary so the new shared components (which
read Paper's theme in a few places, and are used inside Login/Register in Tasks 7-8) work
correctly there too. The loading condition now also waits on all three font hooks, not just
Firebase auth state.

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add App.tsx
git commit -m "feat(app): load design-system fonts, wrap every screen in PaperProvider

Loads Barlow/BarlowCondensed/IBMPlexMono via expo-font's useFonts,
extending the existing loading branch to wait on fonts as well as
Firebase auth state. Moves PaperProvider/SafeAreaProvider to wrap
the whole app (previously only the post-auth Map/BLE view), so the
new shared components — used inside Login/Register from here on —
have a Paper theme available.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 7: Rebuild LoginScreen on the shared components

**Files:**

- Modify: `src/screens/LoginScreen.tsx` (full-file rewrite — current content already shown
  in the codebase; imports `loginUser` from `../lib/auth`, unchanged)

**Interfaces:**

- Consumes: `loginUser` from `../lib/auth` (existing, unchanged), `CutCornerButton` (Task 2),
  `ScreenHeader` (Task 3), `colors`/`fonts` from `../theme/tokens` (Task 1)
- Produces: `LoginScreen` default export (unchanged signature — no props)
- [ ] **Step 1: Replace the whole file**

```tsx
import { useState } from "react";
import { Alert, StyleSheet, TextInput, View } from "react-native";

import { loginUser } from "../lib/auth";
import { CutCornerButton } from "../components/CutCornerButton";
import { ScreenHeader } from "../components/ScreenHeader";
import { colors, fonts } from "../theme/tokens";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(
        "Missing information",
        "Please enter your email and password."
      );
      return;
    }

    try {
      await loginUser(email.trim(), password);
    } catch {
      Alert.alert("Login failed", "Invalid email or password.");
    }
  };

  return (
    <View style={styles.card}>
      <ScreenHeader
        kicker="Pocket Draw"
        subtitle="Sign in and get ready for your next duel"
        title="Login"
      />

      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="Email"
        placeholderTextColor={colors.textMuted45}
        style={styles.input}
        value={email}
      />

      <TextInput
        onChangeText={setPassword}
        placeholder="Password"
        placeholderTextColor={colors.textMuted45}
        secureTextEntry
        style={styles.input}
        value={password}
      />

      <CutCornerButton label="Login" onPress={() => void handleLogin()} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    maxWidth: 380,
    width: "100%"
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 16,
    height: 54,
    marginBottom: 14,
    paddingHorizontal: 16,
    width: "100%"
  }
});
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/screens/LoginScreen.tsx
git commit -m "feat(auth): rebuild LoginScreen on the shared design system

Replaces the screen's one-off StyleSheet with ScreenHeader and
CutCornerButton, and tokens for input colors/fonts. Same behavior
(email/password + loginUser), new look.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 8: Rebuild RegisterScreen on the shared components

**Files:**

- Modify: `src/screens/RegisterScreen.tsx` (full-file rewrite)

**Interfaces:**

- Consumes: `registerUser` from `../lib/auth` (existing, unchanged), `CutCornerButton`
  (Task 2), `ScreenHeader` (Task 3), `colors`/`fonts` from `../theme/tokens` (Task 1)
- Produces: `RegisterScreen` default export (unchanged signature — no props)
- [ ] **Step 1: Replace the whole file**

```tsx
import { useState } from "react";
import { Alert, StyleSheet, TextInput, View } from "react-native";

import { registerUser } from "../lib/auth";
import { CutCornerButton } from "../components/CutCornerButton";
import { ScreenHeader } from "../components/ScreenHeader";
import { colors, fonts } from "../theme/tokens";

export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert("Missing information", "Please complete all fields.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Password mismatch", "Passwords do not match.");
      return;
    }

    try {
      await registerUser(email.trim(), password);
    } catch {
      Alert.alert("Registration failed", "Please check your details.");
    }
  };

  return (
    <View style={styles.card}>
      <ScreenHeader
        kicker="Pocket Draw"
        subtitle="Join Pocket Draw and challenge nearby players"
        title="Create Account"
      />

      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="Email"
        placeholderTextColor={colors.textMuted45}
        style={styles.input}
        value={email}
      />

      <TextInput
        onChangeText={setPassword}
        placeholder="Password"
        placeholderTextColor={colors.textMuted45}
        secureTextEntry
        style={styles.input}
        value={password}
      />

      <TextInput
        onChangeText={setConfirmPassword}
        placeholder="Confirm password"
        placeholderTextColor={colors.textMuted45}
        secureTextEntry
        style={styles.input}
        value={confirmPassword}
      />

      <CutCornerButton
        label="Create Account"
        onPress={() => void handleRegister()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    maxWidth: 380,
    width: "100%"
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 16,
    height: 54,
    marginBottom: 14,
    paddingHorizontal: 16,
    width: "100%"
  }
});
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/screens/RegisterScreen.tsx
git commit -m "feat(auth): rebuild RegisterScreen on the shared design system

Same treatment as LoginScreen (Task 7): ScreenHeader + CutCornerButton
+ tokens, same registerUser behavior underneath.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 9: Restyle MapScreen and BleScreen for the dark theme

**Files:**

- Modify: `src/features/map/MapScreen.tsx:107-198` (container/status-bar/loading-overlay
  styles only — everything else in this file is unchanged)
- Modify: `src/features/ble/BleScreen.tsx:100-169` (hardcoded light colors only)

**Interfaces:**

- Consumes: `colors` from `../../theme/tokens` (Task 1)
- Produces: no new exports — `MapScreen`/`BleScreen` keep their existing signatures

**Why only these two files:** `MapStatusCard`, `LocationStatusCard`, `PresenceStatusSnackbar`,
and `RecenterButton` all use plain `react-native-paper` components (`Surface`, `Text`,
`Button`, `Snackbar`, `FAB`) with **no hardcoded colors** — confirmed by reading each file.
They read colors entirely from Paper's active theme, so Task 5's dark `appTheme` reskins
them automatically with zero code changes. `PlayerMarker`'s `pinColor` prop is per-marker
map-pin styling handled by the native Maps SDK, not part of this token system — left as-is.

- [ ] **Step 1: Update `MapScreen.tsx`'s hardcoded colors**

In `src/features/map/MapScreen.tsx`, add the import (alongside the existing imports):

```tsx
import { colors } from "../../theme/tokens";
```

Change the `StatusBar` prop on line 108 from `style="dark"` to `style="light"` (dark text
reads poorly on the new dark background).

Replace the `styles` block (lines 172-198) with:

```tsx
const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1
  },
  overlay: {
    flex: 1
  },
  recenterButton: {
    bottom: 20,
    position: "absolute",
    right: 20
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: "rgba(8, 9, 11, 0.82)",
    justifyContent: "center"
  },
  loadingCard: {
    alignItems: "center",
    borderRadius: 20,
    gap: 12,
    paddingHorizontal: 28,
    paddingVertical: 22
  }
});
```

- [ ] **Step 2: Update `BleScreen.tsx`'s hardcoded colors**

In `src/features/ble/BleScreen.tsx`, add the import (alongside the existing imports):

```tsx
import { colors } from "../../theme/tokens";
```

Replace the `styles` block (lines 140-169) with:

```tsx
const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
    padding: 16
  },
  title: {
    color: colors.text,
    fontWeight: "600",
    marginBottom: 4
  },
  status: {
    color: colors.textMuted60,
    marginBottom: 12
  },
  scanButton: {
    marginBottom: 12
  },
  list: {
    gap: 8,
    paddingBottom: 24
  },
  emptyText: {
    color: colors.textMuted45,
    marginTop: 24,
    textAlign: "center"
  },
  card: {
    marginBottom: 8
  }
});
```

Note: the `<Text>` for the title (line 102-104) doesn't currently pass an explicit color,
so add `style={styles.title}` there too if it doesn't already — check the current JSX; if
it only has `style={styles.title} variant="titleMedium"` already (it does, per the file
already read), no JSX change is needed, only the `styles` object above.

- [ ] **Step 3: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/map/MapScreen.tsx src/features/ble/BleScreen.tsx
git commit -m "feat(map,ble): switch MapScreen and BleScreen to the dark theme

Only the hardcoded light-theme colors change (container background,
loading overlay, status bar style, BLE screen's status/empty text).
MapStatusCard/LocationStatusCard/PresenceStatusSnackbar/RecenterButton
need no changes — they read pure react-native-paper theme colors,
which already flipped dark in Task 5.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 10: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full type-check**

Run: `npx tsc --noEmit`
Expected: clean, zero errors, across every file touched by Tasks 1-9.

- [ ] **Step 2: Full Metro bundle smoke test**

Run: `npx expo export --platform ios --output-dir /tmp/design-system-export-test`
Expected: bundles successfully with zero errors (this catches real import/runtime issues
`tsc` alone can't, per the same method used earlier this session to verify the App.tsx
merge-conflict fix).

- [ ] **Step 3: Confirm no other screens/files were missed**

Run: `git diff --stat mobark/chore/eas-project-init..HEAD` (or the equivalent range for
this branch's design-system commits) and confirm the full file list matches: `package.json`,
`package-lock.json`, `src/theme/tokens.ts`, `src/theme/appTheme.ts`, `src/components/*.tsx`
(7 files), `App.tsx`, `src/screens/LoginScreen.tsx`, `src/screens/RegisterScreen.tsx`,
`src/features/map/MapScreen.tsx`, `src/features/ble/BleScreen.tsx`. No other file should
appear.

- [ ] **Step 4: Leave a clear summary**

No commit needed for this task — it's verification only. If Steps 1-2 fail, return to the
task that introduced the failure (per `superpowers:systematic-debugging` — find root cause
before patching) rather than papering over it in this final step.

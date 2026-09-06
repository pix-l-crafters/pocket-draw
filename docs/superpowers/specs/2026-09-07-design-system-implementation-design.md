# Quickdraw Design System — Implementation Design

**Date:** 2026-09-07
**Author:** Mobark Bacran
**Reference:** "Quickdraw Showdown" Design Canvas prototype (kept locally, gitignored, not
committed — a dark, tactical-HUD quickdraw-duel aesthetic)
**Status:** Approved in brainstorming; ready for an implementation plan
**Scope:** Extract a reusable component library from the mockup's visual language and apply
it to the screens that exist today — Login, Register, Map, BLE. Duel screens don't exist as
code yet and aren't touched here; they'll use these same components when built.

---

## 1. Purpose

The app today has two unrelated visual languages: `LoginScreen`/`RegisterScreen` use a
hand-rolled dark theme (`#0F0F14` background, purple `#7C5CFC` accent, plain `StyleSheet`,
no shared components), while `MapScreen`/`BleScreen` use `react-native-paper`'s stock light
Material theme (`#F2F4F7` background, purple `#6941C6` accent). Neither matches the approved
mockup, and there's no shared component library — each screen styles itself from scratch.

This document scopes pulling a small, reusable design system out of the mockup and applying
it consistently across every screen that exists today.

---

## 2. Locked decisions (this session)

| Topic        | Decision                                                                                                                                                                                                                             |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Fidelity     | Full — including the mockup's two extra Google Fonts and its clip-path cut-corner shape, not a simplified colors-only pass                                                                                                           |
| Screen scope | Login, Register, Map, BLE only. Duel screens aren't built yet and aren't touched here                                                                                                                                                |
| Architecture | Hybrid: one shared token file feeds both a new dark Paper theme (kept only for `SegmentedButtons`, `ActivityIndicator`, `Snackbar`) and a new set of fully custom branded components for everything the mockup renders distinctively |

---

## 3. Design tokens

New file: `src/theme/tokens.ts` — the single source of truth every other piece reads from.

- **Colors**: backgrounds `#08090b` / `#0b0d10`, surface `#14181e`, accent `#ff4b3e` (hover/press `#ff6c60`), success/stable `#3de0c8`, warning/pending `#ffc44d`, text `#f2f4f7` at full/60%/45%/30% opacity variants, border `rgba(255,255,255,.09)` (and `.12`/`.16` variants)
- **Typography**: three font families —
  - **Barlow** — body copy
  - **Barlow Condensed**, bold — big uppercase display headings
  - **IBM Plex Mono** — small uppercase kicker labels and stat values
- **Shape**: a shared corner-cut size scale (small/medium/large) for `CutCornerSurface`/`CutCornerButton`

---

## 4. New shared components (`src/components/`)

| Component          | Responsibility                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------- |
| `ScreenHeader`     | Kicker label + big display heading (+ optional subtitle) — the pattern topping most screens |
| `KickerLabel`      | Small uppercase mono label, accent-colored                                                  |
| `DisplayHeading`   | Big bold condensed uppercase title                                                          |
| `CutCornerSurface` | The clip-path cut-corner card/panel background, via `react-native-svg`                      |
| `CutCornerButton`  | Primary CTA — cut corner, accent fill, press feedback (mobile has no hover, only press)     |
| `StatTile`         | Label + big value (+ optional unit suffix, + optional tint color)                           |
| `StatusTag`        | Small colored mono tag (e.g. GRANTED / PENDING / ONLINE / STABLE)                           |

Each component takes plain props (no dependency on app-specific state) so it's independently
usable from any screen, including future Duel screens.

---

## 5. Fonts

New dependencies: `@expo-google-fonts/barlow`, `@expo-google-fonts/barlow-condensed`,
`@expo-google-fonts/ibm-plex-mono`, plus `expo-font` and `react-native-svg` (for
`CutCornerSurface`/`CutCornerButton`). All are JS/asset-only — no native rebuild required,
so the current dev-client build still works.

Fonts load via `expo-font`'s `useFonts` hook at the `App` root. The existing loading-spinner
branch in `App.tsx` (currently gating only on Firebase auth state) extends to also wait on
font loading — one loading state, two conditions.

---

## 6. Migration

- `src/theme/appTheme.ts` becomes a dark Paper theme built from the tokens in §3 — still
  backs the three Paper components still in use (`SegmentedButtons`, `ActivityIndicator`,
  `Snackbar`)
- `App.tsx` restructured so **one** `PaperProvider` + the dark theme wraps every screen,
  including the pre-auth Login/Register gate (currently outside it, with its own hardcoded
  dark styles) — necessary so the new shared components, which read Paper's theme for a few
  values, work there too
- `LoginScreen`/`RegisterScreen` rebuilt on `ScreenHeader` + `CutCornerButton` instead of
  their current one-off `StyleSheet`
- `MapScreen` and its cards (`MapStatusCard`, `LocationStatusCard`, `PresenceStatusSnackbar`,
  `RecenterButton`) and `BleScreen` move from the current light theme to the new dark one,
  adopting `StatTile`/`StatusTag`/`CutCornerSurface` wherever the mockup shows that pattern
  (e.g. the "ONLINE"/"VISIBLE" stat pair, the nearest-rival card)

---

## 7. Explicitly out of scope

- Duel screens (don't exist as code yet — out of scope per the Map + Duel implementation
  design, [`2026-09-06-map-duel-implementation-design.md`](./2026-09-06-map-duel-implementation-design.md))
- The mockup's Ranks/Agent/Settings screens (already out of scope per that same document)
- Any change to map/BLE/auth _behavior_ — this is a visual-only pass

---

## 8. Testing

No existing UI test/snapshot framework in this repo. Verification is:

- `tsc --noEmit` clean after every meaningful change
- Metro bundling cleanly (catches real import/runtime errors beyond type-checking)
- Visual, on-device confirmation — deferred to the user, since headless verification can't
  judge whether cut corners/fonts/colors actually look right

---

## 9. Next step

Invoke the **writing-plans** skill to produce a phased task checklist under
`docs/superpowers/plans/`.

# Connectivity Rewrite: WebRTC over WiFi (Gameplay v2 transport)

Covers roadmap items 15–24 (`docs/product-design/Roadmap.md`, Phase 3): replacing BLE entirely with a WebRTC data channel negotiated over WiFi, using the QR handoff as the pairing point.
Written as its own spec for the same reason as the fire-mechanic spec — several non-obvious calls got made across a long design conversation, and an independent implementer starting from the roadmap's one-line bullets alone could plausibly land on different, conflicting answers for each piece.

## Why this exists

`UI.md` names WebRTC as the primary connection method with Bluetooth as fallback; the current implementation only has BLE (a mock-backed session layer per the team's own status notes — real BLE peripheral-mode discovery was never solved).
Per the design decision made this session, WebRTC becomes the **sole** transport — not additive.
`DuelChannel`/`DuelMessage` (`src/contracts/duelChannel.ts`) already abstracts duel logic away from the transport, so none of the duel gameplay code needs to change; this spec is entirely about what sits behind that interface.

## End-to-end flow

1. **Host chooses a connection mode** on the QR-display screen: use the current WiFi network, or create a hotspot. This is an explicit toggle the host picks, not silent auto-detection with fallback — auto-detect-and-retry is harder to get right and slower to fail visibly than just asking. (Flagging this as a call made to resolve an ambiguity the roadmap left open — revisit if you disagree.)
2. **Existing-WiFi mode:** the host doesn't need to know its own SSID or password — if both players are already on the same network, the joiner doesn't need to "join" anything. The host just needs its own local IP on that network. QR encodes `{ hostIp, signalPort }` only.
3. **Hotspot mode:**
   - **Android:** `WifiManager.startLocalOnlyHotspot()` creates an internet-less, app-scoped WiFi AP and returns its SSID/password automatically — no user interaction beyond the initial permission grant (`NEARBY_WIFI_DEVICES` on API 33+, `ACCESS_FINE_LOCATION` below that).
   - **iOS:** no creation API exists. The host manually enables Personal Hotspot in Settings, then types the password into the app once (the app can't read it). The host's own address on that interface is always the fixed `172.20.10.1` — no detection needed, hardcode it once hotspot mode + iOS is selected.
   - QR encodes `{ hostIp, signalPort, ssid, password }`. Regenerate the QR if the host switches modes or the hotspot is recreated.
4. **Joiner scans the QR.** If `ssid`/`password` are present (hotspot mode), call `react-native-wifi-reborn`'s join function — wraps iOS's `NEHotspotConfiguration` and Android's network-request API behind one call, one OS confirmation dialog either platform.
   If absent (existing-WiFi mode), skip straight to step 5; if the device isn't actually on the same network, the next step fails with a clear "couldn't reach host" error, which should suggest the host switch to hotspot mode rather than trying to guess or retry silently.
5. **Joiner opens a socket** to `hostIp:signalPort` — a small local TCP/WS server the host runs, existing purely for the SDP/ICE handshake, no internet server involved.
6. **Authenticate the signaling connection:** the joiner's first message must include the QR payload's `challengeToken`/`discoveryToken`. The host validates these against what it issued before proceeding — this is the fix from the pushback review; without it, on existing-WiFi mode the signaling port is reachable by anyone else on that network, not just the intended opponent.

   **Token freshness on reconnect (item 24) — decided under the mid-October deadline, flag to your human before building this piece:** the QR's `challengeToken`/`discoveryToken` are only valid for `INVITE_LIFETIME_MS` (60s), meant for the initial pairing window.
   A mid-match reconnect (item 24) could happen well past that window. Three ways to handle it, in order of what a non-time-pressured team would prefer:
   1. Mint a short-lived session-local secret once the channel first establishes, exchanged over that now-trusted channel, and authenticate reconnects against that instead of the QR's own expiry — decouples reconnect auth from initial-pairing auth correctly, but is more to build.
   2. **Selected for now:** extend `expiresAt` to cover the whole match duration instead of just initial pairing.
      This only affects the reconnect-auth validation window on the token already captured into `ChallengeHandoff` at scan time — it does not touch `QrDisplayScreen.tsx`'s own regeneration timer, which is only live during pairing and is already dismissed before a mid-match reconnect could happen.
      Simpler, ships faster, but weakens the original short-lived-invite anti-replay intent for the rest of the match.
   3. Leave reconnect auth unspecified and decide during implementation — cheapest today, but risks shipping a reconnect that silently fails exactly when it's needed.

   Selected option 2 given the timeline, not because it's the strongest answer — whoever picks up this item should raise this tradeoff with their team before treating it as final.

7. **Exchange SDP offer/answer and ICE candidates** over that authenticated socket. Host-only ICE candidates — same LAN, no STUN/TURN needed.
8. **Establish `RTCPeerConnection` + `DataChannel`.** Once open, wrap it in an object implementing the existing `DuelChannel` interface (`send`/`onMessage`/`isConnected`) so `fireSignalCoordinator.ts`, `roundLoop.ts`, etc. work completely unmodified — this is the same seam `mockDuelSessionTransport.ts`/`bleDuelSessionTransport.ts` already sit behind.
9. **Close the signaling socket** once the data channel is open — it's not needed afterward.
   On a mid-match disconnect, re-run the full handshake from step 5 (fresh socket, fresh SDP/ICE exchange) rather than keeping the signaling socket alive as a standing reconnection path, consistent with how `disconnectRecovery.ts` already treats reconnection as "start over," not "resume a held-open channel."
   **Decided, with the reasoning kept here since it isn't obvious:** a kept-alive signaling socket only saves the TCP handshake + token re-check (tens of milliseconds on a LAN) — and only if it happens to survive whatever killed the data channel in the first place.
   Making that reliable needs its own heartbeat/keepalive logic, since a socket held open for a whole match can silently die without either side noticing — real added complexity for a small, conditional time saving.
   What actually makes a reconnect feel seamless to the players is (a) detecting the drop and retrying automatically, no manual QR-rescan or button press, and (b) **preserving in-progress match state** — the reconnect handler must carry the current `RoundLoopState` (score, round number) through the new channel, not just re-establish a connection and lose track of the score.
   Both of those are independent of the socket-lifecycle choice, which is why it isn't the lever to spend engineering effort on.
10. **Clock-offset calibration** runs over the now-established data channel, during the existing pre-round calibration screen (see `Gameplay-v2.md`'s reaction-timing-fairness discussion in the roadmap): a ping-pong RTT exchange, `offset ≈ ((t1-t0)-(t3-t2))/2`, applied to correct received timestamps before `fireSignalCoordinator.ts`/`reactionTimer.ts` compute `reactionMs`.

## QR payload shape

Extends the existing `QrInvitePayload` (`src/features/qr/types/qr.types.ts`), which currently has `transport: "ble"` + `ble: { discoveryToken }`:

```ts
connection:
  | { mode: "existingWifi"; hostIp: string; signalPort: number }
  | { mode: "hotspot"; hostIp: string; signalPort: number; ssid: string; password: string }
```

A discriminated union rather than optional `ssid`/`password` fields on one shape — keeps the type honest about which fields exist in which mode, and lets `QrScannerScreen.tsx` branch on `mode` directly instead of checking for `undefined`.

## Files touched

- `src/features/qr/types/qr.types.ts` — replace the `ble` transport field with the `connection` union above
- `src/features/challenge/QrDisplayScreen.tsx` — mode toggle UI, hotspot creation (Android automatic, iOS manual-instructions + password entry), QR regeneration on mode/network change
- `src/features/challenge/QrScannerScreen.tsx` — parse `connection`, drive the join-network step
- New: `src/features/challenge/session/webrtcDuelSessionTransport.ts` — replaces `bleDuelSessionTransport.ts`; implements `DuelChannel` over `RTCPeerConnection`/`DataChannel`
- `src/features/duel/disconnectRecovery.ts` — on reconnect, carry the in-progress `RoundLoopState` (score, round number) through to the new channel instead of restarting the match; this is what actually makes reconnection feel seamless, not the signaling-socket lifecycle (see step 9 above)
- New: signaling client/server modules — host-side TCP/WS listener, joiner-side client, token-auth check
- New: a thin wrapper around `react-native-wifi-reborn` for the join step
- New: Android hotspot-creation integration — verify whether `react-native-wifi-reborn` covers `startLocalOnlyHotspot()` before writing a separate native module for it (open risk, see below)
- Delete entirely: `src/features/ble/BleScreen.tsx`, `bleRssi.ts`, `session/bleDuelSessionTransport.ts`, the BLE permission block in `app.json`, the `react-native-ble-manager` dependency
- `app.json` — add `NSLocalNetworkUsageDescription` to iOS `infoPlist`, add the `@config-plugins/react-native-webrtc` plugin entry
- `src/features/duel/DrawCalibrationScreen.tsx` — add the clock-offset ping-pong step
- `src/features/duel/fireSignalCoordinator.ts` / `reactionTimer.ts` — apply the resulting clock-offset correction

## Testing

- Unit-testable without a device: token-auth validation logic, the clock-offset RTT math, QR payload parsing/serialization for both `connection` modes — pure functions, same pattern as the existing `roundJudge`/`challengeRequestRepository` test coverage.
- Needs real hardware, two devices: actual hotspot creation/joining on both platforms, actual WebRTC negotiation and data-channel establishment, actual mid-match disconnect/reconnect behavior. None of this is meaningfully mockable — route it through the existing prod-readiness device QA pass (Phase 4, item 28).

## Open questions

- **Carried over from the roadmap:** does `react-native-wifi-reborn` cover Android's `startLocalOnlyHotspot()` hotspot-creation path, or does that need a separate native module call? Check before scoping the Android hotspot-creation work.
- iOS has no reliable public deep-link directly into the Personal Hotspot settings pane — `Linking.openSettings()` only opens the app's own settings page. Confirm the best achievable UX is "open the general Settings app + show instructions," not a precise jump.
- Whether the existing-WiFi host-IP lookup (step 2) needs any platform-specific handling, or whether a standard `expo-network`-style local-IP query is sufficient on both platforms — not verified here.

# 0001: WebRTC replaces BLE as the only duel transport

- **Status:** Accepted, 2026-10-05 (team decision); implemented 2026-10-08 under #51.
- **Supersedes:** the BLE transport in the submitted Assignment 1 plan.

## Context

The submitted plan paired phones over Bluetooth Low Energy.
`react-native-ble-manager` has no peripheral/advertising API, so the host phone could never be discovered, and the BLE session stayed a stub behind a mock transport.
The separation check before each round read a hard-coded −75 dBm instead of a measured RSSI.

## Decision

Duels run over a WebRTC DataChannel negotiated on the local network, as specified in `docs/superpowers/specs/2026-09-17-connectivity-rewrite-design.md`.
The team chose WebRTC because it considers it more reliable for this project; this is the project's rationale, not a measured comparison of the two transports.

- There is one live transport. The BLE screen, RSSI reader, BLE session transport, Bluetooth permissions and the `react-native-ble-manager` dependency are removed.
- The pre-round ritual still asks players to stand apart, but nothing measures the distance, and no screen claims it was measured.
- A mid-match drop re-runs the signaling handshake on the invite's port (`DuelLink.reconnect`) under `DuelDisconnectRecovery`.
  The phones then exchange the rounds each one judged and resume from the rounds they agree on.
- Reconnects authenticate with the QR invite's own tokens for the rest of the match (spec option 2, confirmed with the team on 2026-10-08).

## Consequences

- Both phones must share a network: an existing Wi-Fi network or a hotspot one phone creates.
- Anyone who captured the QR code could join during a reconnect window. Accepted for now; a per-session reconnect secret (spec option 1) is the upgrade path.
- Physical-device evidence for pairing, reconnect and rematch belongs to #54; unit tests cover the logic only.

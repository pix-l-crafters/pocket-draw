import type { QrInvitePayload } from "../types/qr.types";
import { parseQrInvite, validateQrInvite } from "./qr.validation";

const now = 1_800_000_000_000;

const validInvite: QrInvitePayload = {
  type: "pocket-draw/invite",
  version: 1,
  matchId: "0f9ee81d-68f0-47cb-8977-702fae0d1865",
  hostPlayerId: "host-123",
  hostPlayerName: "Host",
  challengeToken: "0123456789abcdef0123456789abcdef",
  discoveryToken: "89abcdef",
  issuedAt: now,
  expiresAt: now + 60_000,
  transport: "webrtc",
  connection: {
    mode: "existingWifi",
    hostIp: "192.168.1.42",
    signalPort: 43123
  }
};

describe("WebRTC QR invite validation", () => {
  it("accepts an existing-Wi-Fi invite and preserves its connection target", () => {
    expect(validateQrInvite(validInvite, "guest-456", now)).toEqual({
      ok: true,
      value: validInvite
    });
    expect(
      parseQrInvite(JSON.stringify(validInvite), "guest-456", now)
    ).toEqual({ ok: true, value: validInvite });
  });

  it.each([
    { hostIp: "0.0.0.0", signalPort: 43123 },
    { hostIp: "192.168.1.999", signalPort: 43123 },
    { hostIp: "192.168.1.42", signalPort: 0 },
    { hostIp: "192.168.1.42", signalPort: 65_536 }
  ])("rejects an unusable signaling target %#", (connection) => {
    expect(
      validateQrInvite({ ...validInvite, connection }, "guest-456", now)
    ).toEqual({ ok: false, code: "INVALID_PAYLOAD" });
  });

  it("rejects the retired BLE transport instead of silently using the wrong link", () => {
    expect(
      validateQrInvite(
        {
          ...validInvite,
          transport: "ble",
          ble: { discoveryToken: "89abcdef" }
        },
        "guest-456",
        now
      )
    ).toEqual({ ok: false, code: "UNSUPPORTED_TRANSPORT" });
  });
});

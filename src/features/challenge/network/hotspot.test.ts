import type { HotspotConnection } from "../../../contracts/duelConnection";
import type {
  DuelSessionTransport,
  DuelTransportConnection
} from "../session/duelSessionTransport";
import {
  joinHotspot,
  startAndroidLocalOnlyHotspot,
  withNetworkPreparation,
  withReconnectPreparation
} from "./hotspot";

// Test-only hotspot passphrase.
const FIXTURE_PASSPHRASE = "draw-4821";

const connection: HotspotConnection = {
  mode: "hotspot",
  ssid: "PocketDraw-A1B2",
  password: FIXTURE_PASSPHRASE,
  hostIp: "192.168.43.1",
  signalPort: 43123
};

describe("hotspot networking", () => {
  it("joins the protected hotspot described by the scanned QR payload", async () => {
    let joinedNetwork: unknown = null;

    await joinHotspot(connection, {
      connectToProtectedWifiSSID: async (options) => {
        joinedNetwork = options;
      }
    });

    expect(joinedNetwork).toEqual({
      ssid: "PocketDraw-A1B2",
      password: FIXTURE_PASSPHRASE,
      isWEP: false,
      isHidden: false,
      timeout: 15
    });
  });

  it("creates an Android local-only hotspot only after permission is granted", async () => {
    const events: string[] = [];

    await expect(
      startAndroidLocalOnlyHotspot({
        requestPermission: async () => {
          events.push("permission");
          return true;
        },
        startAsync: async () => {
          events.push("start");
          return {
            ssid: "PocketDraw-A1B2",
            password: FIXTURE_PASSPHRASE,
            hostIp: "192.168.43.1"
          };
        },
        stop: () => undefined
      })
    ).resolves.toEqual({
      ssid: "PocketDraw-A1B2",
      password: FIXTURE_PASSPHRASE,
      hostIp: "192.168.43.1"
    });
    expect(events).toEqual(["permission", "start"]);
  });

  it("does not create a hotspot when Android permission is denied", async () => {
    await expect(
      startAndroidLocalOnlyHotspot({
        requestPermission: async () => false,
        startAsync: async () => {
          throw new Error("must not start");
        },
        stop: () => undefined
      })
    ).rejects.toThrow("Nearby Wi-Fi permission is required");
  });

  it("prepares a hotspot once before retrying the underlying duel transport", async () => {
    const events: string[] = [];
    const transport: DuelSessionTransport = {
      async connect() {
        events.push("connect");
        throw new Error("signaling failed");
      }
    };
    const prepared = withNetworkPreparation(connection, transport, {
      connectToProtectedWifiSSID: async () => {
        events.push("join");
      }
    });
    const params = {
      role: "guest" as const,
      matchId: "match-123",
      discoveryToken: "89abcdef",
      opponentId: "host-123"
    };

    await expect(
      prepared.connect(params, new AbortController().signal)
    ).rejects.toThrow("signaling failed");
    await expect(
      prepared.connect(params, new AbortController().signal)
    ).rejects.toThrow("signaling failed");

    expect(events).toEqual(["join", "connect", "connect"]);
  });

  it("re-joins the hotspot once per recovery, since a drop often means the phone left it", async () => {
    const events: string[] = [];
    const outcomes = [false, true, true];
    const transport: DuelSessionTransport = {
      async connect() {
        events.push("connect");
        if (!outcomes.shift()) throw new Error("host unreachable");
        return {} as DuelTransportConnection;
      }
    };
    const reconnecting = withReconnectPreparation(connection, transport, {
      connectToProtectedWifiSSID: async () => {
        events.push("join");
      }
    });
    const params = {
      role: "guest" as const,
      matchId: "match-123",
      discoveryToken: "89abcdef",
      opponentId: "host-123"
    };
    const signal = new AbortController().signal;

    await expect(reconnecting.connect(params, signal)).rejects.toThrow(
      "host unreachable"
    );
    await reconnecting.connect(params, signal);
    // A later drop starts a new recovery, which joins again.
    await reconnecting.connect(params, signal);

    expect(events).toEqual(["join", "connect", "connect", "join", "connect"]);
  });
});

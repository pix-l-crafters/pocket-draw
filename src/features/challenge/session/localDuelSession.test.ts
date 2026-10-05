import type { DuelTransportConnection } from "./duelSessionTransport";
import { adoptDuelConnection, endLocalDuelSession } from "./localDuelSession";

jest.mock("../network/hotspot", () => ({
  releaseHotspotNetworks: jest.fn(async () => undefined)
}));

function fakeConnection(
  events: string[],
  name: string
): DuelTransportConnection {
  return {
    channel: {
      send: () => undefined,
      onMessage: () => () => undefined,
      isConnected: () => true
    },
    onDrop: () => undefined,
    disconnect: () => {
      events.push(`disconnect:${name}`);
    }
  };
}

describe("local duel session ownership", () => {
  it("closes the adopted link and releases hotspot networking once", () => {
    const events: string[] = [];
    const release = async () => {
      events.push("release");
    };
    adoptDuelConnection(fakeConnection(events, "duel"));

    endLocalDuelSession(release);
    endLocalDuelSession(release);

    expect(events).toEqual(["disconnect:duel", "release", "release"]);
  });

  it("closes a stale link when a new duel takes over", () => {
    const events: string[] = [];
    adoptDuelConnection(fakeConnection(events, "old"));
    adoptDuelConnection(fakeConnection(events, "new"));

    endLocalDuelSession(async () => undefined);

    expect(events).toEqual(["disconnect:old", "disconnect:new"]);
  });
});

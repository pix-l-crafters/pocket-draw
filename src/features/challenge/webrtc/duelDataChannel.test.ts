import type { DuelMessage } from "../../../contracts/duelChannel";
import {
  createDuelDataChannelConnection,
  isDuelMessage,
  type RtcDataChannelLike
} from "./duelDataChannel";

const MATCH_ID = "0f9ee81d-68f0-47cb-8977-702fae0d1865";

function fakePeer() {
  const failureHandlers = new Set<() => void>();
  return {
    close: jest.fn(),
    onFailure: (handler: () => void) => {
      failureHandlers.add(handler);
      return () => failureHandlers.delete(handler);
    },
    fail: () => failureHandlers.forEach((handler) => handler())
  };
}

class FakeDataChannel implements RtcDataChannelLike {
  readyState = "open";
  sent: string[] = [];
  closed = false;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.closed = true;
    this.readyState = "closed";
    this.onclose?.();
  }

  receive(data: unknown) {
    this.onmessage?.({ data });
  }
}

describe("WebRTC DuelChannel adapter", () => {
  it("rejects incoming raised messages without a valid zone", () => {
    const rtcChannel = new FakeDataChannel();
    const connection = createDuelDataChannelConnection(rtcChannel);
    const received: DuelMessage[] = [];
    connection.channel.onMessage((message) => received.push(message));

    rtcChannel.receive('{"type":"raised","atMs":1234,"reactionMs":420}');
    rtcChannel.receive(
      '{"type":"raised","atMs":1234,"reactionMs":420,"zone":"invalid"}'
    );
    rtcChannel.receive(
      '{"type":"raised","atMs":1234,"reactionMs":420,"zone":"miss"}'
    );

    expect(received).toEqual([
      { type: "raised", atMs: 1234, reactionMs: 420, zone: "miss" }
    ]);
    expect(connection.channel.isConnected()).toBe(true);
  });

  it("delivers only valid duel messages and honors unsubscribe", () => {
    const rtcChannel = new FakeDataChannel();
    const connection = createDuelDataChannelConnection(rtcChannel);
    const received: DuelMessage[] = [];
    const unsubscribe = connection.channel.onMessage((message) =>
      received.push(message)
    );

    rtcChannel.receive('{"type":"countdown","value":2}');
    rtcChannel.receive('{"type":"countdown","value":9}');
    rtcChannel.receive("not-json");
    unsubscribe();
    rtcChannel.receive('{"type":"ready"}');

    expect(received).toEqual([{ type: "countdown", value: 2 }]);
  });

  it("notifies drop listeners once for an unexpected close but not a local disconnect", () => {
    const droppedChannel = new FakeDataChannel();
    const dropped = createDuelDataChannelConnection(droppedChannel);
    const messages: string[] = [];
    dropped.onDrop((message) => messages.push(message));

    droppedChannel.onclose?.();
    droppedChannel.onclose?.();

    const localChannel = new FakeDataChannel();
    const local = createDuelDataChannelConnection(localChannel);
    local.onDrop((message) => messages.push(message));
    local.disconnect();

    expect(messages).toEqual(["The local duel connection was lost."]);
    expect(localChannel.closed).toBe(true);
  });

  it("closes the peer connection only after the DataChannel has flushed and closed", () => {
    const rtcChannel = new FakeDataChannel();
    const peer = fakePeer();
    const connection = createDuelDataChannelConnection(rtcChannel, peer);
    rtcChannel.close = () => {
      rtcChannel.readyState = "closing";
    };

    connection.disconnect();
    expect(peer.close).not.toHaveBeenCalled();

    rtcChannel.readyState = "closed";
    rtcChannel.onclose?.();
    expect(peer.close).toHaveBeenCalledTimes(1);
  });

  it("reports a drop when the peer connection fails under an open channel", () => {
    const peer = fakePeer();
    const connection = createDuelDataChannelConnection(
      new FakeDataChannel(),
      peer
    );
    const messages: string[] = [];
    connection.onDrop((message) => messages.push(message));

    peer.fail();

    expect(messages).toEqual(["The local duel connection was lost."]);
  });

  it.each(["miss", "bodyshot", "headshot"])(
    "accepts the raised zone %s",
    (zone) => {
      expect(
        isDuelMessage({ type: "raised", atMs: 0, reactionMs: 0, zone })
      ).toBe(true);
    }
  );

  it.each([
    { latitude: -90, longitude: -180, accuracy: 0, sampleAtMs: 0 },
    { latitude: 90, longitude: 180, accuracy: 12, sampleAtMs: 300 }
  ])(
    "delivers valid aim positions at geographic boundaries: %o",
    (position) => {
      const rtcChannel = new FakeDataChannel();
      const connection = createDuelDataChannelConnection(rtcChannel);
      const received: DuelMessage[] = [];
      connection.channel.onMessage((message) => received.push(message));

      rtcChannel.receive(JSON.stringify({ type: "aimPosition", ...position }));

      expect(received).toEqual([{ type: "aimPosition", ...position }]);
    }
  );

  it.each([
    ["latitude", -90.01],
    ["latitude", 90.01],
    ["longitude", -180.01],
    ["longitude", 180.01],
    ["accuracy", -1],
    ["sampleAtMs", -1],
    ["latitude", "0"],
    ["longitude", null],
    ["accuracy", undefined],
    ["sampleAtMs", null],
    ["sampleAtMs", undefined],
    ["sampleAtMs", "0"],
    ["sampleAtMs", false]
  ])("drops incoming aim positions with invalid %s: %s", (field, value) => {
    const rtcChannel = new FakeDataChannel();
    const connection = createDuelDataChannelConnection(rtcChannel);
    const received: DuelMessage[] = [];
    connection.channel.onMessage((message) => received.push(message));

    rtcChannel.receive(
      JSON.stringify({
        type: "aimPosition",
        latitude: 0,
        longitude: 0,
        accuracy: 0,
        sampleAtMs: 0,
        [field as string]: value
      })
    );

    expect(received).toEqual([]);
  });

  it("drops legacy aim positions that contain ageMs instead of sampleAtMs", () => {
    const rtcChannel = new FakeDataChannel();
    const connection = createDuelDataChannelConnection(rtcChannel);
    const received: DuelMessage[] = [];
    connection.channel.onMessage((message) => received.push(message));

    rtcChannel.receive(
      JSON.stringify({
        type: "aimPosition",
        latitude: 0,
        longitude: 0,
        accuracy: 0,
        ageMs: 0
      })
    );

    expect(received).toEqual([]);
  });

  it.each(["latitude", "longitude", "accuracy", "sampleAtMs"])(
    "rejects nonfinite %s in aim positions",
    (field) => {
      for (const value of [NaN, Infinity, -Infinity]) {
        expect(
          isDuelMessage({
            type: "aimPosition",
            latitude: 0,
            longitude: 0,
            accuracy: 0,
            sampleAtMs: 0,
            [field]: value
          })
        ).toBe(false);
      }
    }
  );

  it("accepts session messages and rejects malformed ones", () => {
    const keys = ['{"kind":"tie"}'];
    expect(isDuelMessage({ type: "leave" })).toBe(true);
    expect(
      isDuelMessage({
        type: "matchSync",
        matchId: MATCH_ID,
        roundKeys: keys,
        reply: false
      })
    ).toBe(true);
    expect(isDuelMessage({ type: "rematchOffer", matchId: MATCH_ID })).toBe(
      true
    );
    expect(isDuelMessage({ type: "rematchAccept", matchId: MATCH_ID })).toBe(
      true
    );

    expect(isDuelMessage({ type: "rematchOffer", matchId: "next" })).toBe(
      false
    );
    expect(
      isDuelMessage({
        type: "matchSync",
        matchId: MATCH_ID,
        roundKeys: [1],
        reply: false
      })
    ).toBe(false);
    expect(
      isDuelMessage({
        type: "matchSync",
        matchId: MATCH_ID,
        roundKeys: Array.from({ length: 5 }, () => "{}"),
        reply: true
      })
    ).toBe(false);
  });
});

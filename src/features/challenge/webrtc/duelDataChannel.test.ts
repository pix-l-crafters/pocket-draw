import type { DuelMessage } from "../../../contracts/duelChannel";
import {
  createDuelDataChannelConnection,
  type RtcDataChannelLike
} from "./duelDataChannel";

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
  it("serializes outgoing duel messages and reports the live connection state", () => {
    const rtcChannel = new FakeDataChannel();
    const connection = createDuelDataChannelConnection(rtcChannel);

    connection.channel.send({ type: "raised", atMs: 1234, reactionMs: 420 });

    expect(rtcChannel.sent).toEqual([
      '{"type":"raised","atMs":1234,"reactionMs":420}'
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
});

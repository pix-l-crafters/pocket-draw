import type { DuelChannel } from "../../contracts/duelChannel";
import { createMockDuelChannelPair } from "../../contracts/mocks/mockDuelChannel";
import {
  FalseStartCoordinator,
  type FalseStartOutcome
} from "./falseStartCoordinator";

const movement = (atMs: number) => ({ atMs, x: 2, y: 0, z: 0 });

// Only transport delivery is deferred; both coordinators and detectors are real.
function queuedPair() {
  const channels = createMockDuelChannelPair();
  const deliveries: Array<() => void> = [];
  const deferred = channels.map((channel): DuelChannel => ({
    ...channel,
    send: (message) => deliveries.push(() => channel.send(message))
  }));
  return { channels: deferred, deliveries };
}

describe("FalseStartCoordinator", () => {
  test.each(["button", "movement"])(
    "early %s reports one shared violation",
    (input) => {
      const { channels, deliveries } = queuedPair();
      const local = new FalseStartCoordinator(channels[0], "local", "peer");
      const peer = new FalseStartCoordinator(channels[1], "peer", "local");
      const notices: FalseStartOutcome[] = [];
      peer.onOutcome((outcome) => notices.push(outcome));
      local.arm();
      peer.arm();

      const outcome =
        input === "button"
          ? local.processLocalFire(100)
          : local.processLocalSample(movement(100));
      expect(outcome).toEqual({ kind: "falseStart", playerId: "local" });
      local.processLocalFire(101);
      local.processLocalSample(movement(102));
      expect(deliveries).toHaveLength(1);
      deliveries[0]();
      expect(notices).toEqual([{ kind: "falseStart", playerId: "local" }]);
      expect(local.hasFalseStarted("local")).toBe(true);
      expect(peer.hasFalseStarted("local")).toBe(true);
      local.dispose();
      peer.dispose();
    }
  );

  test("ignores local inputs and peer violations before arm, then local inputs after FIRE", () => {
    const [channel, peerChannel] = createMockDuelChannelPair();
    const local = new FalseStartCoordinator(channel, "local", "peer");
    const notices: FalseStartOutcome[] = [];
    local.onOutcome((outcome) => notices.push(outcome));
    expect(local.processLocalFire(0)).toBeNull();
    expect(local.processLocalSample(movement(0))).toBeNull();
    peerChannel.send({ type: "falseStart", atMs: 0 });
    local.arm();
    local.markFire(100);
    expect(local.processLocalFire(101)).toBeNull();
    expect(local.processLocalSample(movement(101))).toBeNull();
    expect(notices).toEqual([]);

    // Peer delivery can lag behind this phone's FIRE for the active round.
    peerChannel.send({ type: "falseStart", atMs: 99 });
    expect(notices).toEqual([{ kind: "falseStart", playerId: "peer" }]);
    expect(local.hasFalseStarted("peer")).toBe(true);
    local.dispose();
  });

  test.each([NaN, Infinity, -Infinity, -1])(
    "invalid timestamp %s cannot disqualify or send",
    (atMs) => {
      const { channels, deliveries } = queuedPair();
      const local = new FalseStartCoordinator(channels[0], "local", "peer");
      const notices: FalseStartOutcome[] = [];
      local.onOutcome((outcome) => notices.push(outcome));
      local.arm();
      expect(local.processLocalFire(atMs)).toBeNull();
      expect(local.processLocalSample(movement(atMs))).toBeNull();
      expect(notices).toEqual([]);
      expect(deliveries).toHaveLength(0);
      expect(local.hasFalseStarted("local")).toBe(false);
      // Invalid movement must not consume the detector's one-shot arm.
      expect(local.processLocalSample(movement(0))).toEqual({
        kind: "falseStart",
        playerId: "local"
      });
      expect(deliveries).toHaveLength(1);
      local.dispose();
    }
  );

  test.each([
    [0, 1],
    [1, 0]
  ])(
    "crossed violations converge when delivered in order %s, %s",
    (first, second) => {
      const { channels, deliveries } = queuedPair();
      const zulu = new FalseStartCoordinator(channels[0], "zulu", "alpha");
      const alpha = new FalseStartCoordinator(channels[1], "alpha", "zulu");
      let zuluNotice: FalseStartOutcome | null = null;
      let alphaNotice: FalseStartOutcome | null = null;
      zulu.onOutcome((outcome) => {
        zuluNotice = outcome;
      });
      alpha.onOutcome((outcome) => {
        alphaNotice = outcome;
      });
      zulu.arm();
      alpha.arm();
      zulu.processLocalFire(100);
      alpha.processLocalSample(movement(101));
      zulu.markFire(200);
      alpha.markFire(200);
      deliveries[first]();
      deliveries[second]();

      expect(zuluNotice).toEqual({ kind: "falseStart", playerId: "alpha" });
      expect(alphaNotice).toEqual({ kind: "falseStart", playerId: "alpha" });
      for (const coordinator of [zulu, alpha]) {
        // Consumers suppress both players' shots, not just the canonical offender.
        expect(coordinator.hasFalseStarted("zulu")).toBe(true);
        expect(coordinator.hasFalseStarted("alpha")).toBe(true);
        coordinator.dispose();
      }
    }
  );

  test("arm resets both offenders and movement detection; disposal detaches consumers", () => {
    const [channel, peerChannel] = createMockDuelChannelPair();
    let activeSubscriptions = 0;
    const subscribe = channel.onMessage;
    channel.onMessage = (handler) => {
      const detach = subscribe(handler);
      activeSubscriptions += 1;
      return () => {
        detach();
        activeSubscriptions -= 1;
      };
    };
    const local = new FalseStartCoordinator(channel, "local", "peer");
    const notices: FalseStartOutcome[] = [];
    const unsubscribe = local.onOutcome((outcome) => notices.push(outcome));
    local.arm();
    local.processLocalSample(movement(100));
    peerChannel.send({ type: "falseStart", atMs: 101 });
    local.arm();
    expect(local.getOutcome()).toBeNull();
    expect(local.hasFalseStarted("local")).toBe(false);
    expect(local.hasFalseStarted("peer")).toBe(false);
    expect(local.processLocalSample(movement(200))).toEqual({
      kind: "falseStart",
      playerId: "local"
    });
    unsubscribe();
    const noticeCount = notices.length;
    local.arm();
    local.processLocalFire(300);
    expect(notices).toHaveLength(noticeCount);
    local.dispose();
    expect(activeSubscriptions).toBe(0);
    expect(local.processLocalFire(400)).toBeNull();
    expect(local.processLocalSample(movement(400))).toBeNull();
    const replacement = new FalseStartCoordinator(channel, "local", "peer");
    replacement.arm();
    peerChannel.send({ type: "falseStart", atMs: 401 });
    expect(local.hasFalseStarted("peer")).toBe(false);
    expect(replacement.hasFalseStarted("peer")).toBe(true);
    expect(notices).toHaveLength(noticeCount);
    replacement.dispose();
    expect(activeSubscriptions).toBe(0);
  });

  test.each([false, true])(
    "disconnected or throwing send preserves the local notice (throw: %s)",
    (throws) => {
      const [channel] = createMockDuelChannelPair();
      const failingChannel: DuelChannel = {
        ...channel,
        isConnected: () => throws,
        send: () => {
          throw new Error("disconnected");
        }
      };
      const local = new FalseStartCoordinator(failingChannel, "local", "peer");
      const notices: FalseStartOutcome[] = [];
      local.onOutcome((outcome) => notices.push(outcome));
      local.arm();
      if (throws) {
        expect(() => local.processLocalFire(100)).toThrow("disconnected");
      } else {
        expect(local.processLocalFire(100)).toEqual({
          kind: "falseStart",
          playerId: "local"
        });
      }
      expect(notices).toEqual([{ kind: "falseStart", playerId: "local" }]);
      expect(local.getOutcome()).toEqual({
        kind: "falseStart",
        playerId: "local"
      });
      expect(local.processLocalSample(movement(101))).toBeNull();
      local.dispose();
    }
  );
});

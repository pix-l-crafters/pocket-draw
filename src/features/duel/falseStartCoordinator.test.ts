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
  test("first offenses warn both phones, restart keeps counts, and the second disqualifies", () => {
    const { channels, deliveries } = queuedPair();
    const local = new FalseStartCoordinator(channels[0], "local", "peer");
    const peer = new FalseStartCoordinator(channels[1], "peer", "local");
    local.arm(0);
    peer.arm(0);
    expect(local.processLocalFire(100)).toEqual({
      kind: "warning",
      playerId: "local",
      count: 1
    });
    deliveries.shift()?.();
    expect(peer.getWarningCount("local")).toBe(1);
    expect(peer.getOutcome()).toEqual({
      kind: "warning",
      playerId: "local",
      count: 1
    });
    expect(local.hasFalseStarted("local")).toBe(false);
    local.arm(1);
    peer.arm(1);
    expect(local.processLocalSample(movement(200))).toEqual({
      kind: "falseStart",
      playerId: "local"
    });
    deliveries.shift()?.();
    expect(peer.hasFalseStarted("local")).toBe(true);
    local.dispose();
    peer.dispose();
  });

  test("crossed early inputs warn both players and ignore an old attempt", () => {
    const { channels, deliveries } = queuedPair();
    const a = new FalseStartCoordinator(channels[0], "a", "b");
    const b = new FalseStartCoordinator(channels[1], "b", "a");
    a.arm(0);
    b.arm(0);
    a.processLocalFire(100);
    b.processLocalSample(movement(100));
    deliveries[1]();
    deliveries[0]();
    expect(a.getWarningCount("a")).toBe(1);
    expect(a.getWarningCount("b")).toBe(1);
    expect(b.getWarningCount("a")).toBe(1);
    expect(b.getWarningCount("b")).toBe(1);
    a.arm(1);
    b.arm(1);
    deliveries[0]();
    expect(b.hasFalseStarted("a")).toBe(false);
    a.dispose();
    b.dispose();
  });

  test("crossed second offenses disqualify both on either delivery order", () => {
    const { channels, deliveries } = queuedPair();
    const a = new FalseStartCoordinator(channels[0], "a", "b", undefined, {
      a: 1,
      b: 1
    });
    const b = new FalseStartCoordinator(channels[1], "b", "a", undefined, {
      a: 1,
      b: 1
    });
    a.arm(2);
    b.arm(2);
    a.processLocalFire(100);
    b.processLocalSample(movement(100));
    deliveries[1]();
    deliveries[0]();
    for (const coordinator of [a, b]) {
      expect(coordinator.getOutcome()).toEqual({
        kind: "falseStart",
        playerId: "a"
      });
      expect(coordinator.hasFalseStarted("a")).toBe(true);
      expect(coordinator.hasFalseStarted("b")).toBe(true);
      coordinator.dispose();
    }
  });
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
      expect(outcome).toEqual({ kind: "warning", playerId: "local", count: 1 });
      local.processLocalFire(101);
      local.processLocalSample(movement(102));
      expect(deliveries).toHaveLength(1);
      deliveries[0]();
      expect(notices).toEqual([
        { kind: "warning", playerId: "local", count: 1 }
      ]);
      expect(local.getWarningCount("local")).toBe(1);
      expect(peer.getWarningCount("local")).toBe(1);
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
        kind: "warning",
        playerId: "local",
        count: 1
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

      expect(zuluNotice).toEqual({
        kind: "warning",
        playerId: "alpha",
        count: 1
      });
      expect(alphaNotice).toEqual({
        kind: "warning",
        playerId: "zulu",
        count: 1
      });
      for (const coordinator of [zulu, alpha]) {
        expect(coordinator.getWarningCount("zulu")).toBe(1);
        expect(coordinator.getWarningCount("alpha")).toBe(1);
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
          kind: "warning",
          playerId: "local",
          count: 1
        });
      }
      expect(notices).toEqual([
        { kind: "warning", playerId: "local", count: 1 }
      ]);
      expect(local.getOutcome()).toEqual({
        kind: "warning",
        playerId: "local",
        count: 1
      });
      expect(local.processLocalSample(movement(101))).toBeNull();
      local.dispose();
    }
  );
});

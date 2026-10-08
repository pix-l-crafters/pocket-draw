import { createMockDuelChannelPair } from "../../contracts/mocks/mockDuelChannel";
import { ClockOffsetCalibrator } from "./clockOffsetCalibrator";

function queueClock(values: number[]): () => number {
  const queue = [...values];
  return () => {
    const next = queue.shift();
    if (next === undefined) {
      throw new Error("queueClock exhausted — test provided too few values");
    }
    return next;
  };
}

describe("ClockOffsetCalibrator", () => {
  test("calibrate resolves the skew between two clocks with no transport delay", async () => {
    const [channelA, channelB] = createMockDuelChannelPair();
    const skewMs = 400; // clock B is 400ms ahead of clock A
    let sharedMs = 1_000_000;

    const guest = new ClockOffsetCalibrator(channelA, () => sharedMs);
    const host = new ClockOffsetCalibrator(channelB, () => sharedMs + skewMs);

    const offsetMs = await guest.calibrate(1);

    expect(offsetMs).toBe(skewMs);
    expect(host.getOffsetMs()).toBe(0);
  });

  test("calibrates when Promise.withResolvers is unavailable", async () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(
      Promise,
      "withResolvers"
    );
    Object.defineProperty(Promise, "withResolvers", {
      configurable: true,
      value: undefined
    });
    const [guestChannel, hostChannel] = createMockDuelChannelPair();
    const guest = new ClockOffsetCalibrator(guestChannel, () => 10_000);
    const host = new ClockOffsetCalibrator(hostChannel, () => 10_400);

    try {
      await expect(guest.calibrate(1)).resolves.toBe(400);
    } finally {
      guest.dispose();
      host.dispose();
      if (originalDescriptor) {
        Object.defineProperty(Promise, "withResolvers", originalDescriptor);
      } else {
        Reflect.deleteProperty(Promise, "withResolvers");
      }
    }
  });

  test("both peers learn opposite offsets over the handed-off channel", async () => {
    const [guestChannel, hostChannel] = createMockDuelChannelPair();
    const guest = new ClockOffsetCalibrator(guestChannel, () => 10_000);
    const host = new ClockOffsetCalibrator(hostChannel, () => 10_400);

    await expect(
      Promise.all([guest.calibrate(1), host.calibrate(1)])
    ).resolves.toEqual([400, -400]);
  });

  test("rejects when the peer does not answer a calibration ping", async () => {
    jest.useFakeTimers();
    const [channel] = createMockDuelChannelPair();
    const calibrator = new ClockOffsetCalibrator(channel);
    const calibration = calibrator.calibrate(1);

    jest.advanceTimersByTime(2_000);
    await expect(calibration).rejects.toThrow("Clock calibration timed out.");
    calibrator.dispose();
    jest.useRealTimers();
  });

  test("retries a ping when the peer starts listening after calibration begins", async () => {
    jest.useFakeTimers();
    const [guestChannel, hostChannel] = createMockDuelChannelPair();
    const guest = new ClockOffsetCalibrator(guestChannel);
    let host: ClockOffsetCalibrator | null = null;
    const calibration = guest.calibrate(1);

    try {
      await jest.advanceTimersByTimeAsync(250);
      host = new ClockOffsetCalibrator(hostChannel, () => Date.now() + 400);
      await jest.advanceTimersByTimeAsync(1_750);
      await expect(calibration).resolves.toBe(400);
    } finally {
      guest.dispose();
      host?.dispose();
      jest.useRealTimers();
    }
  });

  test("dispose cancels an in-flight calibration and releases its ping listener", async () => {
    const [channel, peerChannel] = createMockDuelChannelPair();
    const calibrator = new ClockOffsetCalibrator(channel);
    const calibration = calibrator.calibrate(1);

    calibrator.dispose();
    await expect(calibration).rejects.toThrow(
      "Clock calibration was cancelled."
    );
    let pongReceived = false;
    peerChannel.onMessage((message) => {
      if (message.type === "clockPong") pongReceived = true;
    });
    peerChannel.send({ type: "clockPing", t0: 0 });
    expect(pongReceived).toBe(false);
  });

  test("calibrate keeps the offset from the lowest-RTT sample", async () => {
    const [channelA, channelB] = createMockDuelChannelPair();
    // sample0: rtt=120, offset=-10 | sample1: rtt=10 (lowest), offset=0 | sample2: rtt=100, offset=-10
    const guest = new ClockOffsetCalibrator(
      channelA,
      queueClock([0, 120, 200, 210, 300, 400])
    );
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const host = new ClockOffsetCalibrator(
      channelB,
      queueClock([50, 50, 205, 205, 340, 340])
    );

    const offsetMs = await guest.calibrate(3);

    expect(offsetMs).toBe(0);
  });

  test("dispose stops answering pings", () => {
    const [channelA, channelB] = createMockDuelChannelPair();
    const host = new ClockOffsetCalibrator(channelB, () => 999);
    host.dispose();

    let pongReceived = false;
    channelA.onMessage((message) => {
      if (message.type === "clockPong") pongReceived = true;
    });
    channelA.send({ type: "clockPing", t0: 0 });

    expect(pongReceived).toBe(false);
  });
});

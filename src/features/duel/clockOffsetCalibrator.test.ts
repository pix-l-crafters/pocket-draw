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

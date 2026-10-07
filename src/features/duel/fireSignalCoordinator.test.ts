import { createMockDuelChannelPair } from "../../contracts/mocks/mockDuelChannel";
import { ClockOffsetCalibrator } from "./clockOffsetCalibrator";
import { FireSignalCoordinator } from "./fireSignalCoordinator";
import { ReactionTimer } from "./reactionTimer";

describe("FireSignalCoordinator", () => {
  test("guest corrects the received fire signal's atMs by the configured clock offset", () => {
    const [hostChannel, guestChannel] = createMockDuelChannelPair();
    const host = new FireSignalCoordinator(hostChannel, "host", () => 1_000);
    const guest = new FireSignalCoordinator(
      guestChannel,
      "guest",
      Date.now,
      () => 300 // host's clock runs 300ms ahead of the guest's
    );

    host.markCountdownComplete();
    host.triggerFire();

    expect(guest.getSignal()?.atMs).toBe(700);
  });

  test("guest passes the fire signal's atMs through unchanged with no offset configured", () => {
    const [hostChannel, guestChannel] = createMockDuelChannelPair();
    const host = new FireSignalCoordinator(hostChannel, "host", () => 1_000);
    const guest = new FireSignalCoordinator(guestChannel, "guest");

    host.markCountdownComplete();
    host.triggerFire();

    expect(guest.getSignal()?.atMs).toBe(1_000);
  });

  test("skewed host and guest clocks produce identical reaction times", async () => {
    const [hostChannel, guestChannel] = createMockDuelChannelPair();
    let sharedNow = 10_000;
    const hostCalibrator = new ClockOffsetCalibrator(
      hostChannel,
      () => sharedNow + 400
    );
    const guestCalibrator = new ClockOffsetCalibrator(
      guestChannel,
      () => sharedNow
    );
    await Promise.all([
      hostCalibrator.calibrate(1),
      guestCalibrator.calibrate(1)
    ]);

    const host = new FireSignalCoordinator(
      hostChannel,
      "host",
      () => sharedNow + 400
    );
    const guest = new FireSignalCoordinator(
      guestChannel,
      "guest",
      () => sharedNow,
      () => guestCalibrator.getOffsetMs()
    );
    const hostTimer = new ReactionTimer();
    const guestTimer = new ReactionTimer();
    host.onFire((signal) => hostTimer.start(signal.atMs));
    guest.onFire((signal) => guestTimer.start(signal.atMs));
    host.markCountdownComplete();
    host.triggerFire();

    sharedNow += 650;
    expect([
      hostTimer.captureRaise(sharedNow + 400)?.reactionMs,
      guestTimer.captureRaise(sharedNow)?.reactionMs
    ]).toEqual([650, 650]);

    host.dispose();
    guest.dispose();
    hostCalibrator.dispose();
    guestCalibrator.dispose();
  });
});

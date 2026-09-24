import { createMockDuelChannelPair } from "../../contracts/mocks/mockDuelChannel";
import { FireSignalCoordinator } from "./fireSignalCoordinator";

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
});

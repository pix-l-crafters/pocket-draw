import { FIRE_WINDOW_MS, judgeRoundShots, toPlayerShot } from "./roundShots";

const host = { id: "host", name: "Host" };
const guest = { id: "guest", name: "Guest" };

describe("round shots", () => {
  it("gives the round to whoever fired first", () => {
    const outcome = judgeRoundShots(host, guest, {
      selfReactionMs: 310,
      opponentReactionMs: 288
    });

    expect(outcome).toMatchObject({ kind: "win", winnerId: guest.id });
  });

  it("awards the round even when the margin is a single millisecond", () => {
    const outcome = judgeRoundShots(host, guest, {
      selfReactionMs: 400,
      opponentReactionMs: 401
    });

    expect(outcome).toMatchObject({ kind: "win", winnerId: host.id });
  });

  it("beats an opponent who never fired", () => {
    const outcome = judgeRoundShots(host, guest, {
      selfReactionMs: 900,
      opponentReactionMs: null
    });

    expect(outcome).toMatchObject({ kind: "win", winnerId: host.id });
  });

  it("ties when neither player fired", () => {
    expect(
      judgeRoundShots(host, guest, {
        selfReactionMs: null,
        opponentReactionMs: null
      })
    ).toMatchObject({ kind: "tie", pointsEach: 0 });
  });

  it("ties only on an exactly equal pair of reaction times", () => {
    expect(
      judgeRoundShots(host, guest, {
        selfReactionMs: 275,
        opponentReactionMs: 275
      })
    ).toMatchObject({ kind: "tie" });
  });

  it("reaches the same verdict from either device's point of view", () => {
    const fromHost = judgeRoundShots(host, guest, {
      selfReactionMs: 220,
      opponentReactionMs: 640
    });
    const fromGuest = judgeRoundShots(guest, host, {
      selfReactionMs: 640,
      opponentReactionMs: 220
    });

    expect(fromHost).toEqual(fromGuest);
  });

  it("scores a missing shot as a miss at the edge of the FIRE window", () => {
    expect(toPlayerShot("host", null)).toEqual({
      playerId: "host",
      reactionMs: FIRE_WINDOW_MS,
      zone: "miss"
    });
  });
});

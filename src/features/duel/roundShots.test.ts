import { scoreRoundOutcome } from "./roundJudge";
import { FIRE_WINDOW_MS, judgeRoundShots, toPlayerShot } from "./roundShots";

const host = { id: "host", name: "Host" };
const guest = { id: "guest", name: "Guest" };

describe("round shots", () => {
  it("ties same-zone shots fired at 200ms and 250ms", () => {
    expect(
      judgeRoundShots(host, guest, {
        selfReactionMs: 200,
        opponentReactionMs: 250,
        selfZone: "bodyshot",
        opponentZone: "bodyshot",
        falseStartPlayer: null
      })
    ).toEqual({
      kind: "tie",
      zone: "bodyshot",
      pointsEach: 1,
      reactionMs: 200,
      opponentReactionMs: 250
    });
  });

  it("compares headshot and bodyshot points inside the tie window", () => {
    expect(
      judgeRoundShots(host, guest, {
        selfReactionMs: 200,
        opponentReactionMs: 250,
        selfZone: "bodyshot",
        opponentZone: "headshot",
        falseStartPlayer: null
      })
    ).toMatchObject({
      kind: "win",
      winnerId: guest.id,
      winnerZone: "headshot",
      winnerPoints: 2,
      loserPoints: 1
    });
  });

  it("gives an earlier bodyshot priority outside the tie window", () => {
    expect(
      judgeRoundShots(host, guest, {
        selfReactionMs: 200,
        opponentReactionMs: 450,
        selfZone: "bodyshot",
        opponentZone: "headshot",
        falseStartPlayer: null
      })
    ).toMatchObject({
      kind: "win",
      winnerId: host.id,
      winnerZone: "bodyshot",
      winnerPoints: 1,
      loserPoints: 0
    });
  });

  it("beats an opponent who never fired", () => {
    expect(
      judgeRoundShots(host, guest, {
        selfReactionMs: 900,
        opponentReactionMs: null,
        selfZone: "bodyshot",
        opponentZone: "miss",
        falseStartPlayer: null
      })
    ).toMatchObject({ kind: "win", winnerId: host.id });
  });

  it("ties when neither player fired", () => {
    expect(
      judgeRoundShots(host, guest, {
        selfReactionMs: null,
        opponentReactionMs: null,
        selfZone: "miss",
        opponentZone: "miss",
        falseStartPlayer: null
      })
    ).toMatchObject({ kind: "tie", pointsEach: 0 });
  });

  it("reaches the same verdict from either device with a faster miss", () => {
    const fromHost = judgeRoundShots(host, guest, {
      selfReactionMs: 220,
      opponentReactionMs: 640,
      selfZone: "miss",
      opponentZone: "headshot",
      falseStartPlayer: null
    });
    const fromGuest = judgeRoundShots(guest, host, {
      selfReactionMs: 640,
      opponentReactionMs: 220,
      selfZone: "headshot",
      opponentZone: "miss",
      falseStartPlayer: null
    });
    expect(fromHost).toEqual(fromGuest);
  });

  it("falls through a faster miss to the slower hit without replacing timings", () => {
    expect(
      judgeRoundShots(host, guest, {
        selfReactionMs: 220,
        opponentReactionMs: 640,
        selfZone: "miss",
        opponentZone: "bodyshot",
        falseStartPlayer: null
      })
    ).toEqual({
      kind: "win",
      winnerId: guest.id,
      winnerZone: "bodyshot",
      winnerPoints: 1,
      loserPoints: 0,
      reactionMs: 220,
      opponentReactionMs: 640
    });
  });

  it("awards zero points when both fired shots miss", () => {
    expect(
      judgeRoundShots(host, guest, {
        selfReactionMs: 150,
        opponentReactionMs: 450,
        selfZone: "miss",
        opponentZone: "miss",
        falseStartPlayer: null
      })
    ).toEqual({
      kind: "tie",
      zone: "miss",
      pointsEach: 0,
      reactionMs: 150,
      opponentReactionMs: 450
    });
  });

  it("scores a missing shot as a miss at the edge of the FIRE window", () => {
    expect(toPlayerShot("host", null, "miss")).toEqual({
      playerId: "host",
      reactionMs: FIRE_WINDOW_MS,
      zone: "miss"
    });
  });

  it("keeps the real reaction time on a fired miss", () => {
    expect(toPlayerShot("host", 125, "miss")).toEqual({
      playerId: "host",
      reactionMs: 125,
      zone: "miss"
    });
  });

  it("keeps the supplied zone on a fired hit", () => {
    expect(toPlayerShot("host", 125, "headshot")).toEqual({
      playerId: "host",
      reactionMs: 125,
      zone: "headshot"
    });
  });

  it("preserves the nonoffender headshot after a false start on either phone", () => {
    const fromHost = judgeRoundShots(host, guest, {
      selfReactionMs: null,
      opponentReactionMs: 640,
      selfZone: "miss",
      opponentZone: "headshot",
      falseStartPlayer: "self"
    });
    const fromGuest = judgeRoundShots(guest, host, {
      selfReactionMs: 640,
      opponentReactionMs: null,
      selfZone: "headshot",
      opponentZone: "miss",
      falseStartPlayer: "opponent"
    });
    expect(fromHost).toEqual({
      kind: "falseStart",
      playerId: host.id,
      nonOffenderId: guest.id,
      nonOffenderShot: { zone: "headshot", points: 2, reactionMs: 640 }
    });
    expect(fromGuest).toEqual(fromHost);
    expect(scoreRoundOutcome(fromHost, host.id, guest.id)).toEqual([
      { playerId: host.id, points: 0 },
      { playerId: guest.id, points: 2 }
    ]);
  });

  it("keeps a captured nonoffender miss and its timing after a false start", () => {
    const outcome = judgeRoundShots(host, guest, {
      selfReactionMs: null,
      opponentReactionMs: 420,
      selfZone: "miss",
      opponentZone: "miss",
      falseStartPlayer: "self"
    });
    expect(outcome).toEqual({
      kind: "falseStart",
      playerId: host.id,
      nonOffenderId: guest.id,
      nonOffenderShot: { reactionMs: 420, zone: "miss", points: 0 }
    });
    expect(scoreRoundOutcome(outcome, host.id, guest.id)).toEqual([
      { playerId: host.id, points: 0 },
      { playerId: guest.id, points: 0 }
    ]);
  });

  it("does not invent a nonoffender shot when they never fired", () => {
    expect(
      judgeRoundShots(host, guest, {
        selfReactionMs: null,
        opponentReactionMs: null,
        selfZone: "miss",
        opponentZone: "miss",
        falseStartPlayer: "self"
      })
    ).toEqual({
      kind: "falseStart",
      playerId: host.id,
      nonOffenderId: guest.id,
      nonOffenderShot: null
    });
  });
});

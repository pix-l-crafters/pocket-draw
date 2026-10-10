import { render } from "@testing-library/react-native";

import type { MissReason, RoundOutcome } from "../../contracts/roundOutcome";
import { DUEL_CUES } from "./countdownAudio";

jest.mock("./countdownAudio", () => ({
  DUEL_CUES: {
    gameBegin: 1,
    countdown3: 2,
    countdown2: 3,
    countdown1: 4,
    fire: 5,
    gunshot: 6,
    headshot: 7,
    bodyshot: 8,
    miss: 9,
    falseStart: 10
  }
}));
import { RoundResultScreen } from "./RoundResultScreen";

const mockResultPlayers = new Map<unknown, jest.Mock>();
jest.mock("expo-audio", () => ({
  setAudioModeAsync: jest.fn(async () => undefined),
  useAudioPlayer: (source: unknown) => {
    if (!mockResultPlayers.has(source))
      mockResultPlayers.set(source, jest.fn());
    return { seekTo: jest.fn(), play: mockResultPlayers.get(source) };
  }
}));

const playerNames = { hana: "Hana", gil: "Gil" };
const missTie: RoundOutcome = {
  kind: "tie",
  zone: "miss",
  pointsEach: 0,
  reactionMs: 200,
  opponentReactionMs: 2700
};

it.each([
  ["headshot", DUEL_CUES.headshot],
  ["bodyshot", DUEL_CUES.bodyshot],
  ["miss", DUEL_CUES.miss]
] as const)("plays the local %s zone cue on a tie", async (zone, source) => {
  mockResultPlayers.clear();
  await render(
    <RoundResultScreen
      onContinue={() => undefined}
      opponentReactionMs={200}
      outcome={{
        kind: "tie",
        zone,
        pointsEach: 0,
        reactionMs: 200,
        opponentReactionMs: 200
      }}
      playerNames={playerNames}
      roundNumber={1}
      selfReactionMs={200}
      selfZone={zone}
      audioMuted={false}
    />
  );
  expect(mockResultPlayers.get(source)).toHaveBeenCalledTimes(1);
});

it("plays only the false-start cue for a false-start result", async () => {
  mockResultPlayers.clear();
  await render(
    <RoundResultScreen
      onContinue={() => undefined}
      opponentReactionMs={null}
      outcome={{
        kind: "falseStart",
        playerId: "hana",
        nonOffenderId: "gil",
        nonOffenderShot: null
      }}
      playerNames={playerNames}
      roundNumber={1}
      selfReactionMs={null}
      selfZone="miss"
      audioMuted={false}
    />
  );
  expect(mockResultPlayers.get(DUEL_CUES.falseStart)).toHaveBeenCalledTimes(1);
  expect(mockResultPlayers.get(DUEL_CUES.miss)).toBeUndefined();
});

it("keeps the result silent when duel audio is muted", async () => {
  mockResultPlayers.clear();
  await render(
    <RoundResultScreen
      audioMuted
      onContinue={() => undefined}
      opponentReactionMs={null}
      outcome={missTie}
      playerNames={playerNames}
      roundNumber={1}
      selfReactionMs={null}
      selfZone="miss"
    />
  );
  expect(mockResultPlayers.get(DUEL_CUES.miss)).not.toHaveBeenCalled();
});

it("associates miss explanations and correction hints with each player", async () => {
  const view = await render(
    <RoundResultScreen
      onContinue={() => undefined}
      opponentReactionMs={2700}
      outcome={{
        ...missTie,
        misses: [
          { playerId: "hana", reason: "tooLow" },
          { playerId: "gil", reason: "tooHigh" }
        ]
      }}
      playerNames={playerNames}
      roundNumber={1}
      selfReactionMs={200}
    />
  );

  expect(
    view.getByRole("image", { name: /Hana.*raised too little/i })
  ).toBeTruthy();
  expect(
    view.getByRole("image", { name: /Gil.*raised too far/i })
  ).toBeTruthy();
  expect(view.getByText(/Raise further/i)).toBeTruthy();
  expect(view.getByText(/Lower your raise/i)).toBeTruthy();
});

it("does not invent explanations for historical rounds without diagnostics", async () => {
  const view = await render(
    <RoundResultScreen
      onContinue={() => undefined}
      opponentReactionMs={2700}
      outcome={missTie}
      playerNames={playerNames}
      roundNumber={1}
      selfReactionMs={200}
    />
  );

  expect(view.queryAllByRole("image")).toHaveLength(0);
  expect(view.getByText("Next round")).toBeTruthy();
});

it.each<{ reason: MissReason; explanation: RegExp }>([
  { reason: "offTarget", explanation: /aimed outside the opponent's cone/i },
  {
    reason: "tiltUnavailable",
    explanation: /couldn't read the phone's tilt/i
  },
  { reason: "compassUnavailable", explanation: /compass not ready/i },
  {
    reason: "locationUnavailable",
    explanation: /location signal too weak/i
  },
  {
    reason: "opponentLocationUnavailable",
    explanation: /couldn't get the opponent's location/i
  },
  {
    reason: "trackingUnavailable",
    explanation: /tracking could not verify the shot/i
  },
  { reason: "noShot", explanation: /did not fire before time ran out/i }
])(
  "shows $reason diagnostics on wins and false starts",
  async ({ reason, explanation }) => {
    const outcomes: RoundOutcome[] = [
      {
        kind: "win",
        winnerId: "hana",
        winnerZone: "bodyshot",
        loserZone: "miss",
        winnerPoints: 1,
        loserPoints: 0,
        reactionMs: 200,
        opponentReactionMs: 2700
      },
      {
        kind: "falseStart",
        playerId: "hana",
        nonOffenderId: "gil",
        nonOffenderShot: null
      }
    ];

    for (const outcome of outcomes) {
      const view = await render(
        <RoundResultScreen
          onContinue={() => undefined}
          opponentReactionMs={2700}
          outcome={{ ...outcome, misses: [{ playerId: "gil", reason }] }}
          playerNames={playerNames}
          roundNumber={1}
          selfReactionMs={200}
        />
      );
      expect(view.getByRole("image", { name: /Gil/ })).toBeTruthy();
      expect(view.getByText(explanation)).toBeTruthy();
      await view.unmount();
    }
  }
);

it("illustrates the false-start offender without blaming the opponent", async () => {
  const view = await render(
    <RoundResultScreen
      onContinue={() => undefined}
      opponentReactionMs={2700}
      outcome={{
        kind: "falseStart",
        playerId: "hana",
        nonOffenderId: "gil",
        nonOffenderShot: { reactionMs: 420, zone: "headshot", points: 2 }
      }}
      playerNames={playerNames}
      roundNumber={1}
      selfReactionMs={200}
    />
  );

  expect(
    view.getByRole("image", { name: /Hana.*false start.*before.*FIRE/i })
  ).toBeTruthy();
  expect(view.queryByRole("image", { name: /Gil.*false start/i })).toBeNull();
  expect(view.getByText(/stay still.*countdown/i)).toBeTruthy();
});

it("labels reaction times by player, not by shot order", async () => {
  const view = await render(
    <RoundResultScreen
      onContinue={() => undefined}
      opponentReactionMs={180}
      outcome={{
        kind: "win",
        winnerId: "gil",
        winnerZone: "bodyshot",
        loserZone: "headshot",
        winnerPoints: 1,
        loserPoints: 0,
        reactionMs: 180,
        opponentReactionMs: 240
      }}
      playerNames={playerNames}
      roundNumber={1}
      selfReactionMs={240}
      selfZone="headshot"
      opponentZone="bodyshot"
    />
  );

  // The opponent fired first, yet "Your shot" still shows this player's time.
  expect(view.getByText("Your shot")).toBeTruthy();
  expect(view.getByText(/^240/)).toBeTruthy();
  expect(view.getByText("Their shot")).toBeTruthy();
  expect(view.getByText(/^180/)).toBeTruthy();
  expect(view.getByText("Gil — BODYSHOT (1 pt)")).toBeTruthy();
  expect(view.getByText("Headshot")).toBeTruthy();
  expect(view.getByText("Body shot")).toBeTruthy();
});

it("shows both players' zones after a false start", async () => {
  const view = await render(
    <RoundResultScreen
      onContinue={() => undefined}
      opponentReactionMs={420}
      opponentZone="headshot"
      outcome={{
        kind: "falseStart",
        playerId: "hana",
        nonOffenderId: "gil",
        nonOffenderShot: { reactionMs: 420, zone: "headshot", points: 2 }
      }}
      playerNames={playerNames}
      roundNumber={1}
      selfReactionMs={null}
      selfZone="miss"
    />
  );

  expect(view.getByText("Miss")).toBeTruthy();
  expect(view.getByText("Headshot")).toBeTruthy();
});

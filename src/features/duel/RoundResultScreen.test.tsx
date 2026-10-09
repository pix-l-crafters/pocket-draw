import { render } from "@testing-library/react-native";

import type { MissReason, RoundOutcome } from "../../contracts/roundOutcome";
import { RoundResultScreen } from "./RoundResultScreen";

const playerNames = { hana: "Hana", gil: "Gil" };
const missTie: RoundOutcome = {
  kind: "tie",
  zone: "miss",
  pointsEach: 0,
  reactionMs: 200,
  opponentReactionMs: 2700
};

it("associates miss explanations and correction hints with each player", async () => {
  const view = await render(
    <RoundResultScreen
      onContinue={() => undefined}
      outcome={{
        ...missTie,
        misses: [
          { playerId: "hana", reason: "tooLow" },
          { playerId: "gil", reason: "tooHigh" }
        ]
      }}
      playerNames={playerNames}
      roundNumber={1}
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
      outcome={missTie}
      playerNames={playerNames}
      roundNumber={1}
    />
  );

  expect(view.queryAllByRole("image")).toHaveLength(0);
  expect(view.getByText("Next round")).toBeTruthy();
});

it.each<{ reason: MissReason; explanation: RegExp }>([
  { reason: "offTarget", explanation: /aimed outside the opponent's cone/i },
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
          outcome={{ ...outcome, misses: [{ playerId: "gil", reason }] }}
          playerNames={playerNames}
          roundNumber={1}
        />
      );
      expect(view.getByRole("image", { name: /Gil/ })).toBeTruthy();
      expect(view.getByText(explanation)).toBeTruthy();
      expect(view.queryByRole("image", { name: /Hana/ })).toBeNull();
      await view.unmount();
    }
  }
);

import { act, fireEvent, render } from "@testing-library/react-native";
import { PaperProvider } from "react-native-paper";

import { createMockDuelChannelPair } from "../../contracts/mocks/mockDuelChannel";
import { appTheme } from "../../theme/appTheme";
import { submitMatchResult } from "../backend/matchResultsService";
import type { SubmitMatchResultOutcome } from "../backend/types";
import { DuelScreen } from "./DuelScreen";

jest.mock("../backend/matchResultsService", () => ({
  submitMatchResult: jest.fn()
}));

jest.mock("./clockOffsetCalibrator", () => ({
  ClockOffsetCalibrator: jest.fn().mockImplementation(() => ({
    calibrate: async () => 0,
    dispose: () => undefined
  }))
}));

// Drive completed shots at the hardware boundary; keep scoring and screens real.
jest.mock("./PreRound", () => ({
  PreRound: ({ onRoundShots }: { onRoundShots: (shots: unknown) => void }) => {
    const { Button } = require("react-native");
    return (
      <Button
        title="Finish round"
        onPress={() =>
          onRoundShots({
            selfReactionMs: 100,
            opponentReactionMs: 200
          })
        }
      />
    );
  }
}));

async function renderDuel() {
  const [channel] = createMockDuelChannelPair();
  return render(
    <PaperProvider theme={appTheme}>
      <DuelScreen
        channel={channel}
        matchId="match-1"
        role="host"
        self={{ id: "player-a", name: "Alice" }}
        opponent={{ id: "player-b", name: "Bob" }}
      />
    </PaperProvider>
  );
}

async function finishMatch(view: Awaited<ReturnType<typeof renderDuel>>) {
  for (let round = 0; round < 3; round += 1) {
    await fireEvent.press(view.getByText("Finish round"));
    if (round < 2) await fireEvent.press(view.getByText("Next round"));
  }
}

describe("DuelScreen result saving", () => {
  beforeEach(() => jest.mocked(submitMatchResult).mockReset());

  test.each(["written", "queued"] as const)(
    "waits for a %s result before showing the summary",
    async (status) => {
      let resolveSave!: (outcome: SubmitMatchResultOutcome) => void;
      jest.mocked(submitMatchResult).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveSave = resolve;
          })
      );
      const view = await renderDuel();
      await fireEvent.press(view.getByText("Finish round"));
      expect(submitMatchResult).not.toHaveBeenCalled();
      await fireEvent.press(view.getByText("Next round"));
      for (let round = 1; round < 3; round += 1) {
        await fireEvent.press(view.getByText("Finish round"));
        if (round < 2) await fireEvent.press(view.getByText("Next round"));
      }
      expect(submitMatchResult).toHaveBeenCalledTimes(1);
      expect(submitMatchResult).toHaveBeenCalledWith(
        expect.objectContaining({
          matchId: "match-1",
          participantIds: ["player-a", "player-b"],
          rounds: expect.any(Array),
          results: { "player-a": "win", "player-b": "lose" }
        }),
        "player-a"
      );
      await fireEvent.press(view.getByText("Saving result…"));
      expect(view.queryByText("Match complete")).toBeNull();
      await act(async () =>
        resolveSave(
          status === "written"
            ? { status, matchId: "match-1" }
            : { status, matchId: "match-1", reason: "offline" }
        )
      );
      await fireEvent.press(view.getByText("See match result"));
      expect(view.getByText("Match complete")).toBeTruthy();
      expect(submitMatchResult).toHaveBeenCalledTimes(1);
      await view.unmount();
    }
  );

  test("keeps the final round visible on failure and retries the same result", async () => {
    jest
      .mocked(submitMatchResult)
      .mockRejectedValueOnce(new Error("Permission denied"))
      .mockResolvedValueOnce({ status: "written", matchId: "match-1" });
    const view = await renderDuel();
    await finishMatch(view);
    expect(view.queryByText("Match complete")).toBeNull();
    expect(
      view.getByText("Could not save the match result. Please retry.")
    ).toBeTruthy();
    const firstResult = jest.mocked(submitMatchResult).mock.calls[0][0];
    await fireEvent.press(view.getByText("Retry saving result"));
    expect(jest.mocked(submitMatchResult).mock.calls[1][0]).toBe(firstResult);
    await fireEvent.press(view.getByText("See match result"));
    expect(view.getByText("Match complete")).toBeTruthy();
    await view.unmount();
  });

  test("saves a rematch under a distinct match ID", async () => {
    jest
      .mocked(submitMatchResult)
      .mockResolvedValue({ status: "written", matchId: "match-1" });
    const view = await renderDuel();
    await finishMatch(view);
    await fireEvent.press(view.getByText("See match result"));
    await fireEvent.press(view.getByText("Rematch"));
    await finishMatch(view);
    expect(submitMatchResult).toHaveBeenCalledTimes(2);
    expect(jest.mocked(submitMatchResult).mock.calls[1][0].matchId).not.toBe(
      "match-1"
    );
    await view.unmount();
  });
});

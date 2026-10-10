import { act, fireEvent, render } from "@testing-library/react-native";
import { PaperProvider } from "react-native-paper";

import { createMockDuelChannelPair } from "../../contracts/mocks/mockDuelChannel";
import { appTheme } from "../../theme/appTheme";
import { submitMatchAnalytics } from "../backend/matchAnalytics";
import {
  subscribeMatchResultStatus,
  submitMatchResult
} from "../backend/matchResultsService";
import type { SubmitMatchResultOutcome } from "../backend/types";
import { createDuelLink } from "../challenge/session/duelLink";
import { DuelScreen } from "./DuelScreen";
import type { PitchCalibration } from "./pitchMonitor";
import type { RoundShots } from "./roundShots";

const REMATCH_ID = "22222222-2222-4222-8222-222222222222";

jest.mock("../backend/matchAnalytics", () => ({
  submitMatchAnalytics: jest.fn(async () => "written"),
  subscribeAnalyticsStatus: jest.fn(() => () => undefined)
}));

jest.mock("../qr/utils/qr.tokens", () => ({
  generateMatchId: () => "22222222-2222-4222-8222-222222222222"
}));

jest.mock("../backend/matchResultsService", () => ({
  subscribeMatchResultStatus: jest.fn(() => () => undefined),
  submitMatchResult: jest.fn()
}));

jest.mock("./clockOffsetCalibrator", () => ({
  ClockOffsetCalibrator: jest.fn().mockImplementation(() => ({
    calibrate: async () => 0,
    dispose: () => undefined
  }))
}));

// Completion tests isolate saving; gameplay calibration is exercised separately.
jest.mock("./DrawCalibrationScreen", () => ({
  DrawCalibrationScreen: ({
    onComplete
  }: {
    onComplete: (calibration: PitchCalibration) => void;
  }) => {
    const { Button } = require("react-native");
    return (
      <Button
        title="Complete calibration"
        onPress={() => onComplete({ thetaReady: 0, thetaShoulder: 1 })}
      />
    );
  }
}));

// Saving tests drive completed shots at the round boundary, keeping scoring real.
jest.mock("./PreRound", () => ({
  PreRound: ({
    onRoundShots
  }: {
    onRoundShots: (shots: RoundShots) => void;
  }) => {
    const { Button } = require("react-native");
    return (
      <Button
        title="Finish round"
        onPress={() =>
          onRoundShots({
            selfReactionMs: 100,
            opponentReactionMs: 300,
            selfZone: "bodyshot",
            opponentZone: "bodyshot",
            falseStartPlayer: null
          })
        }
      />
    );
  }
}));

async function renderDuel() {
  const [channel, opponentChannel] = createMockDuelChannelPair();
  // Stands in for the other phone, which accepts any rematch it is offered.
  opponentChannel.onMessage((message) => {
    if (message.type === "matchSync" && !message.reply) {
      void Promise.resolve().then(() =>
        opponentChannel.send({ ...message, reply: true })
      );
      return;
    }
    if (message.type !== "rematchOffer") return;
    void Promise.resolve().then(() =>
      opponentChannel.send({ type: "rematchAccept", matchId: message.matchId })
    );
  });
  const link = createDuelLink({
    connection: {
      channel,
      onDrop: () => undefined,
      disconnect: () => undefined
    },
    reconnect: () => Promise.reject(new Error("unused"))
  });
  const view = await render(
    <PaperProvider theme={appTheme}>
      <DuelScreen
        link={link}
        matchId="match-1"
        role="host"
        self={{ id: "player-a", name: "Alice" }}
        opponent={{ id: "player-b", name: "Bob" }}
      />
    </PaperProvider>
  );
  await fireEvent.press(view.getByText("I'm Ready"));
  await fireEvent.press(view.getByText("Complete calibration"));
  return view;
}

async function finishMatch(view: Awaited<ReturnType<typeof renderDuel>>) {
  for (let round = 0; round < 3; round += 1) {
    await fireEvent.press(view.getByText("Finish round"));
    if (round < 2) await fireEvent.press(view.getByText("Next round"));
  }
}

describe("DuelScreen result saving", () => {
  test("saves one analytics document with all local rounds when the match completes", async () => {
    jest.mocked(submitMatchAnalytics).mockClear();
    jest
      .mocked(submitMatchResult)
      .mockResolvedValue({ status: "written", matchId: "match-1" });
    const view = await renderDuel();
    await finishMatch(view);
    await act(async () => {});
    expect(submitMatchAnalytics).toHaveBeenCalledTimes(1);
    expect(submitMatchAnalytics).toHaveBeenCalledWith(
      expect.objectContaining({
        matchId: "match-1",
        playerId: "player-a",
        calibration: { thetaReady: 0, thetaShoulder: 1 },
        rounds: [1, 2, 3].map((roundNumber) =>
          expect.objectContaining({
            roundNumber,
            reactionMs: 100,
            zone: "bodyshot"
          })
        )
      })
    );
  });
  beforeEach(() => {
    jest.mocked(submitMatchResult).mockReset();
    jest.mocked(submitMatchAnalytics).mockClear().mockResolvedValue("written");
  });

  test("shows a failed analytics save and retries without blocking the completed result", async () => {
    jest
      .mocked(submitMatchResult)
      .mockResolvedValue({ status: "written", matchId: "match-1" });
    jest
      .mocked(submitMatchAnalytics)
      .mockRejectedValueOnce(new Error("permission-denied"));
    const view = await renderDuel();
    await finishMatch(view);
    await fireEvent.press(view.getByText("See match result"));
    expect(view.getByText("Result saved")).toBeTruthy();
    expect(
      view.getByText("Could not save sensor data. Please retry.")
    ).toBeTruthy();
    await fireEvent.press(view.getByText("Retry saving sensor data"));
    expect(view.getByText("Sensor data saved")).toBeTruthy();
    expect(jest.mocked(submitMatchAnalytics).mock.calls[1][0]).toBe(
      jest.mocked(submitMatchAnalytics).mock.calls[0][0]
    );
    await view.unmount();
  });

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
      expect(
        view.getByText(
          status === "written"
            ? "Result saved"
            : "Result saved on this device · waiting to sync"
        )
      ).toBeTruthy();
      expect(submitMatchResult).toHaveBeenCalledTimes(1);
      await view.unmount();
    }
  );

  test("keeps the final round visible on failure and retries the same result", async () => {
    const saveError = new Error("Permission denied");
    const warn = jest
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    jest
      .mocked(submitMatchResult)
      .mockRejectedValueOnce(saveError)
      .mockResolvedValueOnce({ status: "written", matchId: "match-1" });
    const view = await renderDuel();
    await finishMatch(view);
    expect(view.queryByText("Match complete")).toBeNull();
    expect(
      view.getByText("Could not save the match result. Please retry.")
    ).toBeTruthy();
    expect(warn).toHaveBeenCalledWith(
      "Could not save the match result:",
      saveError
    );
    const firstResult = jest.mocked(submitMatchResult).mock.calls[0][0];
    await fireEvent.press(view.getByText("See match result"));
    expect(view.getByText("Could not sync result. Please retry.")).toBeTruthy();
    await fireEvent.press(view.getByText("Retry saving result"));
    expect(jest.mocked(submitMatchResult).mock.calls[1][0]).toBe(firstResult);
    expect(view.getByText("Match complete")).toBeTruthy();
    await view.unmount();
    warn.mockRestore();
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
    // The id both phones agreed when the rematch was accepted.
    expect(jest.mocked(submitMatchResult).mock.calls[1][0].matchId).toBe(
      REMATCH_ID
    );
    expect(submitMatchAnalytics).toHaveBeenCalledTimes(2);
    expect(jest.mocked(submitMatchAnalytics).mock.calls[1][0]).toMatchObject({
      matchId: REMATCH_ID,
      rounds: [1, 2, 3].map((roundNumber) =>
        expect.objectContaining({ roundNumber })
      )
    });
    await view.unmount();
  });
});

test("an open queued summary becomes written when background synchronization succeeds", async () => {
  jest.mocked(submitMatchResult).mockResolvedValue({
    status: "queued",
    matchId: "match-1",
    reason: "offline"
  });
  const view = await renderDuel();
  await finishMatch(view);
  await fireEvent.press(view.getByText("See match result"));
  expect(
    view.getByText("Result saved on this device · waiting to sync")
  ).toBeTruthy();
  const listener = jest
    .mocked(subscribeMatchResultStatus)
    .mock.calls.at(-1)![2];
  await act(async () => listener("written"));
  expect(view.getByText("Result saved")).toBeTruthy();
  await view.unmount();
});

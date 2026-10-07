import { render, userEvent } from "@testing-library/react-native";

import { getLeaderboard } from "../backend/leaderboardRepository";
import { LeaderboardScreen } from "./LeaderboardScreen";

jest.mock("../backend/leaderboardRepository", () => ({
  getLeaderboard: jest.fn()
}));

describe("LeaderboardScreen", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test("shows fetched players with rank and rating", async () => {
    jest.mocked(getLeaderboard).mockResolvedValue([
      {
        uid: "player",
        displayName: "Quick Draw",
        eloRating: 1500,
        wins: 0,
        losses: 0,
        avgReactionMs: null
      }
    ]);
    const screen = await render(<LeaderboardScreen onBack={jest.fn()} />);

    expect(await screen.findByText("Quick Draw")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("1500")).toBeTruthy();
  });

  test("shows the empty state for no users", async () => {
    jest.mocked(getLeaderboard).mockResolvedValue([]);
    const screen = await render(<LeaderboardScreen onBack={jest.fn()} />);

    expect(await screen.findByText("No players yet.")).toBeTruthy();
  });

  test("shows a read failure and lets the player retry", async () => {
    jest
      .mocked(getLeaderboard)
      .mockRejectedValueOnce(new Error("Read failed"))
      .mockResolvedValueOnce([]);
    const user = userEvent.setup();
    const screen = await render(<LeaderboardScreen onBack={jest.fn()} />);

    expect(
      await screen.findByText("Unable to load rankings. Please try again.")
    ).toBeTruthy();
    await user.press(screen.getByText("Retry"));

    expect(await screen.findByText("No players yet.")).toBeTruthy();
    expect(getLeaderboard).toHaveBeenCalledTimes(2);
  });
});

import { playerStatsRepository } from "../backend/playerStatsRepository";

jest.mock("../backend/playerStatsRepository", () => ({
  playerStatsRepository: { getPlayerStats: jest.fn() }
}));

import { render, userEvent } from "@testing-library/react-native";
import { PaperProvider } from "react-native-paper";

import { logoutUser, updateUsername } from "../../lib/auth";
import { appTheme } from "../../theme/appTheme";
import { ProfileScreen } from "./ProfileScreen";

jest.mock("../../lib/auth", () => ({
  logoutUser: jest.fn().mockResolvedValue(undefined),
  updateUsername: jest.fn().mockResolvedValue(undefined)
}));

// LeaderboardScreen pulls in the real (Firestore-backed) leaderboardRepository,
// which this suite has no reason to load — it only exercises ProfileScreen's
// own concerns (stats, logout, username edit).
jest.mock("../leaderboard/LeaderboardScreen", () => ({
  LeaderboardScreen: () => null
}));

jest.mock("../../lib/appVersion", () => ({
  getAppVersion: () => "9.8.7"
}));

const displayName = "Quick Draw";
const email = "player@example.com";
const uid = "player-123";

function renderProfile() {
  return render(
    <PaperProvider theme={appTheme}>
      <ProfileScreen
        displayName={displayName}
        email={email}
        uid={uid}
      />
    </PaperProvider>
  );
}

describe("ProfileScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(playerStatsRepository.getPlayerStats).mockResolvedValue({
      uid,
      displayName,
      wins: 2,
      losses: 1,
      draws: 3,
      eloRating: 1510
    });
  });

  test("shows the player's draw count in the record", async () => {
    const screen = await renderProfile();

    expect(screen.getByText("Draws")).toBeTruthy();
    expect(await screen.findByText("3")).toBeTruthy();
  });

  test("shows the username, email and record tiles", async () => {
    const screen = await renderProfile();

    expect(screen.getByText(displayName)).toBeTruthy();
    expect(screen.getAllByText(email).length).toBeGreaterThan(0);
    expect(screen.getByText("Wins")).toBeTruthy();
    expect(screen.getByText("Losses")).toBeTruthy();
    expect(screen.getByText("ELO")).toBeTruthy();
  });

  test("shows the installed app version in settings", async () => {
    const screen = await renderProfile();

    expect(screen.getByText("Version")).toBeTruthy();
    expect(screen.getByText("9.8.7")).toBeTruthy();
  });

  test("signs the player out from settings", async () => {
    const user = userEvent.setup();
    const screen = await renderProfile();

    await user.press(screen.getByText("Logout"));

    expect(logoutUser).toHaveBeenCalledTimes(1);
  });

  test("saves a new username from the edit dialog", async () => {
    const user = userEvent.setup();
    const screen = await renderProfile();

    await user.press(screen.getByText("Edit Username"));
    await user.clear(screen.getByPlaceholderText("Username"));
    await user.type(screen.getByPlaceholderText("Username"), "Fast Hands");
    await user.press(screen.getByText("Save"));

    expect(updateUsername).toHaveBeenCalledWith("Fast Hands");
  });
});

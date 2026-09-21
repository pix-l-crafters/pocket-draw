import { render, userEvent } from "@testing-library/react-native";
import { PaperProvider } from "react-native-paper";

import { appTheme } from "../../theme/appTheme";
import { logoutUser, updateUsername } from "../../lib/auth";
import { ProfileScreen } from "./ProfileScreen";

jest.mock("../../lib/auth", () => ({
  logoutUser: jest.fn().mockResolvedValue(undefined),
  updateUsername: jest.fn().mockResolvedValue(undefined)
}));

const displayName = "Quick Draw";
const email = "player@example.com";
const uid = "player-123";

function renderProfile() {
  return render(
    <PaperProvider theme={appTheme}>
      <ProfileScreen displayName={displayName} email={email} uid={uid} />
    </PaperProvider>
  );
}

describe("ProfileScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("shows the username, email and record tiles", async () => {
    const screen = await renderProfile();

    expect(screen.getByText(displayName)).toBeTruthy();
    expect(screen.getAllByText(email).length).toBeGreaterThan(0);
    expect(screen.getByText("Wins")).toBeTruthy();
    expect(screen.getByText("Losses")).toBeTruthy();
    expect(screen.getByText("ELO")).toBeTruthy();
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

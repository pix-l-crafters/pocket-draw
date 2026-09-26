import { render, userEvent } from "@testing-library/react-native";
import { PaperProvider } from "react-native-paper";

import { appTheme } from "../../theme/appTheme";
import { RoundCountSelector } from "./RoundCountSelector";

const challengerId = "challenger-123";
const challengeToken = "0123456789abcdef0123456789abcdef";
const connection = {
  mode: "existingWifi" as const,
  hostIp: "192.168.1.42",
  signalPort: 43123
};
const discoveryToken = "discovery-token-123";
const matchId = "match-123";
const scannedPlayerId = "opponent-456";
const scannedPlayerName = "Opponent";

describe("RoundCountSelector", () => {
  test("returns a complete handoff after selecting five rounds", async () => {
    const onRoundCountSelected = jest.fn();
    const user = userEvent.setup();
    const screen = await render(
      <PaperProvider theme={appTheme}>
        <RoundCountSelector
          challengeToken={challengeToken}
          challengerId={challengerId}
          connection={connection}
          discoveryToken={discoveryToken}
          matchId={matchId}
          onCancel={jest.fn()}
          onRoundCountSelected={onRoundCountSelected}
          scannedPlayerId={scannedPlayerId}
          scannedPlayerName={scannedPlayerName}
          visible
        />
      </PaperProvider>
    );

    await user.press(screen.getByText("5"));
    await user.press(screen.getByText("Continue"));

    expect(onRoundCountSelected).toHaveBeenCalledWith({
      challengeToken,
      challengerId,
      connection,
      discoveryToken,
      matchId,
      roundCount: 5,
      scannedPlayerId,
      scannedPlayerName
    });
  });

  test("calls onCancel when Cancel is pressed", async () => {
    const onCancel = jest.fn();
    const user = userEvent.setup();
    const screen = await render(
      <PaperProvider theme={appTheme}>
        <RoundCountSelector
          challengeToken={challengeToken}
          challengerId={challengerId}
          connection={connection}
          discoveryToken={discoveryToken}
          matchId={matchId}
          onCancel={onCancel}
          onRoundCountSelected={jest.fn()}
          scannedPlayerId={scannedPlayerId}
          scannedPlayerName={scannedPlayerName}
          visible
        />
      </PaperProvider>
    );

    await user.press(screen.getByText("Cancel"));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

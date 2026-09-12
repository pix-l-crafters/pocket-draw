import { render, userEvent } from "@testing-library/react-native";
import { PaperProvider } from "react-native-paper";

import { appTheme } from "../../theme/appTheme";
import { RoundCountSelector } from "./RoundCountSelector";

const challengerId = "challenger-123";
const scannedPlayerId = "opponent-456";

describe("RoundCountSelector", () => {
  test("returns a complete handoff after selecting five rounds", async () => {
    const onRoundCountSelected = jest.fn();
    const user = userEvent.setup();
    const screen = await render(
      <PaperProvider theme={appTheme}>
        <RoundCountSelector
          challengerId={challengerId}
          onCancel={jest.fn()}
          onRoundCountSelected={onRoundCountSelected}
          scannedPlayerId={scannedPlayerId}
          visible
        />
      </PaperProvider>
    );

    await user.press(screen.getByText("5"));
    await user.press(screen.getByText("Continue"));

    expect(onRoundCountSelected).toHaveBeenCalledWith({
      challengerId,
      scannedPlayerId,
      roundCount: 5
    });
  });

  test("calls onCancel when Cancel is pressed", async () => {
    const onCancel = jest.fn();
    const user = userEvent.setup();
    const screen = await render(
      <PaperProvider theme={appTheme}>
        <RoundCountSelector
          challengerId={challengerId}
          onCancel={onCancel}
          onRoundCountSelected={jest.fn()}
          scannedPlayerId={scannedPlayerId}
          visible
        />
      </PaperProvider>
    );

    await user.press(screen.getByText("Cancel"));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

import { render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { CutCornerButton } from "./CutCornerButton";

describe("CutCornerButton", () => {
  it("provides at least a 64 dp touch target", async () => {
    const view = await render(
      <CutCornerButton
        label="Continue"
        onPress={() => undefined}
      />
    );
    const button = view.getByText("Continue").parent?.parent;
    expect(
      StyleSheet.flatten(button?.props.style)?.minHeight
    ).toBeGreaterThanOrEqual(64);
  });
  it("fills the remaining height when requested", async () => {
    const view = await render(
      <CutCornerButton
        fillAvailableHeight
        label="Confirm"
        onPress={() => undefined}
      />
    );
    const button = view.getByText("Confirm").parent?.parent;

    expect(StyleSheet.flatten(button?.props.style)?.flex).toBe(1);
  });
});

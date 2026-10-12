import { act, renderHook } from "@testing-library/react-native";

import { presenceRepository } from "../services/presenceRepository";
import type { Coordinates } from "../types/map.types";
import { usePresencePublisher } from "./usePresencePublisher";

jest.mock("../services/presenceRepository", () => ({
  presenceRepository: {
    publishPresence: jest.fn(),
    removePresence: jest.fn()
  }
}));

const currentUser = { uid: "self", displayName: "Self" };
// 0.00001° latitude is ~1.1 m.
const start: Coordinates = { latitude: -37.80004, longitude: 144.9 };

describe("usePresencePublisher", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(presenceRepository.publishPresence).mockResolvedValue();
    jest.mocked(presenceRepository.removePresence).mockResolvedValue();
  });

  async function renderPublisher() {
    const view = await renderHook(
      ({ position }: { position: Coordinates }) =>
        usePresencePublisher({ currentUser, position, enabled: true }),
      { initialProps: { position: start } }
    );
    await act(async () => undefined);
    return view;
  }

  it("publishes the position rounded to four decimals", async () => {
    const view = await renderPublisher();

    expect(presenceRepository.publishPresence).toHaveBeenCalledWith({
      uid: "self",
      displayName: "Self",
      latitude: -37.8,
      longitude: 144.9
    });
    await view.unmount();
  });

  it("ignores jitter under 10 m even across a cell edge", async () => {
    const view = await renderPublisher();

    // ~2 m south crosses the -37.80005 rounding edge.
    await view.rerender({
      position: { latitude: -37.80006, longitude: 144.9 }
    });
    await act(async () => undefined);

    expect(presenceRepository.publishPresence).toHaveBeenCalledTimes(1);
    await view.unmount();
  });

  it("re-publishes once the player moves at least 10 m", async () => {
    const view = await renderPublisher();

    await view.rerender({
      position: { latitude: -37.80014, longitude: 144.9 }
    });
    await act(async () => undefined);

    expect(presenceRepository.publishPresence).toHaveBeenCalledTimes(2);
    expect(presenceRepository.publishPresence).toHaveBeenLastCalledWith(
      expect.objectContaining({ latitude: -37.8001 })
    );
    await view.unmount();
  });
});

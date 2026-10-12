import { render } from "@testing-library/react-native";
import { PaperProvider } from "react-native-paper";

import { appTheme } from "../../../theme/appTheme";
import type { LocationState } from "../hooks/useForegroundLocation";
import type { NearbyPlayer, NearbyPlayersState } from "../types/map.types";
import { MapStatusCard } from "./MapStatusCard";

const player: NearbyPlayer = {
  uid: "player",
  displayName: "Player",
  coordinate: { latitude: 0, longitude: 0 },
  lastSeen: new Date("2026-10-10T01:00:00Z")
};

async function renderCard(
  locationState: LocationState,
  nearbyPlayersState: NearbyPlayersState
) {
  return render(
    <PaperProvider theme={appTheme}>
      <MapStatusCard
        isAuthenticated
        locationState={locationState}
        nearbyPlayersState={nearbyPlayersState}
        presenceState={{ status: "published" }}
      />
    </PaperProvider>
  );
}

describe("MapStatusCard nearby headline", () => {
  it("shows location progress instead of claiming there are no nearby players", async () => {
    const view = await renderCard(
      { status: "loading" },
      { status: "ready", players: [], nearbyPlayers: null }
    );
    expect(
      view.getAllByText("Finding your location...").length
    ).toBeGreaterThan(0);
    expect(view.queryByText("No players nearby")).toBeNull();
  });

  it.each<LocationState>([
    { status: "denied", canAskAgain: false },
    { status: "error", message: "Location services are off" }
  ])(
    "reports nearby as unavailable for location status $status",
    async (state) => {
      const view = await renderCard(state, {
        status: "ready",
        players: [player],
        nearbyPlayers: null
      });
      expect(view.getByText("Nearby players unavailable")).toBeTruthy();
      expect(view.queryByText("1 player nearby")).toBeNull();
      expect(view.queryByText("No players nearby")).toBeNull();
    }
  );

  it("counts nearby players independently of distant map markers", async () => {
    const view = await renderCard(
      { status: "granted", position: player.coordinate },
      {
        status: "ready",
        players: [player, { ...player, uid: "distant" }],
        nearbyPlayers: [player]
      }
    );
    expect(view.getByText("1 player nearby")).toBeTruthy();
    expect(view.queryByText("2 players nearby")).toBeNull();
  });

  it("shows an empty result only after both location and presence are ready", async () => {
    const view = await renderCard(
      { status: "granted", position: player.coordinate },
      { status: "ready", players: [player], nearbyPlayers: [] }
    );
    expect(view.getByText("No players nearby")).toBeTruthy();
  });

  it("keeps a presence failure distinct from an empty nearby result", async () => {
    const view = await renderCard(
      { status: "granted", position: player.coordinate },
      { status: "error", message: "Connection lost", nearbyPlayers: null }
    );
    expect(view.getByText("Couldn't load nearby players")).toBeTruthy();
    expect(view.queryByText("No players nearby")).toBeNull();
  });
});

// Two phones over one in-memory network: the duel screens are real, the
// sensor-driven ritual and the clock calibration are stubbed at their edges.

import {
  act,
  fireEvent,
  render,
  waitFor,
  within
} from "@testing-library/react-native";
import { View } from "react-native";
import { PaperProvider } from "react-native-paper";

import type { DuelMessage } from "../../contracts/duelChannel";
import { appTheme } from "../../theme/appTheme";
import { submitMatchAnalytics } from "../backend/matchAnalytics";
import { createDuelLink } from "../challenge/session/duelLink";
import type { DuelTransportConnection } from "../challenge/session/duelSessionTransport";
import { generateMatchId } from "../qr/utils/qr.tokens";
import { DuelScreen } from "./DuelScreen";
import type { DuelRole } from "./fireSignalCoordinator";
import type { PitchCalibration } from "./pitchMonitor";
import type { RoundShots } from "./roundShots";

jest.mock("expo-audio", () => ({
  setAudioModeAsync: async () => undefined,
  useAudioPlayer: () => ({ seekTo: () => undefined, play: () => undefined })
}));

const FIRST_MATCH = "11111111-1111-4111-8111-111111111111";
const REMATCH = "22222222-2222-4222-8222-222222222222";
const LATER_REMATCH = "33333333-3333-4333-8333-333333333333";

jest.mock("../qr/utils/qr.tokens", () => ({ generateMatchId: jest.fn() }));

// Saving is covered by DuelScreen.completion.test; here every save succeeds.
jest.mock("../backend/matchAnalytics", () => ({
  submitMatchAnalytics: jest.fn(async () => "written"),
  subscribeAnalyticsStatus: jest.fn(() => () => undefined)
}));

jest.mock("../backend/matchResultsService", () => ({
  subscribeMatchResultStatus: jest.fn(() => () => undefined),
  submitMatchResult: async (result: { matchId: string }) => ({
    status: "written",
    matchId: result.matchId
  })
}));

jest.mock("./clockOffsetCalibrator", () => ({
  ClockOffsetCalibrator: jest.fn().mockImplementation(() => ({
    calibrate: async () => 0,
    dispose: () => undefined
  }))
}));

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

// The host fires in 100ms and the guest in 300ms, seen from either phone.
jest.mock("./PreRound", () => ({
  PreRound: ({
    onRoundShots,
    role
  }: {
    onRoundShots: (shots: RoundShots) => void;
    role: DuelRole;
  }) => {
    const { Button } = require("react-native");
    return (
      <Button
        title="Finish round"
        onPress={() =>
          onRoundShots(
            role === "host"
              ? {
                  selfReactionMs: 100,
                  opponentReactionMs: 300,
                  selfZone: "bodyshot",
                  opponentZone: "bodyshot",
                  falseStartPlayer: null
                }
              : {
                  selfReactionMs: 300,
                  opponentReactionMs: 100,
                  selfZone: "bodyshot",
                  opponentZone: "bodyshot",
                  falseStartPlayer: null
                }
          )
        }
      />
    );
  }
}));

/** Both ends of one DataChannel; `drop` is the network vanishing under it. */
function connectedPair() {
  const ends = [0, 1].map(() => ({
    handlers: new Set<(message: DuelMessage) => void>(),
    dropHandlers: [] as Array<(message: string) => void>,
    open: true,
    /** Sends vanish in flight without an error, like a frame lost in a drop. */
    lossy: false
  }));
  const connections = ends.map((end, index) => {
    const other = ends[1 - index];
    const connection: DuelTransportConnection = {
      channel: {
        send: (message) => {
          if (!end.open) throw new Error("closed");
          if (end.lossy) return;
          other.handlers.forEach((handler) => handler(message));
        },
        onMessage: (handler) => {
          end.handlers.add(handler);
          return () => end.handlers.delete(handler);
        },
        isConnected: () => end.open
      },
      onDrop: (handler) => {
        end.dropHandlers.push(handler);
      },
      disconnect: () => {
        end.open = false;
        end.handlers.clear();
      }
    };
    return connection;
  });
  return {
    host: connections[0],
    guest: connections[1],
    loseMessagesFrom: (role: DuelRole) => {
      ends[role === "host" ? 0 : 1].lossy = true;
    },
    drop: () => {
      ends.forEach((end) => {
        end.open = false;
      });
      ends.forEach((end) => end.dropHandlers.forEach((handler) => handler("")));
    }
  };
}

/**
 * After `drop`, reconnects hang until `heal`; then they succeed once both
 * phones are trying. An unreachable network refuses them outright.
 */
function testNetwork() {
  let pair = connectedPair();
  let healed = true;
  let reachable = true;
  const waiting: Partial<
    Record<DuelRole, (connection: DuelTransportConnection) => void>
  > = {};

  const completeHandshake = () => {
    if (!healed || !waiting.host || !waiting.guest) return;
    pair = connectedPair();
    const { host, guest } = waiting;
    delete waiting.host;
    delete waiting.guest;
    host(pair.host);
    guest(pair.guest);
  };

  const reconnect = (role: DuelRole) => (signal: AbortSignal) =>
    new Promise<DuelTransportConnection>((resolve, reject) => {
      if (!reachable) {
        reject(new Error("Couldn't reach the other player."));
        return;
      }
      waiting[role] = resolve;
      signal.addEventListener("abort", () => {
        delete waiting[role];
        reject(new Error("Aborted"));
      });
      completeHandshake();
    });

  return {
    host: createDuelLink({
      connection: pair.host,
      reconnect: reconnect("host")
    }),
    guest: createDuelLink({
      connection: pair.guest,
      reconnect: reconnect("guest")
    }),
    drop: () =>
      act(() => {
        healed = false;
        pair.drop();
      }),
    heal: () =>
      act(async () => {
        healed = true;
        reachable = true;
        completeHandshake();
      }),
    setReachable: (value: boolean) => {
      reachable = value;
    },
    loseMessagesFrom: (role: DuelRole) => pair.loseMessagesFrom(role)
  };
}

async function renderPhones(network = testNetwork()) {
  const players = {
    host: { id: "host-id", name: "Hana" },
    guest: { id: "guest-id", name: "Gil" }
  };
  const onExit = { host: jest.fn(), guest: jest.fn() };
  const phone = (role: DuelRole) => (
    <View testID={role}>
      <DuelScreen
        link={network[role]}
        matchId={FIRST_MATCH}
        onExit={onExit[role]}
        opponent={players[role === "host" ? "guest" : "host"]}
        role={role}
        self={players[role]}
      />
    </View>
  );
  // One tree for both phones: a second root would stop the first updating.
  const view = await render(
    <PaperProvider theme={appTheme}>
      {phone("host")}
      {phone("guest")}
    </PaperProvider>
  );
  const host = within(view.getByTestId("host"));
  const guest = within(view.getByTestId("guest"));
  for (const phone of [host, guest]) {
    await fireEvent.press(phone.getByText("Complete calibration"));
  }
  return { host, guest, network, onExit };
}

type Phone = Awaited<ReturnType<typeof renderPhones>>["host"];

async function playRound(phones: Phone[], continueLabel = "Next round") {
  for (const phone of phones) {
    await fireEvent.press(phone.getByText("Finish round"));
    await fireEvent.press(phone.getByText(continueLabel));
  }
}

async function playMatch(host: Phone, guest: Phone) {
  await playRound([host, guest]);
  await playRound([host, guest]);
  await playRound([host, guest], "See match result");
}

describe("DuelScreen session flows", () => {
  beforeEach(() => {
    jest.mocked(generateMatchId).mockReset().mockReturnValue(REMATCH);
  });

  it("starts a rematch only once both players agree, under one fresh match id", async () => {
    const { host, guest } = await renderPhones();
    await playMatch(host, guest);
    expect(host.getByText(`Match ${FIRST_MATCH.slice(0, 8)}`)).toBeTruthy();

    await fireEvent.press(host.getByText("Rematch"));
    expect(host.getByText("Waiting for Gil…")).toBeTruthy();
    expect(guest.getByText("Hana wants a rematch")).toBeTruthy();
    expect(host.queryByText("Finish round")).toBeNull();

    await fireEvent.press(guest.getByText("Accept rematch"));
    await playMatch(host, guest);

    for (const phone of [host, guest]) {
      expect(phone.getByText(`Match ${REMATCH.slice(0, 8)}`)).toBeTruthy();
      expect(phone.getByText("Hana wins")).toBeTruthy();
    }
  });

  it("releases the session when a player heads back to the map", async () => {
    const { host, guest, network, onExit } = await renderPhones();
    await playMatch(host, guest);

    await fireEvent.press(host.getByText("Back to map"));

    expect(onExit.host).toHaveBeenCalledTimes(1);
    expect(network.host.status()).toBe("closed");
    expect(network.guest.status()).toBe("peerLeft");
    expect(guest.getByText("Hana left the match")).toBeTruthy();
    await fireEvent.press(guest.getByText("Rematch"));
    expect(guest.queryByText("Finish round")).toBeNull();
  });

  it("tells a player mid-round that their opponent left", async () => {
    const { guest, network, onExit } = await renderPhones();

    await act(() => network.host.leave());

    expect(guest.getByText("Hana left")).toBeTruthy();
    await fireEvent.press(guest.getByText("Back to map"));
    expect(onExit.guest).toHaveBeenCalledTimes(1);
  });

  it("reconnects after a drop and replays the round only one phone had judged", async () => {
    const { host, guest, network } = await renderPhones();
    await playRound([host, guest]);
    // The host judged round 2; the guest's copy of it was lost in the drop.
    await fireEvent.press(host.getByText("Finish round"));
    expect(host.getByText("Round 2")).toBeTruthy();

    await network.drop();
    for (const phone of [host, guest]) {
      expect(phone.getByText("Reconnecting")).toBeTruthy();
      expect(phone.getByText(/\(1\/10\)/)).toBeTruthy();
    }

    await network.heal();
    await waitFor(() => {
      expect(host.getByText("Finish round")).toBeTruthy();
      expect(guest.getByText("Finish round")).toBeTruthy();
    });

    for (const phone of [host, guest]) {
      await fireEvent.press(phone.getByText("Finish round"));
      expect(phone.getByText("Round 2")).toBeTruthy();
      expect(phone.getByText("Hana wins")).toBeTruthy();
    }
  });

  it("does not save a discarded final round before matching peer completion", async () => {
    jest.mocked(submitMatchAnalytics).mockClear();
    const { host, guest, network } = await renderPhones();
    await playRound([host, guest]);
    await playRound([host, guest]);
    await fireEvent.press(host.getByText("Finish round"));
    await act(async () => {});
    expect(submitMatchAnalytics).not.toHaveBeenCalled();

    await network.drop();
    await network.heal();
    await waitFor(() => {
      expect(host.getByText("Finish round")).toBeTruthy();
      expect(guest.getByText("Finish round")).toBeTruthy();
    });
    await fireEvent.press(host.getByText("Finish round"));
    expect(submitMatchAnalytics).not.toHaveBeenCalled();
    await fireEvent.press(guest.getByText("Finish round"));
    await waitFor(() => expect(submitMatchAnalytics).toHaveBeenCalledTimes(2));
    for (const [payload] of jest.mocked(submitMatchAnalytics).mock.calls)
      expect(payload.rounds.map((round) => round.roundNumber)).toEqual([
        1, 2, 3
      ]);
  });

  it("offers a retry or a way out when reconnecting fails, instead of freezing", async () => {
    jest.useFakeTimers();
    try {
      const { host, guest, network } = await renderPhones();
      network.setReachable(false);

      await network.drop();
      for (let second = 0; second < 40; second += 1) {
        await act(async () => {
          jest.advanceTimersByTime(1000);
        });
      }

      for (const phone of [host, guest]) {
        expect(phone.getByText("Couldn't reconnect")).toBeTruthy();
        expect(phone.getByText("Back to map")).toBeTruthy();
      }

      await network.heal();
      await fireEvent.press(host.getByText("Try again"));
      await fireEvent.press(guest.getByText("Try again"));
      await waitFor(() => {
        expect(host.getByText("Finish round")).toBeTruthy();
        expect(guest.getByText("Finish round")).toBeTruthy();
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it("keeps a rematch offer that arrives before the opponent has finished the match", async () => {
    const { host, guest } = await renderPhones();
    await playRound([host, guest]);
    await playRound([host, guest]);
    await playRound([host], "See match result");

    await fireEvent.press(host.getByText("Rematch"));
    await playRound([guest], "See match result");

    expect(guest.getByText("Hana wants a rematch")).toBeTruthy();
    await fireEvent.press(guest.getByText("Accept rematch"));
    expect(host.getByText("Finish round")).toBeTruthy();
    expect(guest.getByText("Finish round")).toBeTruthy();
  });

  it("settles a rematch one phone missed in a drop before resuming", async () => {
    jest
      .mocked(generateMatchId)
      .mockReturnValueOnce(REMATCH)
      .mockReturnValueOnce(LATER_REMATCH);
    const { host, guest, network } = await renderPhones();
    await playMatch(host, guest);

    // The host's offer never reaches the guest; the offers cross, and only
    // the host learns of both before the link drops.
    network.loseMessagesFrom("host");
    await fireEvent.press(host.getByText("Rematch"));
    await fireEvent.press(guest.getByText("Rematch"));
    await network.drop();
    await network.heal();

    await waitFor(() => {
      expect(host.getByText("Finish round")).toBeTruthy();
      expect(guest.getByText("Finish round")).toBeTruthy();
    });
    await playMatch(host, guest);
    for (const phone of [host, guest]) {
      expect(phone.getByText(`Match ${REMATCH.slice(0, 8)}`)).toBeTruthy();
    }
  });
});

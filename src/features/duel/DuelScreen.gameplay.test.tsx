// Real calibration, sensor capture, wire exchange, judgment and match loop.
// Only native hardware, the in-memory transport and backend persistence are fake.
import { act, fireEvent, render, within } from "@testing-library/react-native";
import type { LocationHeadingObject, LocationObject } from "expo-location";
import type { DeviceMotionMeasurement } from "expo-sensors";
import { Platform, View } from "react-native";
import { PaperProvider } from "react-native-paper";

import type { MatchResult } from "../../contracts/matchResult";
import { createMockDuelChannelPair } from "../../contracts/mocks/mockDuelChannel";
import type { RoundOutcome } from "../../contracts/roundOutcome";
import { appTheme } from "../../theme/appTheme";
import { submitMatchResult } from "../backend/matchResultsService";
import { createDuelLink } from "../challenge/session/duelLink";
import { DuelScreen } from "./DuelScreen";
import type { DuelRole } from "./fireSignalCoordinator";

type Acceleration = { x: number; y: number; z: number };
type NativePhone = {
  latitude: number;
  heading: number;
  pitch: number;
  motion: Set<(reading: DeviceMotionMeasurement) => void>;
  tilt: Set<(reading: Acceleration) => void>;
  position: Set<(reading: LocationObject) => void>;
  compass: Set<(reading: LocationHeadingObject) => void>;
};

const mockPhones: Record<DuelRole, NativePhone> = {
  host: {
    latitude: 0,
    heading: 0,
    pitch: 0,
    motion: new Set(),
    tilt: new Set(),
    position: new Set(),
    compass: new Set()
  },
  guest: {
    latitude: 0.001,
    heading: 180,
    pitch: 0,
    motion: new Set(),
    tilt: new Set(),
    position: new Set(),
    compass: new Set()
  }
};
// Each phone mounts its native watchers in a separate awaited interaction.
// Keep this owner selected until asynchronous permission checks have settled.
let mockNativeOwner: DuelRole = "host";
const mockVolumeListeners = new Set<() => void>();
const mockPermission = {
  granted: true,
  status: "granted",
  canAskAgain: true,
  expires: "never"
};

jest.mock("expo-sensors", () => ({
  DeviceMotion: {
    isAvailableAsync: async () => true,
    getPermissionsAsync: async () => mockPermission,
    requestPermissionsAsync: async () => mockPermission,
    setUpdateInterval: () => undefined,
    addListener: (listener: (reading: DeviceMotionMeasurement) => void) => {
      const listeners = mockPhones[mockNativeOwner].motion;
      listeners.add(listener);
      return { remove: () => listeners.delete(listener) };
    }
  },
  Accelerometer: {
    getPermissionsAsync: async () => mockPermission,
    requestPermissionsAsync: async () => mockPermission,
    setUpdateInterval: () => undefined,
    addListener: (listener: (reading: Acceleration) => void) => {
      const listeners = mockPhones[mockNativeOwner].tilt;
      listeners.add(listener);
      return { remove: () => listeners.delete(listener) };
    }
  }
}));

jest.mock("expo-location", () => ({
  Accuracy: { High: 4 },
  getForegroundPermissionsAsync: async () => mockPermission,
  requestForegroundPermissionsAsync: async () => mockPermission,
  watchPositionAsync: async (
    _options: unknown,
    listener: (reading: LocationObject) => void
  ) => {
    const listeners = mockPhones[mockNativeOwner].position;
    listeners.add(listener);
    return { remove: () => listeners.delete(listener) };
  },
  watchHeadingAsync: async (
    listener: (reading: LocationHeadingObject) => void
  ) => {
    const listeners = mockPhones[mockNativeOwner].compass;
    listeners.add(listener);
    return { remove: () => listeners.delete(listener) };
  }
}));

// Keep subscribeVolumeFire real, replacing only Expo's native VolumeFire module.
jest.mock("expo", () => {
  const actual = jest.requireActual("expo");
  return {
    ...actual,
    requireNativeModule: (name: string) =>
      name === "VolumeFire"
        ? {
            addListener: (_event: string, listener: () => void) => {
              mockVolumeListeners.add(listener);
              return { remove: () => mockVolumeListeners.delete(listener) };
            }
          }
        : actual.requireNativeModule(name)
  };
});

jest.mock("expo-audio", () => ({
  setAudioModeAsync: async () => undefined,
  useAudioPlayer: () => ({ seekTo: () => undefined, play: () => undefined })
}));
jest.mock("expo-haptics", () => ({
  impactAsync: async () => undefined,
  notificationAsync: async () => undefined,
  ImpactFeedbackStyle: { Medium: "medium", Heavy: "heavy" },
  NotificationFeedbackType: { Success: "success" }
}));
jest.mock("../backend/matchResultsService", () => ({
  subscribeMatchResultStatus: jest.fn(() => () => undefined),
  submitMatchResult: jest.fn(async (result: MatchResult) => ({
    status: "written",
    matchId: result.matchId
  }))
}));

function publishSensors(role: DuelRole) {
  const phone = mockPhones[role];
  const timestamp = Date.now();
  const motion: DeviceMotionMeasurement = {
    acceleration: null,
    accelerationIncludingGravity: { x: 0, y: 0, z: 9.80665, timestamp },
    interval: 20,
    orientation: 0,
    rotation: { alpha: 0, beta: phone.pitch, gamma: 0, timestamp },
    rotationRate: null
  };
  phone.motion.forEach((listener) => listener(motion));
  phone.position.forEach((listener) =>
    listener({
      coords: {
        latitude: phone.latitude,
        longitude: 0,
        accuracy: 1,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null
      },
      timestamp,
      mocked: false
    })
  );
  phone.compass.forEach((listener) =>
    listener({
      trueHeading: phone.heading,
      magHeading: phone.heading,
      accuracy: 3
    })
  );
}

async function advance(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
    // Real native watchers deliver fresh fused pitch, compass and GPS fixes.
    publishSensors("host");
    publishSensors("guest");
  });
}

async function renderPhones() {
  const [hostChannel, guestChannel] = createMockDuelChannelPair();
  const players = {
    host: { id: "host-id", name: "Hana" },
    guest: { id: "guest-id", name: "Gil" }
  };
  const link = (channel: typeof hostChannel) =>
    createDuelLink({
      connection: {
        channel,
        onDrop: () => undefined,
        disconnect: () => undefined
      },
      reconnect: () => Promise.reject(new Error("Unused reconnect"))
    });
  const hostLink = link(hostChannel);
  const guestLink = link(guestChannel);
  const view = await render(
    <PaperProvider theme={appTheme}>
      <View testID="host-phone">
        <DuelScreen
          link={hostLink}
          matchId="real-gameplay"
          role="host"
          self={players.host}
          opponent={players.guest}
        />
      </View>
      <View testID="guest-phone">
        <DuelScreen
          link={guestLink}
          matchId="real-gameplay"
          role="guest"
          self={players.guest}
          opponent={players.host}
        />
      </View>
    </PaperProvider>
  );
  const phones = {
    host: within(view.getByTestId("host-phone")),
    guest: within(view.getByTestId("guest-phone"))
  };
  const press = async (role: DuelRole, label: string) => {
    mockNativeOwner = role;
    await fireEvent.press(phones[role].getByText(label));
    await act(async () => {
      publishSensors(role);
    });
  };
  const calibrate = async (role: DuelRole) => {
    await press(role, "I'm Ready");
    await press(role, "Start calibration");
    expect(mockPhones[role].motion.size).toBe(1);
    await press(role, "Capture ready pose");
    mockPhones[role].pitch = 1;
    await act(() => publishSensors(role));
    await press(role, "Capture shoulder pose");
    expect(phones[role].queryByText("CONFIRM")).toBeNull();
    await press(role, "Continue");
    // Verify watchers finished mounting before delivering any round readings.
    for (const listeners of [
      mockPhones[role].motion,
      mockPhones[role].tilt,
      mockPhones[role].position,
      mockPhones[role].compass
    ]) {
      expect(listeners.size).toBe(1);
    }
  };
  const position = async (role: DuelRole) => {
    await press(role, "CONFIRM");
    await act(() => {
      mockPhones[role].tilt.forEach((listener) =>
        listener({ x: 0, y: -1, z: 0 })
      );
    });
  };
  const startRound = async () => {
    await position("host");
    await position("guest");
    await press("guest", "CONFIRM");
    await press("host", "CONFIRM");
  };
  const shoot = async (
    role: DuelRole,
    pitch: number,
    heading = role === "host" ? 0 : 180
  ) => {
    mockPhones[role].pitch = pitch;
    mockPhones[role].heading = heading;
    await act(() => publishSensors(role));
    await fireEvent.press(phones[role].getByRole("button", { name: "Fire" }));
  };
  const nextRound = async () => {
    for (const role of ["host", "guest"] as const) {
      await press(role, "Next round");
    }
    // Both endpoints have watchers now: send each native GPS fix again so
    // neither relies on a position published before its own listener mounted.
    await advance(0);
  };
  return {
    view,
    phones,
    press,
    calibrate,
    position,
    startRound,
    shoot,
    nextRound
  };
}

describe("DuelScreen real two-phone gameplay", () => {
  const originalPlatform = Platform.OS;
  beforeEach(() => {
    Platform.OS = "android";
    jest.useFakeTimers();
    jest.setSystemTime(100_000);
    jest.mocked(submitMatchResult).mockClear();
    mockVolumeListeners.clear();
    mockNativeOwner = "host";
    for (const role of ["host", "guest"] as const) {
      const phone = mockPhones[role];
      phone.pitch = 0;
      phone.heading = role === "host" ? 0 : 180;
      phone.motion.clear();
      phone.tilt.clear();
      phone.position.clear();
      phone.compass.clear();
    }
  });
  afterEach(() => {
    Platform.OS = originalPlatform;
    jest.useRealTimers();
  });

  it.each(["tap", "volume", "movement"] as const)(
    "agrees on a four-round 5–3 match, including a %s false start and the nonoffender's headshot",
    async (earlyInput) => {
      const {
        view,
        phones,
        press,
        calibrate,
        position,
        startRound,
        shoot,
        nextRound
      } = await renderPhones();
      await calibrate("host");
      await position("host");
      await press("host", "CONFIRM");
      expect(phones.host.getByText("WAITING FOR YOUR OPPONENT")).toBeTruthy();
      expect(phones.host.queryByRole("button", { name: "Fire" })).toBeNull();
      expect(phones.guest.getByText("I'm Ready")).toBeTruthy();

      await calibrate("guest");
      await position("guest");
      // Calibration alone is not readiness: the guest must finish the ritual.
      await press("host", "CONFIRM");
      expect(phones.host.queryByRole("button", { name: "Fire" })).toBeNull();
      await press("guest", "CONFIRM");
      await press("host", "CONFIRM");
      await advance(3000);
      for (const phone of [phones.host, phones.guest]) {
        expect(phone.getByText("FIRE!")).toBeTruthy();
      }

      // Round 1: independently calibrated bodyshots inside the 100ms window.
      await advance(200);
      await shoot("host", 0.9);
      await advance(50);
      await shoot("guest", 0.9);
      for (const phone of [phones.host, phones.guest]) {
        expect(phone.getByText("Round 1")).toBeTruthy();
        expect(phone.getByText("Tie")).toBeTruthy();
        expect(phone.getByText(/^200\s*ms$/)).toBeTruthy();
        expect(phone.getByText(/^250\s*ms$/)).toBeTruthy();
      }
      expect(submitMatchResult).not.toHaveBeenCalled();

      // Round 2: headshot beats bodyshot inside the same timing window (2–1).
      await nextRound();
      await startRound();
      await advance(3000);
      await advance(200);
      await shoot("host", 1.1);
      await advance(50);
      await shoot("guest", 0.9);
      for (const phone of [phones.host, phones.guest]) {
        expect(phone.getByText("Round 2")).toBeTruthy();
        expect(phone.getByText("Hana wins")).toBeTruthy();
      }

      // Round 3: a faster raised headshot aimed east misses the northern
      // opponent, falling through to the slower south-facing bodyshot (0–1).
      await nextRound();
      await startRound();
      await advance(3000);
      await advance(200);
      await shoot("host", 1.1, 90);
      await advance(200);
      await shoot("guest", 0.9);
      for (const phone of [phones.host, phones.guest]) {
        expect(phone.getByText("Round 3")).toBeTruthy();
        expect(phone.getByText("Gil wins")).toBeTruthy();
        expect(phone.getByText("Next round")).toBeTruthy();
      }
      // 1+2+0 versus 1+1+1: exactly level, so a fourth round is required.
      expect(submitMatchResult).not.toHaveBeenCalled();

      await nextRound();
      await startRound();
      await advance(100);
      if (earlyInput === "tap") {
        await fireEvent.press(
          phones.guest.getByRole("button", { name: "Fire" })
        );
      } else if (earlyInput === "volume") {
        // Native volume subscriptions mount in tree order: host then guest.
        expect(mockVolumeListeners.size).toBe(2);
        await act(() => [...mockVolumeListeners][1]());
      } else {
        await act(() => {
          mockPhones.guest.tilt.forEach((listener) =>
            listener({ x: 0, y: -2, z: 0 })
          );
        });
      }
      for (const phone of [phones.host, phones.guest]) {
        expect(
          phone.getByText(
            "FALSE START — the non-offending player can still shoot at FIRE."
          )
        ).toBeTruthy();
        expect(phone.queryByText("Round 4")).toBeNull();
      }
      await advance(2900);
      await advance(300);
      await shoot("host", 1.1);
      // The offender cannot turn a post-FIRE shot into points.
      await shoot("guest", 1.1);
      await advance(2950);
      for (const phone of [phones.host, phones.guest]) {
        expect(phone.getByText("Round 4")).toBeTruthy();
        expect(phone.getByText("Gil false start")).toBeTruthy();
        expect(phone.getByText(/^2\s*pts$/)).toBeTruthy();
        expect(phone.getByText(/^300\s*ms$/)).toBeTruthy();
      }

      const expectedRounds: RoundOutcome[] = [
        {
          kind: "tie",
          zone: "bodyshot",
          pointsEach: 1,
          reactionMs: 200,
          opponentReactionMs: 250
        },
        {
          kind: "win",
          winnerId: "host-id",
          winnerZone: "headshot",
          winnerPoints: 2,
          loserPoints: 1,
          reactionMs: 200,
          opponentReactionMs: 250
        },
        {
          kind: "win",
          winnerId: "guest-id",
          winnerZone: "bodyshot",
          winnerPoints: 1,
          loserPoints: 0,
          reactionMs: 200,
          opponentReactionMs: 400
        },
        {
          kind: "falseStart",
          playerId: "guest-id",
          nonOffenderId: "host-id",
          nonOffenderShot: { reactionMs: 300, zone: "headshot", points: 2 }
        }
      ];
      expect(submitMatchResult).toHaveBeenCalledTimes(2);
      for (const [result, submitter] of jest.mocked(submitMatchResult).mock
        .calls) {
        expect(result).toEqual({
          matchId: "real-gameplay",
          participantIds:
            submitter === "host-id"
              ? ["host-id", "guest-id"]
              : ["guest-id", "host-id"],
          rounds: expectedRounds,
          results: { "host-id": "win", "guest-id": "lose" },
          completedAt: expect.any(String)
        });
      }
      expect(
        jest
          .mocked(submitMatchResult)
          .mock.calls.map(([, id]) => id)
          .sort()
      ).toEqual(["guest-id", "host-id"]);
      for (const role of ["host", "guest"] as const) {
        await press(role, "See match result");
        const phone = phones[role];
        expect(phone.getByText("Match complete")).toBeTruthy();
        expect(phone.getByText("Hana wins")).toBeTruthy();
        expect(
          within(phone.getByText("Hana").parent!).getByText("5")
        ).toBeTruthy();
        expect(
          within(phone.getByText("Gil").parent!).getByText("3")
        ).toBeTruthy();
        expect(phone.getByText("Round 1 — Tie · 200ms")).toBeTruthy();
        expect(phone.getByText("Round 2 — Hana · 200ms")).toBeTruthy();
        expect(phone.getByText("Round 3 — Gil · 200ms")).toBeTruthy();
        expect(phone.getByText("Round 4 — Gil false start")).toBeTruthy();
        expect(phone.getByText("Result saved")).toBeTruthy();
      }
      await view.unmount();
    }
  );
});

// Real calibration, sensor capture, wire exchange, judgment and match loop.
// Only native hardware, the in-memory transport and backend persistence are fake.
import { act, fireEvent, render, within } from "@testing-library/react-native";
import type { LocationHeadingObject, LocationObject } from "expo-location";
import type { DeviceMotionMeasurement } from "expo-sensors";
import { Platform, StyleSheet, View } from "react-native";
import { PaperProvider } from "react-native-paper";

import type { MatchResult } from "../../contracts/matchResult";
import { createMockDuelChannelPair } from "../../contracts/mocks/mockDuelChannel";
import type { RoundOutcome } from "../../contracts/roundOutcome";
import { appTheme } from "../../theme/appTheme";
import { colors } from "../../theme/tokens";
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
const mockVolumeListeners = new Set<
  (event: { direction: "up" | "down" }) => void
>();
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
            addListener: (
              _event: string,
              listener: (event: { direction: "up" | "down" }) => void
            ) => {
              mockVolumeListeners.add(listener);
              return { remove: () => mockVolumeListeners.delete(listener) };
            }
          }
        : actual.requireNativeModule(name)
  };
});

jest.mock("expo-audio", () => ({
  setAudioModeAsync: async () => undefined,
  useAudioPlayer: () => {
    let onStatus: ((status: { didJustFinish: boolean }) => void) | undefined;
    return {
      seekTo: () => undefined,
      pause: () => undefined,
      play: () => {
        void Promise.resolve().then(() => onStatus?.({ didJustFinish: true }));
      },
      addListener: (_event: string, listener: typeof onStatus) => {
        onStatus = listener;
        return {
          remove: () => {
            onStatus = undefined;
          }
        };
      }
    };
  }
}));
jest.mock("expo-haptics", () => ({
  impactAsync: async () => undefined,
  notificationAsync: async () => undefined,
  ImpactFeedbackStyle: { Medium: "medium", Heavy: "heavy" },
  NotificationFeedbackType: { Success: "success" }
}));
jest.mock("../backend/matchAnalytics", () => ({
  submitMatchAnalytics: jest.fn(async () => "written"),
  subscribeAnalyticsStatus: jest.fn(() => () => undefined)
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

async function renderPhones(guestShotDelayMs = 0) {
  const [hostChannel, rawGuestChannel] = createMockDuelChannelPair();
  const guestChannel = {
    ...rawGuestChannel,
    send: (message: Parameters<typeof rawGuestChannel.send>[0]) => {
      if (message.type === "raised" && guestShotDelayMs > 0) {
        setTimeout(() => rawGuestChannel.send(message), guestShotDelayMs);
      } else {
        rawGuestChannel.send(message);
      }
    }
  };
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
    const target =
      phones[role].queryByText(label) ??
      phones[role].getByRole("button", { name: label });
    await fireEvent.press(target);
    await act(async () => {
      publishSensors(role);
    });
  };
  const calibrate = async (role: DuelRole) => {
    await press(role, "CONTINUE TO CALIBRATION");
    await press(role, "Start calibration");
    expect(mockPhones[role].motion.size).toBe(1);
    mockPhones[role].pitch = 1;
    for (let index = 0; index <= 20; index += 1) {
      await act(() => {
        publishSensors(role);
        mockPhones[role].tilt.forEach((listener) =>
          listener({ x: 0, y: 0, z: 0.95 })
        );
        jest.advanceTimersByTime(100);
      });
    }
    mockPhones[role].pitch = 0;
    for (let index = 0; index <= 20; index += 1) {
      await act(() => {
        publishSensors(role);
        mockPhones[role].tilt.forEach((listener) =>
          listener({ x: 0, y: -0.9, z: 0 })
        );
        jest.advanceTimersByTime(100);
      });
    }
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
    hostChannel,
    press,
    calibrate,
    position,
    startRound,
    shoot,
    nextRound,
    delayGuestShots: (ms: number) => {
      guestShotDelayMs = ms;
    }
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

  it("does not start a tiebreaker when the deciding peer shot is delayed past the local window", async () => {
    const {
      view,
      phones,
      calibrate,
      startRound,
      shoot,
      nextRound,
      press,
      delayGuestShots
    } = await renderPhones();
    await calibrate("host");
    await calibrate("guest");
    for (let round = 1; round <= 3; round += 1) {
      if (round > 1) await nextRound();
      if (round === 3) delayGuestShots(3500);
      await startRound();
      await advance(3000);
      await advance(200);
      await shoot("host", round === 3 ? 0.4 : 0.9);
      await advance(50);
      await shoot("guest", 0.9);
      await advance(3000);
      // The peer fired in time. Network delay must not invent a no-shot tie.
      if (round === 3) {
        expect(phones.guest.getByText("See match result")).toBeTruthy();
        expect(phones.host.queryByText("Next round")).toBeNull();
      }
      await advance(500);
      for (const phone of [phones.host, phones.guest]) {
        expect(phone.getByText(`Round ${round}`)).toBeTruthy();
        expect(
          phone.getByText(round === 3 ? "Gil — BODYSHOT (1 pt)" : "Tie")
        ).toBeTruthy();
      }
    }
    for (const role of ["host", "guest"] as const) {
      expect(phones[role].queryByText("Next round")).toBeNull();
      await press(role, "See match result");
      expect(phones[role].getByText("Gil wins")).toBeTruthy();
      expect(
        within(phones[role].getByText("Hana").parent!).getByText("2")
      ).toBeTruthy();
      expect(
        within(phones[role].getByText("Gil").parent!).getByText("3")
      ).toBeTruthy();
    }
    await view.unmount();
  });

  it("opens optional help over calibration and returns to the active step", async () => {
    const { phones, press } = await renderPhones();
    const host = phones.host;

    expect(host.getByText("STAND APART")).toBeTruthy();
    expect(host.getByRole("button", { name: "Help" })).toBeTruthy();
    expect(host.queryByText("How to play")).toBeNull();
    await press("host", "CONTINUE TO CALIBRATION");
    await press("host", "Start calibration");
    expect(host.getByText("Shoulder pose")).toBeTruthy();
    await act(() => {
      publishSensors("host");
      mockPhones.host.tilt.forEach((listener) =>
        listener({ x: 0, y: -0.9, z: 0 })
      );
    });

    await press("host", "Help");
    mockVolumeListeners.forEach((listener) => listener({ direction: "up" }));
    expect(host.getByText("Shoulder pose")).toBeTruthy();
    for (let index = 0; index <= 20; index += 1) {
      await act(() => {
        publishSensors("host");
        mockPhones.host.tilt.forEach((listener) =>
          listener({ x: 0, y: -0.9, z: 0 })
        );
        jest.advanceTimersByTime(100);
      });
    }
    expect(host.queryByText("Ready pose")).toBeNull();
    expect(host.getByRole("button", { name: "Close help" })).toBeTruthy();
    expect(host.getByText("How to play")).toBeTruthy();
    await press("host", "Close help");

    expect(host.queryByText("How to play")).toBeNull();
    expect(host.getByText("Shoulder pose")).toBeTruthy();
  });

  it.each(["tap", "volume", "movement"] as const)(
    "cancels repeated %s false starts before finishing the same fourth round",
    async (earlyInput) => {
      const {
        view,
        phones,
        hostChannel,
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
      expect(phones.guest.getByText("STAND APART")).toBeTruthy();

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
      const hostSend = jest.spyOn(hostChannel, "send");
      mockPhones.host.pitch = 0.9;
      await act(() => publishSensors("host"));
      expect(mockVolumeListeners.size).toBe(2);
      await act(() => {
        const pressVolume = [...mockVolumeListeners][0];
        pressVolume({ direction: "up" });
        pressVolume({ direction: "up" });
      });
      await fireEvent.press(phones.host.getByRole("button", { name: "Fire" }));
      expect(
        hostSend.mock.calls.filter(([message]) => message.type === "raised")
      ).toHaveLength(1);
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
        expect(phone.getByText("Hana — HEADSHOT (2 pts)")).toBeTruthy();
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
        expect(phone.getByText("Gil — BODYSHOT (1 pt)")).toBeTruthy();
        expect(phone.getByText("Next round")).toBeTruthy();
      }
      // 1+2+0 versus 1+1+1: exactly level, so a fourth round is required.
      expect(submitMatchResult).not.toHaveBeenCalled();

      await nextRound();
      await startRound();
      const offend = async () => {
        if (earlyInput === "tap") {
          await fireEvent.press(
            phones.guest.getByRole("button", { name: "Fire" })
          );
        } else if (earlyInput === "volume") {
          expect(mockVolumeListeners.size).toBe(2);
          await act(() => [...mockVolumeListeners][1]({ direction: "up" }));
        } else {
          await act(() => {
            mockPhones.guest.tilt.forEach((listener) =>
              listener({ x: 0, y: -2, z: 0 })
            );
          });
        }
      };
      await advance(100);
      await offend();
      expect(phones.host.getByText(/Gil false-started/)).toBeTruthy();
      expect(phones.guest.getByText(/Gil false-started/)).toBeTruthy();
      expect(
        StyleSheet.flatten(
          phones.host.getByText(/Gil false-started/).props.style
        ).color
      ).toBe(colors.textMuted60);
      expect(
        StyleSheet.flatten(
          phones.guest.getByText(/Gil false-started/).props.style
        ).color
      ).toBe(colors.warning);
      for (const phone of [phones.host, phones.guest]) {
        expect(phone.getByText("CONFIRM")).toBeTruthy();
        expect(phone.queryByText("Round 4")).toBeNull();
      }
      await advance(3200);
      for (const phone of [phones.host, phones.guest]) {
        expect(phone.queryByText("FIRE!")).toBeNull();
        expect(phone.queryByText("Round 4")).toBeNull();
      }
      expect(submitMatchResult).not.toHaveBeenCalled();
      await press("guest", "CONFIRM");
      await press("host", "CONFIRM");
      await advance(100);
      await offend();
      for (const phone of [phones.host, phones.guest]) {
        expect(phone.getByText("CONFIRM")).toBeTruthy();
      }
      await advance(3200);
      expect(submitMatchResult).not.toHaveBeenCalled();
      await press("guest", "CONFIRM");
      await press("host", "CONFIRM");
      await advance(3000);
      await advance(300);
      await shoot("host", 1.1);
      await advance(100);
      await shoot("guest", 0.9);
      for (const phone of [phones.host, phones.guest]) {
        expect(phone.getByText("Round 4")).toBeTruthy();
        expect(phone.getByText("Hana — HEADSHOT (2 pts)")).toBeTruthy();
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
          loserZone: "bodyshot",
          winnerPoints: 2,
          loserPoints: 1,
          reactionMs: 200,
          opponentReactionMs: 250
        },
        {
          kind: "win",
          winnerId: "guest-id",
          winnerZone: "bodyshot",
          loserZone: "miss",
          winnerPoints: 1,
          loserPoints: 0,
          reactionMs: 200,
          opponentReactionMs: 400,
          misses: [{ playerId: "host-id", reason: "offTarget" }]
        },
        {
          kind: "win",
          winnerId: "host-id",
          winnerZone: "headshot",
          loserZone: "bodyshot",
          winnerPoints: 2,
          loserPoints: 1,
          reactionMs: 300,
          opponentReactionMs: 400
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
          within(phone.getByText("Gil").parent!).getByText("4")
        ).toBeTruthy();
        expect(phone.getByText("Round 2 — Hana · 200ms")).toBeTruthy();
        expect(phone.getByText("Round 3 — Gil · 200ms")).toBeTruthy();
        expect(phone.getByText("Round 4 — Hana · 300ms")).toBeTruthy();
        expect(phone.getByText("Result saved")).toBeTruthy();
      }
      await view.unmount();
    }
  );
  it.each([
    {
      hostPitch: 0.9,
      hostHeading: 0,
      guestPitch: 1.1,
      winner: "Hana",
      miss: null
    },
    {
      hostPitch: 0.4,
      hostHeading: 0,
      guestPitch: 1.1,
      winner: "Gil",
      miss: /raised too little/i
    },
    {
      hostPitch: 0.4,
      hostHeading: 0,
      guestPitch: 0.4,
      winner: null,
      miss: /raised too little/i
    },
    {
      hostPitch: 1.3,
      hostHeading: 0,
      guestPitch: 1.1,
      winner: "Gil",
      miss: /raised too far|too high/i
    },
    {
      hostPitch: 0.9,
      hostHeading: 90,
      guestPitch: 1.1,
      winner: "Gil",
      miss: /off.target|aimed outside/i
    },
    {
      hostPitch: 0.9,
      hostHeading: NaN,
      guestPitch: 1.1,
      winner: "Gil",
      miss: /compass not ready/i
    }
  ])(
    "explains the result on both phones with a 2500ms gap: %p",
    async ({ hostPitch, hostHeading, guestPitch, winner, miss }) => {
      const { view, phones, calibrate, startRound, shoot } =
        await renderPhones();
      await calibrate("host");
      await calibrate("guest");
      await startRound();
      await advance(3000);
      await advance(200);
      await shoot("host", hostPitch, hostHeading);
      await advance(2500);
      await shoot("guest", guestPitch);

      for (const phone of [phones.host, phones.guest]) {
        expect(phone.getByText(/^200\s*ms$/)).toBeTruthy();
        expect(phone.getByText(/^2700\s*ms$/)).toBeTruthy();
        if (miss) {
          expect(
            phone.getByRole("image", {
              name: new RegExp(`Hana.*(?:${miss.source})`, "i")
            })
          ).toBeTruthy();
        } else {
          expect(phone.queryByRole("image", { name: /^Hana:/i })).toBeNull();
        }
        if (winner) {
          expect(phone.getByText(new RegExp(`^${winner} —`))).toBeTruthy();
          expect(phone.queryByText("Tie")).toBeNull();
        } else {
          expect(phone.getByText("Tie")).toBeTruthy();
          expect(phone.getByText(/both.*miss.*0.*points each/i)).toBeTruthy();
          expect(phone.queryByText(/sudden death/i)).toBeNull();
          for (const name of ["Hana", "Gil"]) {
            expect(
              phone.getByRole("image", {
                name: new RegExp(`${name}.*raised too little`, "i")
              })
            ).toBeTruthy();
          }
        }
      }
      await view.unmount();
    }
  );
  it("distinguishes a final equal-total draw from the individual round ties", async () => {
    const { view, phones, calibrate, startRound, shoot, nextRound, press } =
      await renderPhones();
    await calibrate("host");
    await calibrate("guest");
    for (const [index, { pitch, gap }] of [
      { pitch: 0.4, gap: 2500 },
      { pitch: 0.9, gap: 50 },
      { pitch: 1.1, gap: 100 }
    ].entries()) {
      if (index > 0) await nextRound();
      await startRound();
      await advance(3000);
      await advance(200);
      await shoot("host", pitch);
      await advance(gap);
      await shoot("guest", pitch);
    }
    // Level total points require one tiebreaker. Neither player fires.
    await nextRound();
    await startRound();
    await advance(3000);
    await advance(3250);
    for (const role of ["host", "guest"] as const) {
      await press(role, "See match result");
      const phone = phones[role];
      expect(phone.getByText("Match drawn")).toBeTruthy();
      expect(phone.getByText(/equal total points.*4 rounds/i)).toBeTruthy();
      expect(
        phone.getByText(/Round 1.*both.*miss.*0.*200.*2700/i)
      ).toBeTruthy();
      expect(
        phone.getByText(/Round 2.*bodyshots.*100 ms.*1 point each.*200.*250/i)
      ).toBeTruthy();
      expect(
        phone.getByText(/Round 3.*headshots.*100 ms.*2 points each.*200.*300/i)
      ).toBeTruthy();
      expect(phone.getByText(/Round 4.*both.*miss.*0/i)).toBeTruthy();
      for (const name of ["Hana", "Gil"]) {
        expect(
          within(phone.getByText(name).parent!).getByText("3")
        ).toBeTruthy();
      }
    }
    await view.unmount();
  });
  it("explains unfired timeouts without inventing a physical miss", async () => {
    const { view, phones, calibrate, startRound } = await renderPhones();
    await calibrate("host");
    await calibrate("guest");
    await startRound();
    await advance(3000);
    await advance(3250);
    for (const phone of [phones.host, phones.guest]) {
      for (const name of ["Hana", "Gil"]) {
        expect(
          phone.getByRole("image", {
            name: new RegExp(`${name}.*(?:no shot|did not fire)`, "i")
          })
        ).toBeTruthy();
      }
      expect(
        phone.queryByRole("image", { name: /too little|too far|off.target/i })
      ).toBeNull();
    }
    await view.unmount();
  });
});

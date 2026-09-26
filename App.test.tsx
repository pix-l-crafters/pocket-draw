import { render, userEvent } from "@testing-library/react-native";

import App from "./App";
import { challengeRequestRepository } from "./src/features/challenge/services/challengeRequestRepository";

jest.mock("@expo-google-fonts/barlow", () => ({
  Barlow_400Regular: "Barlow_400Regular",
  useFonts: () => [true]
}));

jest.mock("@expo-google-fonts/barlow-condensed", () => ({
  BarlowCondensed_700Bold: "BarlowCondensed_700Bold",
  useFonts: () => [true]
}));

jest.mock("@expo-google-fonts/ibm-plex-mono", () => ({
  IBMPlexMono_400Regular: "IBMPlexMono_400Regular",
  useFonts: () => [true]
}));

jest.mock("react-native-safe-area-context", () => {
  const { View } = require("react-native");

  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => (
      <View>{children}</View>
    ),
    SafeAreaView: ({ children }: { children: React.ReactNode }) => (
      <View>{children}</View>
    )
  };
});

jest.mock("react-native-paper", () => {
  const { Pressable, Text, View } = require("react-native");

  return {
    PaperProvider: ({ children }: { children: React.ReactNode }) => (
      <View>{children}</View>
    ),
    SegmentedButtons: ({
      buttons,
      onValueChange
    }: {
      buttons: { label: string; value: string }[];
      onValueChange: (value: string) => void;
    }) => (
      <View>
        {buttons.map((button) => (
          <Pressable
            accessibilityRole="button"
            key={button.value}
            onPress={() => onValueChange(button.value)}
          >
            <Text>{button.label}</Text>
          </Pressable>
        ))}
      </View>
    )
  };
});

jest.mock("./src/theme/appTheme", () => ({ appTheme: {} }));

jest.mock("./src/lib/useAuthUser", () => ({
  useAuthUser: () => ({
    displayName: "Tony",
    loading: false,
    user: { email: "tony@example.com", uid: "tony-123" }
  })
}));

jest.mock("./src/features/map/MapScreen", () => {
  const { Text } = require("react-native");

  return { MapScreen: () => <Text>Map screen</Text> };
});

jest.mock("./src/features/profile/ProfileScreen", () => {
  const { Text } = require("react-native");

  return { ProfileScreen: () => <Text>Profile screen</Text> };
});

jest.mock("./src/screens/LoginScreen", () => ({
  __esModule: true,
  default: () => null
}));

jest.mock("./src/screens/RegisterScreen", () => ({
  __esModule: true,
  default: () => null
}));

jest.mock("./src/features/duel/DuelScreen", () => {
  const { Text } = require("react-native");

  return { DuelScreen: () => <Text>Duel game</Text> };
});

jest.mock("./src/features/challenge/ChallengeScreen", () => {
  const { Pressable, Text } = require("react-native");

  return {
    ChallengeScreen: ({
      onOpponentConfirmed
    }: {
      onOpponentConfirmed: (opponent: {
        challengerId: string;
        discoveryToken: string;
        matchId: string;
        scannedPlayerId: string;
        scannedPlayerName: string;
      }) => void;
    }) => (
      <Pressable
        accessibilityRole="button"
        onPress={() =>
          onOpponentConfirmed({
            challengerId: "tony-123",
            discoveryToken: "token-123",
            matchId: "match-123",
            scannedPlayerId: "opponent-456",
            scannedPlayerName: "Opponent"
          })
        }
      >
        <Text>Confirm scanned opponent</Text>
      </Pressable>
    )
  };
});

jest.mock("./src/features/challenge/RoundCountSelector", () => {
  const { Pressable, Text } = require("react-native");

  return {
    RoundCountSelector: ({
      onRoundCountSelected
    }: {
      onRoundCountSelected: (handoff: {
        challengerId: string;
        discoveryToken: string;
        matchId: string;
        roundCount: 3;
        scannedPlayerId: string;
        scannedPlayerName: string;
      }) => void;
    }) => (
      <Pressable
        accessibilityRole="button"
        onPress={() =>
          onRoundCountSelected({
            challengerId: "tony-123",
            discoveryToken: "token-123",
            matchId: "match-123",
            roundCount: 3,
            scannedPlayerId: "opponent-456",
            scannedPlayerName: "Opponent"
          })
        }
      >
        <Text>Continue rounds</Text>
      </Pressable>
    )
  };
});

jest.mock("./src/features/challenge/ConnectingScreen", () => {
  const { Pressable, Text } = require("react-native");

  return {
    ConnectingScreen: ({
      handoff,
      onConnected
    }: {
      handoff: { matchId: string };
      onConnected: (channel: object, handoff: { matchId: string }) => void;
    }) => (
      <Pressable
        accessibilityRole="button"
        onPress={() => onConnected({}, handoff)}
      >
        <Text>Connection established</Text>
      </Pressable>
    )
  };
});

jest.mock(
  "./src/features/challenge/services/challengeRequestRepository",
  () => ({
    challengeRequestRepository: {
      sendChallenge: jest.fn().mockResolvedValue("request-123")
    }
  })
);

async function reachConnectingScreen() {
  const user = userEvent.setup();
  const screen = await render(<App />);

  await user.press(screen.getByText("Challenge"));
  await user.press(screen.getByText("Confirm scanned opponent"));
  await user.press(screen.getByText("Continue rounds"));

  return { screen, user };
}

describe("QR challenge flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("starts the direct QR connection without writing a Firestore request", async () => {
    const { screen } = await reachConnectingScreen();

    expect(screen.getByText("Connection established")).toBeTruthy();
    expect(challengeRequestRepository.sendChallenge).not.toHaveBeenCalled();
  });

  test("opens the duel after the connection succeeds", async () => {
    const { screen, user } = await reachConnectingScreen();

    await user.press(screen.getByText("Connection established"));

    expect(screen.getByText("Duel game")).toBeTruthy();
  });
});

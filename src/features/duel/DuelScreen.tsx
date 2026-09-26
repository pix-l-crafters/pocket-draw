import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { CutCornerButton } from "../../components/CutCornerButton";
import type { DuelChannel } from "../../contracts/duelChannel";
import type { RoundOutcome } from "../../contracts/roundOutcome";
import { MatchSummaryScreen } from "../postmatch/MatchSummaryScreen";
import type { DuelRole } from "./fireSignalCoordinator";
import { PreRound, type RssiReader } from "./PreRound";
import {
  applyRoundOutcome,
  createRoundLoop,
  isMatchDecided,
  toMatchResult
} from "./roundLoop";
import { RoundResultScreen } from "./RoundResultScreen";
import { judgeRoundShots, type RoundShots } from "./roundShots";

export type DuelPlayer = {
  id: string;
  name: string;
};

type DuelScreenProps = {
  channel: DuelChannel;
  matchId: string;
  onExit?: () => void;
  opponent: DuelPlayer;
  readRssi?: RssiReader;
  /** The host owns the countdown and the FIRE signal; the guest follows. */
  role: DuelRole;
  self: DuelPlayer;
};

export function DuelScreen({
  channel,
  matchId,
  onExit,
  opponent,
  readRssi,
  role,
  self
}: DuelScreenProps) {
  // ponytail: no BLE reader is wired into the duel yet, so the separation check
  // passes on a fixed reading. Pass `readRssi` once bleRssi.ts is hooked up.
  const readSeparation = useMemo<RssiReader>(
    () => readRssi ?? (async () => -75),
    [readRssi]
  );

  const [loop, setLoop] = useState(() =>
    createRoundLoop([self.id, opponent.id])
  );
  const [roundResult, setRoundResult] = useState<RoundOutcome | null>(null);
  // Lives above PreRound on purpose: the opponent can finish their ritual
  // while this device is still on the previous round's result screen, and a
  // latch scoped to one round would drop that message.
  const [peerReady, setPeerReady] = useState(false);

  useEffect(
    () =>
      channel.onMessage((message) => {
        if (message.type === "ready") setPeerReady(true);
      }),
    [channel]
  );

  const handleRoundShots = useCallback(
    (shots: RoundShots) => {
      // Both devices judge the same two reaction times, so they reach the same
      // outcome without either side being the scorer.
      const outcome = judgeRoundShots(self, opponent, shots);
      setLoop((state) => applyRoundOutcome(state, outcome));
      setRoundResult(outcome);
    },
    [opponent, self]
  );

  const consumePeerReady = useCallback(() => setPeerReady(false), []);

  const playerNames = { [self.id]: self.name, [opponent.id]: opponent.name };
  const matchDecided = isMatchDecided(loop);

  if (matchDecided && !roundResult) {
    return (
      <MatchSummaryScreen
        matchResult={toMatchResult(loop, matchId)}
        onRematch={() => {
          setLoop(createRoundLoop([self.id, opponent.id]));
          setRoundResult(null);
        }}
        onReturnToMap={onExit ?? (() => undefined)}
        playerNames={playerNames}
      />
    );
  }

  if (roundResult) {
    return (
      <RoundResultScreen
        continueLabel={matchDecided ? "See match result" : "Next round"}
        onContinue={() => setRoundResult(null)}
        outcome={roundResult}
        playerNames={playerNames}
        roundNumber={loop.rounds.length}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Keyed on the round: a fresh PreRound is the whole round reset. */}
      <PreRound
        key={loop.rounds.length}
        channel={channel}
        onCountdownStart={consumePeerReady}
        onRoundShots={handleRoundShots}
        peerReady={peerReady}
        readRssi={readSeparation}
        role={role}
      />
      {onExit && (
        <View style={styles.exitRow}>
          <CutCornerButton label="Exit" onPress={onExit} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  exitRow: {
    position: "absolute",
    right: 16,
    top: 16
  }
});

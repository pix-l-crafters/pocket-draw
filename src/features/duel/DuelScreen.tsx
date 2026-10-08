import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

import { CutCornerButton } from "../../components/CutCornerButton";
import type { DuelChannel } from "../../contracts/duelChannel";
import type { MatchResult } from "../../contracts/matchResult";
import type { RoundOutcome } from "../../contracts/roundOutcome";
import { submitMatchResult } from "../backend/matchResultsService";
import type { SubmitMatchResultOutcome } from "../backend/types";
import { MatchSummaryScreen } from "../postmatch/MatchSummaryScreen";
import { ClockOffsetCalibrator } from "./clockOffsetCalibrator";
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
  const [clockOffsetMs, setClockOffsetMs] = useState(0);
  const [clockCalibrationStatus, setClockCalibrationStatus] = useState<
    "calibrating" | "ready" | "failed"
  >("calibrating");
  const clockCalibratorRef = useRef<ClockOffsetCalibrator | null>(null);
  const calibrationGenerationRef = useRef(0);
  const runClockCalibration = useCallback(() => {
    const generation = ++calibrationGenerationRef.current;
    clockCalibratorRef.current?.dispose();
    const calibrator = new ClockOffsetCalibrator(channel);
    clockCalibratorRef.current = calibrator;
    setClockCalibrationStatus("calibrating");
    void calibrator
      .calibrate()
      .then((offsetMs) => {
        if (generation !== calibrationGenerationRef.current) return;
        setClockOffsetMs(offsetMs);
        setClockCalibrationStatus("ready");
      })
      .catch(() => {
        if (generation === calibrationGenerationRef.current) {
          setClockCalibrationStatus("failed");
        }
      });
  }, [channel]);
  useEffect(() => {
    runClockCalibration();
    return () => {
      calibrationGenerationRef.current += 1;
      clockCalibratorRef.current?.dispose();
      clockCalibratorRef.current = null;
    };
  }, [runClockCalibration]);
  const retryClockCalibration = runClockCalibration;
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
  const [rematchNumber, setRematchNumber] = useState(0);
  // Both phones derive the same ID for each rematch in this session.
  const currentMatchId =
    rematchNumber === 0 ? matchId : `${matchId}:rematch:${rematchNumber}`;
  const completedResult = useMemo(
    () => (matchDecided ? toMatchResult(loop, currentMatchId) : null),
    [currentMatchId, loop, matchDecided]
  );
  const [saveState, setSaveState] = useState<{
    result: MatchResult;
    status: SubmitMatchResultOutcome["status"] | "saving" | "error";
  } | null>(null);
  const savingResultRef = useRef<MatchResult | null>(null);
  const saveResult = useCallback(async () => {
    if (!completedResult || savingResultRef.current === completedResult) return;
    savingResultRef.current = completedResult;
    setSaveState({ result: completedResult, status: "saving" });
    try {
      const outcome = await submitMatchResult(completedResult, self.id);
      setSaveState({ result: completedResult, status: outcome.status });
    } catch {
      setSaveState({ result: completedResult, status: "error" });
    } finally {
      if (savingResultRef.current === completedResult)
        savingResultRef.current = null;
    }
  }, [completedResult, self.id]);

  useEffect(() => {
    void saveResult();
  }, [saveResult]);

  const saveStatus =
    saveState?.result === completedResult ? saveState?.status : "saving";
  const resultSaved = saveStatus === "written" || saveStatus === "queued";

  if (completedResult && !roundResult && resultSaved) {
    return (
      <MatchSummaryScreen
        matchResult={completedResult}
        onRematch={() => {
          setRematchNumber((number) => number + 1);
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
        continueDisabled={matchDecided && saveStatus === "saving"}
        continueLabel={
          !matchDecided
            ? "Next round"
            : saveStatus === "error"
              ? "Retry saving result"
              : resultSaved
                ? "See match result"
                : "Saving result…"
        }
        errorMessage={
          matchDecided && saveStatus === "error"
            ? "Could not save the match result. Please retry."
            : undefined
        }
        onContinue={() => {
          if (!matchDecided || resultSaved) setRoundResult(null);
          else if (saveStatus === "error") void saveResult();
        }}
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
        clockCalibrationStatus={clockCalibrationStatus}
        clockOffsetMs={clockOffsetMs}
        onCountdownStart={consumePeerReady}
        onRetryClockCalibration={retryClockCalibration}
        onRoundShots={handleRoundShots}
        peerReady={peerReady}
        readRssi={readSeparation}
        role={role}
      />
      {onExit && (
        <View style={styles.exitRow}>
          <CutCornerButton
            label="Exit"
            onPress={onExit}
          />
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

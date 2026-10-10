import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal, Platform, StyleSheet, View } from "react-native";

import { CutCornerButton } from "../../components/CutCornerButton";
import type { DuelMessage } from "../../contracts/duelChannel";
import type { DuelLink } from "../../contracts/duelLink";
import type {
  MatchAnalytics,
  RoundAnalytics,
  ShotDiagnostics
} from "../../contracts/matchAnalytics";
import type { MatchResult } from "../../contracts/matchResult";
import type { RoundOutcome } from "../../contracts/roundOutcome";
import { useMatchAnalytics } from "../../hooks/useMatchAnalytics";
import { colors } from "../../theme/tokens";
import {
  subscribeMatchResultStatus,
  submitMatchResult
} from "../backend/matchResultsService";
import type { SubmitMatchResultOutcome } from "../backend/types";
import { MatchSummaryScreen } from "../postmatch/MatchSummaryScreen";
import { generateMatchId } from "../qr/utils/qr.tokens";
import { AIM_TOLERANCE_DEGREES } from "./aimBearing";
import { ClockOffsetCalibrator } from "./clockOffsetCalibrator";
import { DuelDisconnectRecovery } from "./disconnectRecovery";
import { DrawCalibrationScreen } from "./DrawCalibrationScreen";
import {
  DuelConnectionScreen,
  type DuelConnectionState
} from "./DuelConnectionScreen";
import { DuelExitButton } from "./DuelExitButton";
import { FalseStartCoordinator } from "./falseStartCoordinator";
import type { DuelRole } from "./fireSignalCoordinator";
import { GameInstructionsScreen } from "./GameInstructionsScreen";
import type { PitchCalibration } from "./pitchMonitor";
import {
  BODYSHOT_MIN_F,
  BODYSHOT_MAX_F,
  HEADSHOT_DELTA_F
} from "./pitchZoneClassifier";
import { PreRound } from "./PreRound";
import {
  applyRoundOutcome,
  createRoundLoop,
  isMatchDecided,
  reconcileRounds,
  roundKeys,
  type RoundLoopState,
  toMatchResult
} from "./roundLoop";
import { RoundResultScreen } from "./RoundResultScreen";
import { judgeRoundShots, type RoundShots } from "./roundShots";

/** How often a reconnected phone re-asks for the opponent's rounds. */
const MATCH_SYNC_RETRY_MS = 500;
/** A reconnected opponent that never answers is as good as gone. */
const MATCH_SYNC_TIMEOUT_MS = 10_000;

export type DuelPlayer = {
  id: string;
  name: string;
};

type DuelScreenProps = {
  /** The live session; the duel ends by leaving it. */
  link: DuelLink;
  matchId: string;
  onExit?: () => void;
  opponent: DuelPlayer;
  /** The host owns the countdown and the FIRE signal; the guest follows. */
  role: DuelRole;
  self: DuelPlayer;
};

/**
 * - `offered`: this player asked and waits on the opponent.
 * - `invited`: the opponent asked; tapping Rematch accepts their match id.
 */
type RematchState =
  | { status: "idle" }
  | { status: "offered"; matchId: string }
  | { status: "invited"; matchId: string };

export function DuelScreen({
  link,
  matchId: firstMatchId,
  onExit,
  opponent,
  role,
  self
}: DuelScreenProps) {
  const { channel } = link;
  const [helpOpen, setHelpOpen] = useState(false);
  const [calibration, setCalibration] = useState<PitchCalibration | null>(null);
  const analyticsRoundsRef = useRef<RoundAnalytics[]>([]);
  const pendingShotRef = useRef<ShotDiagnostics | null>(null);
  const [confirmedAnalyticsHistory, setConfirmedAnalyticsHistory] = useState<
    string | null
  >(null);
  const [matchId, setMatchId] = useState(firstMatchId);
  const [audioMuted, setAudioMuted] = useState(false);
  const gameBeginStartedForMatchRef = useRef<string | null>(null);
  const falseStarts = useMemo(
    () => new FalseStartCoordinator(channel, self.id, opponent.id),
    [channel, self.id, opponent.id, matchId]
  );
  useEffect(() => () => falseStarts.dispose(), [falseStarts]);
  const matchIdRef = useRef(matchId);
  matchIdRef.current = matchId;
  const [loop, setLoop] = useState(() =>
    createRoundLoop([self.id, opponent.id])
  );
  // Channel handlers outlive renders, so they read the latest state here.
  const loopRef = useRef<RoundLoopState>(loop);
  loopRef.current = loop;

  const [clockOffsetMs, setClockOffsetMs] = useState(0);
  const [clockCalibrationStatus, setClockCalibrationStatus] = useState<
    "calibrating" | "ready" | "failed"
  >("calibrating");
  const clockCalibrationStatusRef = useRef(clockCalibrationStatus);
  clockCalibrationStatusRef.current = clockCalibrationStatus;
  const clockCalibratorRef = useRef<ClockOffsetCalibrator | null>(null);
  const calibrationGenerationRef = useRef(0);
  // Created on mount, not when calibration starts: it also answers the
  // opponent's pings while this player is still reading the instructions.
  useEffect(() => {
    const calibrator = new ClockOffsetCalibrator(channel);
    clockCalibratorRef.current = calibrator;
    return () => {
      calibrationGenerationRef.current += 1;
      calibrator.dispose();
      clockCalibratorRef.current = null;
    };
  }, [channel]);
  const runClockCalibration = useCallback(() => {
    const calibrator = clockCalibratorRef.current;
    if (!calibrator) return;
    const generation = ++calibrationGenerationRef.current;
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
  }, []);
  useEffect(() => {
    runClockCalibration();
  }, [runClockCalibration]);

  const [roundResult, setRoundResult] = useState<RoundOutcome | null>(null);
  const [roundShots, setRoundShots] = useState<RoundShots | null>(null);
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

  const safeSend = useCallback(
    (message: DuelMessage) => {
      try {
        channel.send(message);
        return true;
      } catch {
        // A drop surfaces through the link; there is nothing to send to.
        return false;
      }
    },
    [channel]
  );

  const [rematch, setRematchState] = useState<RematchState>({
    status: "idle"
  });
  const rematchRef = useRef(rematch);
  const setRematch = useCallback((next: RematchState) => {
    rematchRef.current = next;
    setRematchState(next);
  }, []);

  const startMatch = useCallback(
    (nextMatchId: string) => {
      const fresh = createRoundLoop([self.id, opponent.id]);
      loopRef.current = fresh;
      matchIdRef.current = nextMatchId;
      setMatchId(nextMatchId);
      setLoop(fresh);
      setRoundResult(null);
      analyticsRoundsRef.current = [];
      pendingShotRef.current = null;
      setConfirmedAnalyticsHistory(null);
      setPeerReady(false);
      setRematch({ status: "idle" });
    },
    [opponent.id, self.id, setRematch]
  );

  useEffect(
    () =>
      channel.onMessage((message) => {
        const decided = isMatchDecided(loopRef.current);
        const mine = rematchRef.current;
        if (message.type === "rematchOffer") {
          if (decided && mine.status === "offered") {
            // Both asked at once: each phone sees both ids and picks the
            // same. Confirm it too, in case this phone's offer went missing.
            const agreed =
              mine.matchId < message.matchId ? mine.matchId : message.matchId;
            safeSend({ type: "rematchAccept", matchId: agreed });
            startMatch(agreed);
          } else {
            // Kept even mid-match: the opponent can reach the summary first.
            setRematch({ status: "invited", matchId: message.matchId });
          }
        }
        if (
          message.type === "rematchAccept" &&
          decided &&
          mine.status === "offered"
        ) {
          // Usually this phone's own id; after crossed offers, the agreed one.
          startMatch(message.matchId);
        }
      }),
    [channel, safeSend, setRematch, startMatch]
  );

  const requestRematch = () => {
    const mine = rematchRef.current;
    // A second tap can land after the rematch already started.
    if (!isMatchDecided(loopRef.current) || mine.status === "offered") return;
    if (mine.status === "invited") {
      if (safeSend({ type: "rematchAccept", matchId: mine.matchId })) {
        startMatch(mine.matchId);
      }
      return;
    }
    const offeredMatchId = generateMatchId();
    if (safeSend({ type: "rematchOffer", matchId: offeredMatchId })) {
      setRematch({ status: "offered", matchId: offeredMatchId });
    }
  };

  const [connection, setConnection] = useState<
    DuelConnectionState | { status: "live" }
  >(() =>
    link.status() === "peerLeft" ? { status: "peerLeft" } : { status: "live" }
  );
  // Bumped on resume so the interrupted ritual restarts on both phones.
  const [resumeCount, setResumeCount] = useState(0);
  const syncingRef = useRef(false);
  const recoveryRef = useRef<DuelDisconnectRecovery | null>(null);

  const startRecovery = useCallback(() => {
    const recovery = recoveryRef.current;
    if (!recovery) return;
    syncingRef.current = false;
    // Cleared here, not on resume, so a `ready` the opponent sends right
    // after resuming is not wiped out.
    setPeerReady(false);
    const state = loopRef.current;
    void recovery
      .recover({
        phase: isMatchDecided(state) ? "match" : "round",
        roundNumber: state.rounds.length + 1,
        matchState: state
      })
      .then((result) => {
        if (recoveryRef.current !== recovery) return;
        if (result.status !== "recovered") {
          setConnection({ status: "lost" });
          return;
        }
        // The score stayed put while the link was down; settle it with the
        // opponent before the next round starts.
        syncingRef.current = true;
        setConnection({ status: "syncing" });
      });
  }, []);

  useEffect(() => {
    const recovery = new DuelDisconnectRecovery(link.channel, (signal) =>
      link.reconnect(signal)
    );
    recoveryRef.current = recovery;
    const stopWatchingRecovery = recovery.onState((state) => {
      if (state.status === "retrying") {
        setConnection({
          status: "reconnecting",
          attempt: state.attempt,
          maxAttempts: state.maxAttempts
        });
      }
    });
    const stopWatchingDrops = link.onDrop(startRecovery);
    const stopWatchingPeer = link.onPeerLeft(() => {
      syncingRef.current = false;
      setConnection({ status: "peerLeft" });
    });
    if (link.status() === "dropped") startRecovery();
    return () => {
      recoveryRef.current = null;
      stopWatchingRecovery();
      stopWatchingDrops();
      stopWatchingPeer();
      recovery.dispose();
    };
  }, [link, startRecovery]);

  useEffect(
    () =>
      channel.onMessage((message) => {
        if (message.type !== "matchSync") return;
        if (message.matchId !== matchIdRef.current) {
          if (isMatchDecided(loopRef.current)) {
            // The opponent started a rematch whose agreement was lost in the
            // drop: this phone has nothing left to play in its own match.
            startMatch(message.matchId);
          } else {
            // This phone is the one in the newer match; say which it is.
            if (!message.reply) {
              safeSend({
                type: "matchSync",
                matchId: matchIdRef.current,
                roundKeys: roundKeys(loopRef.current),
                warningCounts: falseStarts.getWarningCounts(),
                reply: true
              });
            }
            return;
          }
        }
        if (!message.reply) {
          safeSend({
            type: "matchSync",
            matchId: matchIdRef.current,
            roundKeys: roundKeys(loopRef.current),
            warningCounts: falseStarts.getWarningCounts(),
            reply: true
          });
        }
        const localKeys = roundKeys(loopRef.current);
        if (
          isMatchDecided(loopRef.current) &&
          JSON.stringify(message.roundKeys) === JSON.stringify(localKeys)
        ) {
          setConfirmedAnalyticsHistory(
            JSON.stringify([matchIdRef.current, localKeys])
          );
        }
        if (!syncingRef.current) return;

        syncingRef.current = false;
        const resumed = reconcileRounds(loopRef.current, message.roundKeys);
        analyticsRoundsRef.current = analyticsRoundsRef.current.slice(
          0,
          resumed.rounds.length
        );
        pendingShotRef.current = null;
        falseStarts.syncPeerWarningCount(message.warningCounts?.[opponent.id]);
        if (resumed !== loopRef.current) {
          setConfirmedAnalyticsHistory(null);
          loopRef.current = resumed;
          setLoop(resumed);
          setRoundResult(null);
        }
        setRematch({ status: "idle" });
        setResumeCount((count) => count + 1);
        setConnection({ status: "live" });
        if (clockCalibrationStatusRef.current === "failed") {
          runClockCalibration();
        }
      }),
    [
      channel,
      falseStarts,
      opponent.id,
      runClockCalibration,
      safeSend,
      setRematch,
      startMatch
    ]
  );

  // Messages sent in the instant the new DataChannel opens can be lost, so
  // keep asking until the opponent answers.
  useEffect(() => {
    if (connection.status !== "syncing") return undefined;
    const ask = () =>
      safeSend({
        type: "matchSync",
        matchId: matchIdRef.current,
        roundKeys: roundKeys(loopRef.current),
        warningCounts: falseStarts.getWarningCounts(),
        reply: false
      });
    ask();
    const timer = setInterval(ask, MATCH_SYNC_RETRY_MS);
    const giveUp = setTimeout(() => {
      syncingRef.current = false;
      setConnection({ status: "lost" });
    }, MATCH_SYNC_TIMEOUT_MS);
    return () => {
      clearInterval(timer);
      clearTimeout(giveUp);
    };
  }, [connection.status, falseStarts, safeSend]);

  const exit = () => {
    link.leave();
    onExit?.();
  };

  const handleRoundShots = useCallback(
    (shots: RoundShots) => {
      // Both devices judge the same captured shot zones and reaction times,
      // so they reach the same outcome without either side being the scorer.
      const outcome = judgeRoundShots(self, opponent, shots);
      const roundNumber = loopRef.current.rounds.length + 1;
      analyticsRoundsRef.current = [
        ...analyticsRoundsRef.current.slice(0, roundNumber - 1),
        {
          roundNumber,
          reactionMs: shots.selfReactionMs,
          zone: shots.selfZone,
          missReason:
            shots.falseStartPlayer === "self"
              ? null
              : shots.selfReactionMs === null
                ? "noShot"
                : (shots.selfMissReason ?? null),
          falseStarted: shots.falseStartPlayer === "self",
          shot: pendingShotRef.current
        }
      ];
      pendingShotRef.current = null;
      setLoop((state) => applyRoundOutcome(state, outcome));
      setRoundShots(shots);
      setRoundResult(outcome);
    },
    [opponent, self]
  );

  const consumePeerReady = useCallback(() => setPeerReady(false), []);

  const playerNames = { [self.id]: self.name, [opponent.id]: opponent.name };
  const matchDecided = isMatchDecided(loop);
  // `matchId` is the id both phones agreed for this match, so each rematch
  // saves under its own fresh id.
  const completedResult = useMemo(
    () => (matchDecided ? toMatchResult(loop, matchId) : null),
    [loop, matchDecided, matchId]
  );
  const analytics = useMemo<MatchAnalytics | null>(
    () =>
      completedResult && calibration
        ? {
            schemaVersion: 1,
            matchId: completedResult.matchId,
            playerId: self.id,
            participantIds: completedResult.participantIds,
            completedAt: completedResult.completedAt,
            platform: Platform.OS,
            clockOffsetMs,
            calibration,
            thresholds: {
              bodyshotMinF: BODYSHOT_MIN_F,
              bodyshotMaxF: BODYSHOT_MAX_F,
              headshotMaxF: BODYSHOT_MAX_F + HEADSHOT_DELTA_F,
              aimToleranceDegrees: AIM_TOLERANCE_DEGREES
            },
            rounds: analyticsRoundsRef.current.slice()
          }
        : null,
    [completedResult, calibration, self.id, clockOffsetMs]
  );
  const completedHistory = completedResult
    ? JSON.stringify([matchId, roundKeys(loop)])
    : null;
  // A locally judged final round may be discarded after a drop. Do not persist
  // immutable diagnostics until the peer confirms this exact completed history.
  useEffect(() => {
    if (
      !completedResult ||
      confirmedAnalyticsHistory === completedHistory ||
      connection.status !== "live"
    )
      return;
    const ask = () =>
      safeSend({
        type: "matchSync",
        matchId: completedResult.matchId,
        roundKeys: roundKeys(loopRef.current),
        warningCounts: falseStarts.getWarningCounts(),
        reply: false
      });
    ask();
    const timer = setInterval(ask, MATCH_SYNC_RETRY_MS);
    return () => clearInterval(timer);
  }, [
    completedResult,
    completedHistory,
    confirmedAnalyticsHistory,
    connection.status,
    falseStarts,
    safeSend
  ]);
  const analyticsSave = useMatchAnalytics(
    confirmedAnalyticsHistory === completedHistory ? analytics : null
  );
  const [saveState, setSaveState] = useState<{
    result: MatchResult;
    status: SubmitMatchResultOutcome["status"] | "saving" | "error";
  } | null>(null);
  useEffect(() => {
    if (!completedResult) return;
    return subscribeMatchResultStatus(
      completedResult.matchId,
      self.id,
      (status) => {
        setSaveState({ result: completedResult, status });
      }
    );
  }, [completedResult, self.id]);
  const savingResultRef = useRef<MatchResult | null>(null);
  const saveResult = useCallback(async () => {
    if (!completedResult || savingResultRef.current === completedResult) return;
    savingResultRef.current = completedResult;
    setSaveState({ result: completedResult, status: "saving" });
    try {
      const outcome = await submitMatchResult(completedResult, self.id);
      setSaveState({ result: completedResult, status: outcome.status });
    } catch (error) {
      console.warn("Could not save the match result:", error);
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

  // A finished match stays readable after the opponent leaves; only the
  // rematch offer goes away.
  const peerLeft = connection.status === "peerLeft";
  if (connection.status !== "live" && !(peerLeft && matchDecided)) {
    return (
      <DuelConnectionScreen
        onExit={exit}
        onRetry={startRecovery}
        opponentName={opponent.name}
        state={connection}
      />
    );
  }

  const exitControl = onExit ? (
    <View style={styles.exitRow}>
      <DuelExitButton onPress={exit} />
    </View>
  ) : null;

  if (!calibration) {
    return (
      <View style={styles.container}>
        <DrawCalibrationScreen
          clockCalibrationStatus={clockCalibrationStatus}
          onComplete={setCalibration}
          onRetryClockCalibration={runClockCalibration}
          paused={helpOpen}
        />
        <View style={styles.helpRow}>
          <CutCornerButton
            label="Help"
            onPress={() => setHelpOpen(true)}
          />
        </View>
        {exitControl}
        <Modal
          onRequestClose={() => setHelpOpen(false)}
          visible={helpOpen}
        >
          <GameInstructionsScreen onClose={() => setHelpOpen(false)} />
        </Modal>
      </View>
    );
  }

  if (completedResult && !roundResult) {
    return (
      <MatchSummaryScreen
        analyticsSaveStatus={analyticsSave.status ?? "waiting"}
        onRetryAnalytics={() => void analyticsSave.retry()}
        matchResult={completedResult}
        saveStatus={saveStatus}
        onRetrySave={() => void saveResult()}
        onRematch={requestRematch}
        onReturnToMap={exit}
        playerNames={playerNames}
        rematchDisabled={peerLeft || rematch.status === "offered"}
        rematchLabel={
          !peerLeft && rematch.status === "offered"
            ? `Waiting for ${opponent.name}…`
            : !peerLeft && rematch.status === "invited"
              ? "Accept rematch"
              : "Rematch"
        }
        rematchNote={
          peerLeft
            ? `${opponent.name} left the match`
            : rematch.status === "invited"
              ? `${opponent.name} wants a rematch`
              : undefined
        }
      />
    );
  }

  if (roundResult) {
    return (
      <RoundResultScreen
        audioMuted={audioMuted}
        continueDisabled={matchDecided && saveStatus === "saving"}
        continueLabel={
          !matchDecided
            ? "Next round"
            : saveStatus === "saving"
              ? "Saving result…"
              : "See match result"
        }
        errorMessage={
          matchDecided && saveStatus === "error"
            ? "Could not save the match result. Please retry."
            : undefined
        }
        onContinue={() => {
          if (!matchDecided || saveStatus !== "saving") setRoundResult(null);
        }}
        opponentReactionMs={roundShots?.opponentReactionMs ?? null}
        outcome={roundResult}
        playerNames={playerNames}
        selfReactionMs={roundShots?.selfReactionMs ?? null}
        selfZone={roundShots?.selfZone ?? "miss"}
        roundNumber={loop.rounds.length}
      />
    );
  }

  return (
    <View style={styles.container}>
      {exitControl}
      {/* Keyed on the match, round and resume: a fresh PreRound is the round
          reset. */}
      <PreRound
        audioMuted={audioMuted}
        key={`${matchId}:${loop.rounds.length}:${resumeCount}`}
        channel={channel}
        calibration={calibration}
        selfPlayerId={self.id}
        falseStarts={falseStarts}
        opponentName={opponent.name}
        selfName={self.name}
        clockCalibrationStatus={clockCalibrationStatus}
        clockOffsetMs={clockOffsetMs}
        onCountdownStart={consumePeerReady}
        onGameBeginStart={() => {
          gameBeginStartedForMatchRef.current = matchId;
        }}
        onToggleAudioMuted={() => setAudioMuted((muted) => !muted)}
        onRetryClockCalibration={runClockCalibration}
        onRoundShots={handleRoundShots}
        onShotDiagnostics={(shot) => {
          pendingShotRef.current = shot;
        }}
        peerReady={peerReady}
        playGameBegin={
          loop.rounds.length === 0 &&
          gameBeginStartedForMatchRef.current !== matchId
        }
        role={role}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  helpRow: {
    paddingHorizontal: 24,
    paddingBottom: 12
  },
  exitRow: {
    alignItems: "flex-end",
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    paddingTop: 8
  }
});

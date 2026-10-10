import { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  StyleSheet,
  Text,
  View
} from "react-native";
import Svg, {
  Circle,
  Line,
  Path,
  Rect,
  Text as SvgText
} from "react-native-svg";

import type {
  MissReason,
  TrackingMissReason
} from "../../contracts/roundOutcome";
import { colors, fonts } from "../../theme/tokens";

type IllustrationReason = MissReason | "falseStart";

const TRACKING_REASONS: ReadonlySet<IllustrationReason> =
  new Set<TrackingMissReason>([
    "tiltUnavailable",
    "compassUnavailable",
    "locationUnavailable",
    "opponentLocationUnavailable",
    "trackingUnavailable"
  ]);

const explanations: Record<
  IllustrationReason,
  { explanation: string; hint: string }
> = {
  tooLow: {
    explanation:
      "Raised too little: the phone was below the calibrated hit range.",
    hint: "Raise further toward your calibrated shoulder pose before firing."
  },
  tooHigh: {
    explanation:
      "Raised too far: the phone was above the calibrated hit range.",
    hint: "Lower your raise toward your calibrated shoulder pose before firing."
  },
  offTarget: {
    explanation: "Aimed outside the opponent's cone at the moment of firing.",
    hint: "Face your opponent and aim toward them before firing. The exact direction of the miss is not recorded."
  },
  tiltUnavailable: {
    explanation:
      "Couldn't read the phone's tilt when firing, so the shot couldn't be scored.",
    hint: "Check that motion access is on in Settings. If this keeps happening, restart Pocket Draw after the match."
  },
  compassUnavailable: {
    explanation:
      "Compass not ready: it was uncalibrated or not updating, so aim couldn't be checked.",
    hint: "Move the phone in a figure 8, away from metal and magnets, before the next round."
  },
  locationUnavailable: {
    explanation:
      "Location signal too weak: the phone had no recent GPS fix, so aim couldn't be checked.",
    hint: "Turn on precise location and move outside, away from tall buildings."
  },
  opponentLocationUnavailable: {
    explanation:
      "Couldn't get the opponent's location, so aim couldn't be checked.",
    hint: "The opponent should turn on precise location and move outside. Both phones need GPS."
  },
  trackingUnavailable: {
    explanation:
      "Tracking could not verify the shot; the exact cause wasn't recorded.",
    hint: "Check motion, compass, and precise location access, then hold steady with clear space between players."
  },
  noShot: {
    explanation: "Did not fire before time ran out.",
    hint: "After the FIRE cue, raise and tap FIRE or use a supported volume control before the timer ends."
  },
  falseStart: {
    explanation:
      "False start: movement or fire input was detected before the FIRE cue.",
    hint: "Stay still during the countdown; tap or use volume controls only after FIRE. You score 0 for this round."
  }
};

export function RoundIllustration({
  reason,
  playerName
}: {
  reason: IllustrationReason;
  playerName: string;
}) {
  const [progress] = useState(() => new Animated.Value(1));
  const isRaise = reason === "tooLow" || reason === "tooHigh";
  const isTracking = TRACKING_REASONS.has(reason);
  const { explanation, hint } = explanations[reason];

  useEffect(() => {
    progress.setValue(1);
    if (isTracking || reason === "noShot" || reason === "falseStart") return;

    let mounted = true;
    let preferenceResolved = false;
    let latestPreference: boolean | undefined;
    let played = false;
    let animation: Animated.CompositeAnimation | undefined;
    const settle = () => {
      animation?.stop();
      progress.setValue(1);
    };
    const applyPreference = (reduceMotion: boolean) => {
      if (reduceMotion) {
        settle();
      } else if (!played) {
        played = true;
        progress.setValue(0);
        animation = Animated.timing(progress, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true
        });
        animation.start();
      }
    };
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (enabled) => {
        latestPreference = enabled;
        if (mounted && preferenceResolved) applyPreference(enabled);
      }
    );
    // Start static. A newer settings event wins over a late initial query.
    void AccessibilityInfo.isReduceMotionEnabled().then(
      (enabled) => {
        if (!mounted) return;
        preferenceResolved = true;
        applyPreference(latestPreference ?? enabled);
      },
      () => {
        // If the initial preference cannot be read, remain static.
        if (mounted) settle();
      }
    );

    return () => {
      mounted = false;
      subscription.remove();
      settle();
    };
  }, [isTracking, progress, reason]);

  return (
    <View style={styles.card}>
      <Text style={styles.playerName}>{playerName}</Text>
      <View
        accessible
        accessibilityLabel={`${playerName}: ${explanation} ${hint}`}
        accessibilityRole="image"
        style={styles.picture}
      >
        <Svg
          height={112}
          viewBox="0 0 176 112"
          width={176}
        >
          {isRaise ? (
            <>
              <Rect
                x={66}
                y={37}
                width={80}
                height={16}
                rx={4}
                fill={colors.success}
                opacity={0.12}
              />
              <Line
                x1={66}
                y1={45}
                x2={146}
                y2={45}
                stroke={colors.success}
                strokeWidth={2}
                strokeDasharray="4 4"
              />
              <Circle
                cx={44}
                cy={18}
                r={8}
                fill="none"
                stroke={colors.textMuted60}
                strokeWidth={2}
              />
              <Path
                d="M44 27 L44 77 M44 77 L32 104 M44 77 L56 104 M44 43 L28 64"
                fill="none"
                stroke={colors.textMuted60}
                strokeWidth={2}
              />
              <Path
                d={
                  reason === "tooLow"
                    ? "M44 43 L77 73 L103 73"
                    : "M44 43 L77 20 L103 20"
                }
                fill="none"
                stroke={colors.warning}
                strokeWidth={3}
              />
              <Rect
                x={103}
                y={reason === "tooLow" ? 68 : 15}
                width={22}
                height={10}
                rx={2}
                fill="none"
                stroke={colors.warning}
                strokeWidth={2}
              />
            </>
          ) : reason === "offTarget" ? (
            <>
              <Path
                d="M84 76 L57 13 Q84 3 111 13 Z"
                fill={colors.success}
                opacity={0.1}
              />
              <Path
                d="M84 76 L57 13 M84 76 L111 13"
                fill="none"
                stroke={colors.success}
                strokeWidth={2}
                strokeDasharray="4 4"
              />
              <Rect
                x={74}
                y={78}
                width={20}
                height={26}
                rx={3}
                fill="none"
                stroke={colors.warning}
                strokeWidth={2}
              />
              <Path
                d="M84 71 L84 42 M79 47 L84 42 L89 47"
                fill="none"
                stroke={colors.warning}
                strokeWidth={3}
              />
              <Circle
                cx={139}
                cy={24}
                r={7}
                fill="none"
                stroke={colors.textMuted60}
                strokeWidth={2}
              />
              <Path
                d="M139 32 L139 57 M130 40 L148 40 M139 57 L131 70 M139 57 L147 70"
                fill="none"
                stroke={colors.textMuted60}
                strokeWidth={2}
              />
            </>
          ) : isTracking ? (
            <>
              <Rect
                x={25}
                y={31}
                width={26}
                height={48}
                rx={4}
                fill="none"
                stroke={colors.textMuted60}
                strokeWidth={2}
              />
              <Circle
                cx={116}
                cy={55}
                r={29}
                fill="none"
                stroke={colors.textMuted45}
                strokeWidth={2}
                strokeDasharray="4 5"
              />
              <Path
                d="M107 45 C107 33 125 33 125 45 C125 52 116 51 116 60"
                fill="none"
                stroke={colors.textMuted60}
                strokeWidth={3}
              />
              <Circle
                cx={116}
                cy={69}
                r={2}
                fill={colors.textMuted60}
              />
            </>
          ) : (
            <>
              <Circle
                cx={65}
                cy={55}
                r={32}
                fill="none"
                stroke={colors.warning}
                strokeWidth={2}
              />
              {reason === "falseStart" ? (
                <SvgText
                  x={65}
                  y={66}
                  fill={colors.warning}
                  fontFamily={fonts.mono}
                  fontSize={32}
                  textAnchor="middle"
                >
                  3
                </SvgText>
              ) : (
                <Path
                  d="M65 33 L65 55 L80 63 M65 17 L65 23"
                  fill="none"
                  stroke={colors.warning}
                  strokeWidth={3}
                />
              )}
              <Rect
                x={116}
                y={31}
                width={25}
                height={48}
                rx={4}
                fill="none"
                stroke={
                  reason === "falseStart" ? colors.warning : colors.textMuted45
                }
                strokeWidth={2}
              />
              <Path
                d={
                  reason === "falseStart"
                    ? "M113 24 L105 12 M128 22 L128 7 M143 24 L152 12"
                    : "M112 84 L146 26"
                }
                stroke={
                  reason === "falseStart" ? colors.warning : colors.textMuted60
                }
                strokeWidth={2}
              />
            </>
          )}
        </Svg>
        {(isRaise || reason === "offTarget") && (
          <Animated.View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                opacity: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.5, 1]
                }),
                transform: [
                  {
                    translateY: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [
                        reason === "tooLow" ? 8 : reason === "tooHigh" ? -8 : 0,
                        0
                      ]
                    })
                  }
                ]
              }
            ]}
          >
            <Svg
              height={112}
              viewBox="0 0 176 112"
              width={176}
            >
              {isRaise ? (
                <Path
                  d={
                    reason === "tooLow"
                      ? "M148 77 L148 59 M143 64 L148 59 L153 64"
                      : "M148 16 L148 33 M143 28 L148 33 L153 28"
                  }
                  fill="none"
                  stroke={colors.success}
                  strokeWidth={2}
                />
              ) : (
                <Circle
                  cx={139}
                  cy={43}
                  r={26}
                  fill="none"
                  stroke={colors.warning}
                  strokeWidth={2}
                  strokeDasharray="3 5"
                />
              )}
            </Svg>
          </Animated.View>
        )}
      </View>
      {isRaise && (
        <Text style={styles.reference}>Dashed band: calibrated hit range</Text>
      )}
      {reason === "offTarget" && (
        <Text style={styles.reference}>
          Aim cone schematic; actual direction not recorded
        </Text>
      )}
      {reason === "falseStart" && (
        <Text style={styles.reference}>
          Countdown schematic: activity before FIRE
        </Text>
      )}
      <Text style={styles.explanation}>{explanation}</Text>
      <Text style={styles.hint}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    gap: 8,
    padding: 16
  },
  playerName: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 22
  },
  picture: {
    alignSelf: "center",
    height: 112,
    width: 176
  },
  reference: {
    color: colors.success,
    fontFamily: fonts.mono,
    fontSize: 11
  },
  explanation: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 23
  },
  hint: {
    color: colors.textMuted60,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21
  }
});

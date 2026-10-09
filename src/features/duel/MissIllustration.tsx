import { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  StyleSheet,
  Text,
  View
} from "react-native";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";

import type { MissReason } from "../../contracts/roundOutcome";
import { colors, fonts } from "../../theme/tokens";

const explanations: Record<MissReason, { explanation: string; hint: string }> =
  {
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
    trackingUnavailable: {
      explanation:
        "Tracking could not verify the shot; its physical direction is unknown.",
      hint: "Check motion, compass, and precise location access, then hold steady with clear space between players."
    },
    noShot: {
      explanation: "Did not fire before time ran out.",
      hint: "After the FIRE cue, raise and tap FIRE or use a supported volume control before the timer ends."
    }
  };

export function MissIllustration({
  reason,
  playerName
}: {
  reason: MissReason;
  playerName: string;
}) {
  const [progress] = useState(() => new Animated.Value(1));
  const isRaise = reason === "tooLow" || reason === "tooHigh";
  const { explanation, hint } = explanations[reason];

  useEffect(() => {
    progress.setValue(1);
    if (reason === "trackingUnavailable" || reason === "noShot") return;

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
  }, [progress, reason]);

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
          ) : reason === "trackingUnavailable" ? (
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
              <Path
                d="M65 33 L65 55 L80 63 M65 17 L65 23"
                fill="none"
                stroke={colors.warning}
                strokeWidth={3}
              />
              <Rect
                x={116}
                y={31}
                width={25}
                height={48}
                rx={4}
                fill="none"
                stroke={colors.textMuted45}
                strokeWidth={2}
              />
              <Path
                d="M112 84 L146 26"
                stroke={colors.textMuted60}
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

import { View } from "react-native";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";

import { colors } from "../../theme/tokens";

type Pose = "ready" | "shoulder";

export function PoseIllustration({
  active,
  pose
}: {
  active: boolean;
  pose: Pose;
}) {
  const stroke = active ? colors.accent : colors.textMuted45;
  return (
    <View
      accessibilityLabel={
        pose === "ready"
          ? "Arm down, phone top edge toward the ground"
          : "Arm at shoulder height, phone top edge forward"
      }
      accessibilityRole="image"
      testID={`${pose}-pose-illustration`}
    >
      <Svg
        height={68}
        viewBox="0 0 96 80"
        width={82}
      >
        <Circle
          cx={26}
          cy={10}
          fill="none"
          r={6}
          stroke={stroke}
          strokeWidth={2}
        />
        <Line
          stroke={stroke}
          strokeWidth={2}
          x1={26}
          x2={26}
          y1={17}
          y2={50}
        />
        <Path
          d="M26 50 L18 76 M26 50 L34 76"
          fill="none"
          stroke={stroke}
          strokeWidth={2}
        />
        {pose === "ready" ? (
          <>
            <Path
              d="M26 27 L18 46 M26 27 L39 48"
              fill="none"
              stroke={stroke}
              strokeWidth={2}
            />
            <Rect
              fill="none"
              height={24}
              rx={2}
              stroke={stroke}
              strokeWidth={2}
              width={10}
              x={36}
              y={49}
            />
            <Line
              stroke={stroke}
              strokeWidth={3}
              x1={37}
              x2={45}
              y1={72}
              y2={72}
            />
            <Path
              d="M59 50 L59 70 M54 65 L59 70 L64 65"
              fill="none"
              stroke={stroke}
              strokeWidth={2}
            />
          </>
        ) : (
          <>
            <Path
              d="M26 27 L18 46 M26 27 L45 27 L57 27"
              fill="none"
              stroke={stroke}
              strokeWidth={2}
            />
            <Rect
              fill="none"
              height={10}
              rx={2}
              stroke={stroke}
              strokeWidth={2}
              width={22}
              x={57}
              y={22}
            />
            <Line
              stroke={stroke}
              strokeWidth={3}
              x1={78}
              x2={78}
              y1={23}
              y2={31}
            />
            <Path
              d="M82 27 L94 27 M89 22 L94 27 L89 32"
              fill="none"
              stroke={stroke}
              strokeWidth={2}
            />
          </>
        )}
      </Svg>
    </View>
  );
}

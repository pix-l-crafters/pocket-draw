import { Marker, type LatLng } from "react-native-maps";

type PlayerMarkerProps = {
  coordinate: LatLng;
  description?: string;
  name: string;
  /** When set, tapping the pin calls this instead of showing a native callout. */
  onPress?: () => void;
  pinColor: string;
};

export function PlayerMarker({
  coordinate,
  description,
  name,
  onPress,
  pinColor
}: PlayerMarkerProps) {
  return (
    <Marker
      accessibilityLabel={`${name} player marker`}
      coordinate={coordinate}
      description={onPress ? undefined : description}
      onPress={onPress}
      pinColor={pinColor}
      title={onPress ? undefined : name}
    />
  );
}

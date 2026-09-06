import { Marker, type LatLng } from "react-native-maps";

type PlayerMarkerProps = {
  coordinate: LatLng;
  description?: string;
  name: string;
  pinColor: string;
};

export function PlayerMarker({
  coordinate,
  description = "Mock player",
  name,
  pinColor
}: PlayerMarkerProps) {
  return (
    <Marker
      accessibilityLabel={`${name} player marker`}
      coordinate={coordinate}
      description={description}
      pinColor={pinColor}
      title={name}
    />
  );
}

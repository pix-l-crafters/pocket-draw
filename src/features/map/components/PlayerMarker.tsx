import { Marker, type LatLng } from "react-native-maps";

type PlayerMarkerProps = {
  coordinate: LatLng;
  name: string;
  pinColor: string;
};

export function PlayerMarker({
  coordinate,
  name,
  pinColor
}: PlayerMarkerProps) {
  return (
    <Marker
      accessibilityLabel={`${name} mock player marker`}
      coordinate={coordinate}
      description="Mock player"
      pinColor={pinColor}
      title={name}
    />
  );
}

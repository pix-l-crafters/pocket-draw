import { NativeModule, requireNativeModule } from "expo";

type VolumeDirection = "up" | "down";

declare class VolumeFireModule extends NativeModule {
  addListener(
    eventName: "onVolumeButton",
    listener: (event: { direction: VolumeDirection }) => void
  ): { remove(): void };
}

export function subscribeVolumeFire(
  onFire: (event: { direction: VolumeDirection }) => void
): () => void {
  const subscription = requireNativeModule<VolumeFireModule>(
    "VolumeFire"
  ).addListener("onVolumeButton", onFire);
  return () => subscription.remove();
}

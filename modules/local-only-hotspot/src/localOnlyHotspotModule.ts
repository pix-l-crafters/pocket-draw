import { NativeModule, requireNativeModule } from "expo";

import type { LocalOnlyHotspotNetwork } from "./localOnlyHotspot.types";

declare class LocalOnlyHotspotModule extends NativeModule {
  startAsync(): Promise<LocalOnlyHotspotNetwork>;
  stop(): void;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<LocalOnlyHotspotModule>("LocalOnlyHotspot");

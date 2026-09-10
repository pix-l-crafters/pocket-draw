export const PUBLIC_LOCATION_DECIMAL_PLACES = 3;

/**
 * Nearby players whose presence has not been refreshed within this window are
 * hidden from the map. The window is generous for now because presence is only
 * published once per map visit; it tightens once continuous publishing lands.
 */
export const PRESENCE_STALE_AFTER_MS = 10 * 60 * 1000;

/** Deterministic marker colours assigned to other players by their uid. */
export const PLAYER_PIN_COLORS = [
  "#7F56D9",
  "#F04438",
  "#12B76A",
  "#F79009",
  "#2E90FA",
  "#EE46BC",
  "#15B79E",
  "#6172F3"
] as const;

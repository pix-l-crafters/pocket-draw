/** Four decimal places is a ~11 m × 9 m cell (see docs/adr/0002). */
export const PUBLIC_LOCATION_DECIMAL_PLACES = 4;

/** Inclusive radius for the nearby count, using published player locations. */
export const NEARBY_RADIUS_METRES = 500;

/** Minimum movement (metres) before the OS reports a new position. */
export const LOCATION_WATCH_DISTANCE_M = 10;

/**
 * Minimum movement (metres) from the last published position before presence
 * moves, so GPS jitter near a cell edge does not flip between cells.
 */
export const PRESENCE_MIN_MOVE_METRES = 10;

/** Markers closer than this on screen (points) are merged into one cluster. */
export const CLUSTER_RADIUS_PT = 44;

/**
 * Presence is re-published on this interval even when the player has not moved,
 * so `lastSeen` stays fresh and other clients can tell who is still online.
 */
export const PRESENCE_HEARTBEAT_MS = 60 * 1000;

/** Retry a failed presence write this many times before surfacing an error. */
export const PRESENCE_MAX_PUBLISH_RETRIES = 3;

/** First retry delay; each subsequent retry doubles it (2s, 4s, 8s). */
export const PRESENCE_RETRY_BASE_DELAY_MS = 2000;

/**
 * Nearby players whose presence has not been refreshed within this window are
 * hidden from the map — three missed heartbeats.
 */
export const PRESENCE_STALE_AFTER_MS = 3 * PRESENCE_HEARTBEAT_MS;

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

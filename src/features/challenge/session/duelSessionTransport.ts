import type { DuelChannel } from "../../../contracts/duelChannel";
import type { DuelSessionParams } from "./duelSession.types";

export type DuelTransportConnection = {
  channel: DuelChannel;
  /** Registers a callback for an unexpected drop after connect succeeded. */
  onDrop: (handler: (message: string) => void) => void;
  disconnect: () => void;
};

/**
 * A way to establish one duel connection. `connect` rejects if the attempt
 * fails; callers (see `useDuelSession`) own the retry policy. `signal` aborts
 * an in-flight attempt when the user cancels.
 */
export interface DuelSessionTransport {
  connect(
    params: DuelSessionParams,
    signal: AbortSignal
  ): Promise<DuelTransportConnection>;
}

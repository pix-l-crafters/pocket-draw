import { useCallback, useEffect, useRef, useState } from "react";

import {
  DUEL_CONNECT_MAX_AUTO_RETRIES,
  DUEL_CONNECT_RETRY_DELAY_MS
} from "../session/duelSession.constants";
import type {
  DuelSessionParams,
  DuelSessionState
} from "../session/duelSession.types";
import type {
  DuelSessionTransport,
  DuelTransportConnection
} from "../session/duelSessionTransport";
import { mockDuelSessionTransport } from "../session/mockDuelSessionTransport";
import { abortableDelay, isAbortError } from "../session/sessionUtils";

type UseDuelSessionResult = {
  state: DuelSessionState;
  /** Restart from a `failed` / `disconnected` state, or after `cancel`. */
  retry: () => void;
  /** Give up: abort any in-flight attempt and settle on `idle`. */
  cancel: () => void;
};

function getParamsKey(params: DuelSessionParams | null) {
  if (!params) {
    return null;
  }

  return `${params.role}:${params.matchId}:${params.discoveryToken}`;
}

/**
 * Opens a duel connection for a handed-off challenge and owns the retry policy:
 * the first attempt plus `DUEL_CONNECT_MAX_AUTO_RETRIES` automatic retries, then
 * `failed` until the user retries manually. A drop after connecting surfaces as
 * `disconnected`. Currently backed by `mockDuelSessionTransport` — swap for the
 * real BLE transport once design doc §9 is solved.
 */
export function useDuelSession(
  params: DuelSessionParams | null,
  transport: DuelSessionTransport = mockDuelSessionTransport
): UseDuelSessionResult {
  const [state, setState] = useState<DuelSessionState>({ status: "idle" });
  const [attemptEpoch, setAttemptEpoch] = useState(0);
  const [cancelled, setCancelled] = useState(false);

  // Callers pass a fresh `params` object each render; the string key is the
  // stable identity the connect effect keys on.
  const paramsKey = getParamsKey(params);
  const paramsRef = useRef(params);
  paramsRef.current = params;

  // A fresh challenge clears any earlier cancel / manual-retry state.
  useEffect(() => {
    setCancelled(false);
    setAttemptEpoch(0);
  }, [paramsKey]);

  useEffect(() => {
    const activeParams = paramsRef.current;

    if (!activeParams || cancelled) {
      setState({ status: "idle" });
      return;
    }

    const controller = new AbortController();
    let disposed = false;
    let connection: DuelTransportConnection | null = null;

    const run = async () => {
      const maxAttempts = DUEL_CONNECT_MAX_AUTO_RETRIES + 1;

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        if (disposed) {
          return;
        }

        setState({ status: "connecting", attempt });

        try {
          connection = await transport.connect(activeParams, controller.signal);

          if (disposed) {
            connection.disconnect();
            return;
          }

          connection.onDrop((message) => {
            if (!disposed) {
              setState({ status: "disconnected", message });
            }
          });

          setState({ status: "connected", channel: connection.channel });
          return;
        } catch (error) {
          if (disposed || isAbortError(error)) {
            return;
          }

          const message =
            error instanceof Error ? error.message : "Connection failed.";

          if (attempt < maxAttempts) {
            setState({ status: "retrying", attempt, message });
            try {
              await abortableDelay(
                DUEL_CONNECT_RETRY_DELAY_MS,
                controller.signal
              );
            } catch {
              return;
            }
          } else {
            setState({ status: "failed", message });
          }
        }
      }
    };

    void run();

    return () => {
      disposed = true;
      controller.abort();
      connection?.disconnect();
    };
  }, [paramsKey, attemptEpoch, cancelled, transport]);

  const retry = useCallback(() => {
    setCancelled(false);
    setAttemptEpoch((count) => count + 1);
  }, []);

  const cancel = useCallback(() => {
    setCancelled(true);
  }, []);

  return { state, retry, cancel };
}

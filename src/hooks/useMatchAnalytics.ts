import { useCallback, useEffect, useRef, useState } from "react";

import type { MatchAnalytics } from "../contracts/matchAnalytics";
import {
  submitMatchAnalytics,
  subscribeAnalyticsStatus,
  type AnalyticsSaveStatus
} from "../features/backend/matchAnalytics";

/** Analytics failure is visible but never blocks match scoring or navigation. */
export function useMatchAnalytics(data: MatchAnalytics | null) {
  const current = useRef(data);
  current.current = data;
  const [state, setState] = useState<{
    data: MatchAnalytics;
    status: AnalyticsSaveStatus;
  } | null>(null);
  const retry = useCallback(async () => {
    if (!data) return;
    setState({ data, status: "saving" });
    try {
      const status = await submitMatchAnalytics(data);
      if (current.current === data) setState({ data, status });
    } catch {
      if (current.current === data) setState({ data, status: "error" });
    }
  }, [data]);
  useEffect(() => {
    if (!data) return;
    const stop = subscribeAnalyticsStatus(
      data.matchId,
      data.playerId,
      (status) => {
        if (current.current === data) setState({ data, status });
      }
    );
    void retry();
    return stop;
  }, [data, retry]);
  useEffect(
    () => () => {
      current.current = null;
    },
    []
  );
  return {
    status: data && state?.data === data ? state.status : undefined,
    retry
  };
}

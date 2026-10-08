import { useEffect } from "react";

import { startMatchResultQueueSync } from "../features/backend/matchResultsService";
import { auth } from "../lib/firebase";

/** A queue listener belongs to one authenticated app session. */
export function useMatchResultQueueSync(uid: string | null): void {
  useEffect(() => {
    if (!uid) return;
    const user = auth.currentUser;
    return startMatchResultQueueSync(() =>
      auth.currentUser === user && user?.uid === uid ? uid : null
    );
  }, [uid]);
}

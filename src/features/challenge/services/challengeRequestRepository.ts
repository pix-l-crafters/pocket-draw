//→ 负责把 challenge 数据写进 Firestore
// repository 文件 = 实际填写和保存表格的人
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  Timestamp,
  updateDoc
} from "firebase/firestore";

import type { ChallengeHandoff } from "../../../contracts/challengeHandoff";
import { db } from "../../../lib/firebase";
import type { ChallengeRequestStatus } from "../types/challengeRequest.types";

const CHALLENGE_LIFETIME_MS = 60_000;

export type SendChallengeResult = {
  requestId: string;
}; //要返回的是ID

export type ChallengeRequestRepository = {
  sendChallenge(handoff: ChallengeHandoff): Promise<SendChallengeResult>; //这是保证要返回的意思
  updateStatus(
    requestId: string,
    status: Exclude<ChallengeRequestStatus, "pending">
  ): Promise<void>;
};

export const challengeRequestRepository: ChallengeRequestRepository = {
  async updateStatus(requestId, status) {
    if (!requestId.trim() || requestId.includes("/")) {
      throw new Error("A valid challenge request ID is required.");
    }
    await updateDoc(doc(db, "challengeRequests", requestId), { status });
  },
  async sendChallenge(handoff) {
    if (!handoff.challengerId.trim()) {
      throw new Error("A challenger ID is required.");
    }
    if (!handoff.scannedPlayerId.trim()) {
      throw new Error("A scanned player ID is required.");
    }
    if (handoff.challengerId === handoff.scannedPlayerId) {
      throw new Error("A player cannot challenge themselves.");
    }
    const requestDocument = await addDoc(collection(db, "challengeRequests"), {
      challengerId: handoff.challengerId,
      scannedPlayerId: handoff.scannedPlayerId,
      scannedPlayerName: handoff.scannedPlayerName,
      matchId: handoff.matchId,
      status: "pending",
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromMillis(
        //运行时真正调用函数
        Date.now() + CHALLENGE_LIFETIME_MS
      )
    });
    return {
      requestId: requestDocument.id
    };
  }
};

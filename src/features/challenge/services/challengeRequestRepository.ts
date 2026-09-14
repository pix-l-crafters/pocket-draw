//→ 负责把 challenge 数据写进 Firestore
// repository 文件 = 实际填写和保存表格的人
import {
  addDoc,
  collection,
  serverTimestamp,
  Timestamp
} from "firebase/firestore";
import { db } from "../../../lib/firebase";
import type { ChallengeHandoff } from "../../../contracts/challengeHandoff";

const CHALLENGE_LIFETIME_MS = 60_000;

export type SendChallengeResult = {
  requestId: string;
}; //要返回的是ID

export type ChallengeRequestRepository = {
  sendChallenge(handoff: ChallengeHandoff): Promise<SendChallengeResult>; //这是保证要返回的意思
};

export const challengeRequestRepository: ChallengeRequestRepository = {
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
      ...handoff,
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

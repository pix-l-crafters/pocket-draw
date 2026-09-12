// Firestore uses Timestamp for persisted date and time values.
// → 描述的是challenge 数据长什么样子
// types 文件 = 表格设计图
import type { ChallengeHandoff } from "../../../contracts/challengeHandoff";
import type { Timestamp } from "firebase/firestore";

export type ChallengeRequestStatus = "pending" | "accepted" | "declined";
export interface ChallengeRequest extends ChallengeHandoff {
  id: string;
  status: ChallengeRequestStatus;
  createdAt: Timestamp; //调用的是类型
  expiresAt: Timestamp;
}

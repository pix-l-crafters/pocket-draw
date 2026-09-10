export type QrInvitePayload = {
  // 323 + 200
  type: "pocket-draw/invite"; //数据部分：19 结构部分：4+1 = 5
  version: 1; // 数据部分：1  结构部分：7+1 = 8
  matchId: string; //邀请对应的对局 ID 数据部分：36 结构：9
  hostPlayerId: string; //发起人的fireBase UID 数据部分：128 结构：13
  hostPlayerName?: string; //仅显示名字 数据部分：64 结构：17
  challengeToken: string; // 数据部分：32 结构：16
  issuedAt: number; // 数据部分：16 结构：10
  expiresAt: number; // 数据部分：16 结构：11
  transport: "ble"; // 数据部分：3 结构： 11
  ble: {
    discoveryToken: string; // 数据部分：8 结构：7
  };
};

/** Reasons a QR invite payload can fail validation, reported back to the caller. */
export type QrValidationErrorCode =
  | "TOO_LARGE"
  | "MALFORMED_JSON"
  | "INVALID_PAYLOAD"
  | "UNSUPPORTED_VERSION"
  | "UNSUPPORTED_TRANSPORT"
  | "EXPIRED"
  | "INVALID_TIME"
  | "SELF_INVITE";

// 验证结果类型
export type QrValidationResult =
  | { ok: true; value: QrInvitePayload }
  | { ok: false; code: QrValidationErrorCode };

//Parsing succeeded
const now = Date.now();
const exampleInvite: QrInvitePayload = {
  type: "pocket-draw/invite",
  version: 1,
  matchId: "test-match-001",
  hostPlayerId: "test-host-002",
  hostPlayerName: "hostName",
  challengeToken: "9f08bc127e44a031b69307dc84f2a658", // gitleaks:allow fixed example token, not a real secret
  issuedAt: now,
  expiresAt: now + 60_000,
  transport: "ble",
  ble: {
    discoveryToken: "a71c9b82"
  }
};

const encodedInvite = JSON.stringify(exampleInvite);
console.log("Encoded:", encodedInvite);

const decodedInvite: unknown = JSON.parse(encodedInvite);
console.log("Decoded:", decodedInvite);

//无效 JSON 会发生什么？ Parsing failed
try {
  JSON.parse('{"version": 1}');
  console.log("Parsing succeeded");
} catch (error) {
  console.log("Parsing failed; error caught");
}

export type QrInvitePayload = {
    type: "pocket-draw/invite";
    version:  1;
    matchId: string; //邀请对应的对局 ID
    hostPlayerId: string; //发起人的fireBase UID
    hostPlayerName?: string; //仅显示名字
    challengeToken: string;
    issuedAt: number;
    expiresAt: number;
    transport: "ble";
    ble: {
    discoveryToken: string;
   };
};
//Parsing succeeded
const now = Date.now();
const exampleInvite: QrInvitePayload = {
    type:"pocket-draw/invite",
    version: 1,
    matchId: "test-match-001",
    hostPlayerId:"test-host-002",
    hostPlayerName: "hostName",
    challengeToken:"9f08bc127e44a031b69307dc84f2a658",
    issuedAt: now,
    expiresAt: now + 120_000,
    transport: "ble",
    ble :{
        discoveryToken: "a71c9b82"
    }
}

const encodedInvite = JSON.stringify(exampleInvite);
console.log("Encoded:", encodedInvite);

const decodedInvite: unknown = JSON.parse(encodedInvite);
console.log("Decoded:", decodedInvite);

//无效 JSON 会发生什么？ Parsing failed
try {
    JSON.parse('{"version": 1}');
    console.log("Parsing succeeded");
} catch (error) {
    console.log("Parsing failed; error caugth");
}
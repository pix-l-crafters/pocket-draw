import {
  SignalingFrameDecoder,
  encodeSignalingMessage,
  isAuthorizedPeer
} from "./signalingProtocol";

const auth = {
  matchId: "0f9ee81d-68f0-47cb-8977-702fae0d1865",
  challengeToken: "0123456789abcdef0123456789abcdef",
  discoveryToken: "89abcdef"
};

describe("signaling protocol", () => {
  it("reassembles a fragmented frame and preserves a following frame", () => {
    const decoder = new SignalingFrameDecoder();
    const first = encodeSignalingMessage({ type: "auth", ...auth });
    const second = encodeSignalingMessage({ type: "auth-ok" });

    expect(decoder.push(first.slice(0, 17))).toEqual([]);
    expect(decoder.push(first.slice(17) + second)).toEqual([
      { type: "auth", ...auth },
      { type: "auth-ok" }
    ]);
  });

  it("rejects an invalid signaling frame instead of forwarding untrusted data", () => {
    const decoder = new SignalingFrameDecoder();

    expect(() => decoder.push('{"type":"offer","sdp":7}\n')).toThrow(
      "Invalid signaling message"
    );
  });

  it("authorizes only an exact match, challenge token, and discovery token", () => {
    expect(isAuthorizedPeer(auth, auth)).toBe(true);
    expect(
      isAuthorizedPeer(auth, { ...auth, discoveryToken: "00000000" })
    ).toBe(false);
    expect(
      isAuthorizedPeer(auth, {
        ...auth,
        challengeToken: "ffffffffffffffffffffffffffffffff"
      })
    ).toBe(false);
    expect(
      isAuthorizedPeer(auth, {
        ...auth,
        matchId: "bfb8e9a1-a63b-4dfa-83b8-ecb8bc416446"
      })
    ).toBe(false);
  });
});

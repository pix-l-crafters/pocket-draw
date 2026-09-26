import type {
  PeerConnectionLike,
  SignalingSocket,
  WebRtcSessionDependencies
} from "./webrtcDuelTransport";
import {
  connectWebRtcDuelGuest,
  hostWebRtcDuelSession
} from "./webrtcDuelTransport";

const auth = {
  matchId: "0f9ee81d-68f0-47cb-8977-702fae0d1865",
  challengeToken: "0123456789abcdef0123456789abcdef",
  discoveryToken: "89abcdef"
};

class MemorySocket implements SignalingSocket {
  peer: MemorySocket | null = null;
  closed = false;
  propagateClose = false;
  private messageHandlers = new Set<(message: string) => void>();
  private closeHandlers = new Set<() => void>();

  send(data: string) {
    queueMicrotask(() => {
      for (const handler of this.peer?.messageHandlers ?? []) {
        handler(data);
      }
    });
  }

  onMessage(handler: (data: string) => void) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onClose(handler: () => void) {
    this.closeHandlers.add(handler);
    return () => this.closeHandlers.delete(handler);
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    for (const handler of this.closeHandlers) handler();
    if (this.propagateClose) queueMicrotask(() => this.peer?.close());
  }
}

function socketPair(): [MemorySocket, MemorySocket] {
  const host = new MemorySocket();
  const guest = new MemorySocket();
  host.peer = guest;
  guest.peer = host;
  return [host, guest];
}

type ChannelHandler = ((event?: any) => void) | null;

class PairedDataChannel {
  readyState = "connecting";
  peer: PairedDataChannel | null = null;
  onopen: ChannelHandler = null;
  onmessage: ChannelHandler = null;
  onclose: ChannelHandler = null;
  onerror: ChannelHandler = null;

  send(data: string) {
    queueMicrotask(() => this.peer?.onmessage?.({ data }));
  }

  close() {
    this.readyState = "closed";
    this.onclose?.();
  }

  open() {
    this.readyState = "open";
    this.onopen?.();
  }
}

type PeerEvent = "icecandidate" | "datachannel" | "connectionstatechange";

class FakePeer implements PeerConnectionLike {
  connectionState = "new";
  localDescription: { type: "offer" | "answer"; sdp: string } | null = null;
  remoteDescription: { type: "offer" | "answer"; sdp: string } | null = null;
  addedCandidates: unknown[] = [];
  closed = false;
  counterpart: FakePeer | null = null;
  hostChannel: PairedDataChannel | null = null;
  guestChannel: PairedDataChannel | null = null;
  delayGuestChannelOpen = false;
  delayDataChannelEvent = false;
  private handlers = new Map<PeerEvent, Set<(event: any) => void>>();

  addEventListener(type: PeerEvent, handler: (event: any) => void) {
    const handlers = this.handlers.get(type) ?? new Set();
    handlers.add(handler);
    this.handlers.set(type, handlers);
  }

  removeEventListener(type: PeerEvent, handler: (event: any) => void) {
    this.handlers.get(type)?.delete(handler);
  }

  private emit(type: PeerEvent, event: any) {
    for (const handler of this.handlers.get(type) ?? []) handler(event);
  }

  createDataChannel() {
    const host = new PairedDataChannel();
    const guest = new PairedDataChannel();
    host.peer = guest;
    guest.peer = host;
    this.hostChannel = host;
    this.guestChannel = guest;
    return host;
  }

  async createOffer() {
    return { type: "offer" as const, sdp: "host-only-offer" };
  }

  async createAnswer() {
    return { type: "answer" as const, sdp: "guest-answer" };
  }

  async setLocalDescription(description: any) {
    this.localDescription = description;
    queueMicrotask(() =>
      this.emit("icecandidate", {
        candidate: {
          candidate: "candidate:host 1 udp 1 192.168.1.2 5000 typ host",
          sdpMid: "0",
          sdpMLineIndex: 0
        }
      })
    );
  }

  async setRemoteDescription(description: any) {
    this.remoteDescription = description;
    if (description.type === "offer") {
      const hostPeer = this.counterpart;
      if (this.delayDataChannelEvent) {
        setTimeout(
          () => this.emit("datachannel", { channel: hostPeer?.guestChannel }),
          0
        );
      } else {
        this.emit("datachannel", { channel: hostPeer?.guestChannel });
      }
    }
    if (description.type === "answer") {
      this.connectionState = "connected";
      if (this.counterpart) {
        this.counterpart.connectionState = this.delayGuestChannelOpen
          ? "connecting"
          : "connected";
      }
      this.hostChannel?.open();
      if (this.delayGuestChannelOpen) {
        setTimeout(() => {
          if (this.counterpart) this.counterpart.connectionState = "connected";
          this.guestChannel?.open();
        }, 0);
      } else {
        this.guestChannel?.open();
      }
    }
  }

  async addIceCandidate(candidate: unknown) {
    this.addedCandidates.push(candidate);
  }

  close() {
    this.closed = true;
    this.connectionState = "closed";
  }
}

function peerPair(): [FakePeer, FakePeer] {
  const host = new FakePeer();
  const guest = new FakePeer();
  host.counterpart = guest;
  guest.counterpart = host;
  return [host, guest];
}

describe("WebRTC duel session signaling", () => {
  it("authenticates before exchanging SDP and hands both peers a live DuelChannel", async () => {
    const [hostSocket, guestSocket] = socketPair();
    const [hostPeer, guestPeer] = peerPair();
    const hostDeps: WebRtcSessionDependencies = {
      createPeerConnection: () => hostPeer
    };
    const guestDeps: WebRtcSessionDependencies = {
      createPeerConnection: () => guestPeer
    };

    const [hostConnection, guestConnection] = await Promise.all([
      hostWebRtcDuelSession(
        hostSocket,
        auth,
        new AbortController().signal,
        hostDeps
      ),
      connectWebRtcDuelGuest(
        guestSocket,
        auth,
        new AbortController().signal,
        guestDeps
      )
    ]);

    const received: unknown[] = [];
    guestConnection.channel.onMessage((message) => received.push(message));
    hostConnection.channel.send({ type: "fire", atMs: 2500 });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(received).toEqual([{ type: "fire", atMs: 2500 }]);
    expect(hostPeer.localDescription?.type).toBe("offer");
    expect(guestPeer.localDescription?.type).toBe("answer");
    expect(guestPeer.addedCandidates).toHaveLength(1);
    expect(hostSocket.closed).toBe(true);
    expect(guestSocket.closed).toBe(true);
  });

  it("lets the guest DataChannel open after the host closes signaling", async () => {
    const [hostSocket, guestSocket] = socketPair();
    hostSocket.propagateClose = true;
    const [hostPeer, guestPeer] = peerPair();
    hostPeer.delayGuestChannelOpen = true;
    guestPeer.delayDataChannelEvent = true;

    const [hostConnection, guestConnection] = await Promise.all([
      hostWebRtcDuelSession(hostSocket, auth, new AbortController().signal, {
        createPeerConnection: () => hostPeer
      }),
      connectWebRtcDuelGuest(guestSocket, auth, new AbortController().signal, {
        createPeerConnection: () => guestPeer
      })
    ]);

    const received: unknown[] = [];
    hostConnection.channel.onMessage((message) => received.push(message));
    guestConnection.channel.send({
      type: "challenge",
      playerId: "guest-id",
      playerName: "Guest"
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(received).toEqual([
      { type: "challenge", playerId: "guest-id", playerName: "Guest" }
    ]);
  });

  it("rejects a peer with the wrong QR secret before creating an offer", async () => {
    const [hostSocket, guestSocket] = socketPair();
    const [hostPeer, guestPeer] = peerPair();

    const hostResult = hostWebRtcDuelSession(
      hostSocket,
      auth,
      new AbortController().signal,
      { createPeerConnection: () => hostPeer }
    );
    const guestResult = connectWebRtcDuelGuest(
      guestSocket,
      { ...auth, discoveryToken: "00000000" },
      new AbortController().signal,
      { createPeerConnection: () => guestPeer }
    );

    await expect(hostResult).rejects.toThrow("QR credentials were rejected");
    await expect(guestResult).rejects.toThrow("QR credentials were rejected");
    expect(hostPeer.localDescription).toBeNull();
  });

  it("aborts negotiation and closes the signaling and peer connections", async () => {
    const [hostSocket] = socketPair();
    const [hostPeer] = peerPair();
    const controller = new AbortController();
    const result = hostWebRtcDuelSession(hostSocket, auth, controller.signal, {
      createPeerConnection: () => hostPeer
    });

    controller.abort();

    await expect(result).rejects.toMatchObject({ name: "AbortError" });
    expect(hostSocket.closed).toBe(true);
    expect(hostPeer.closed).toBe(true);
  });
});

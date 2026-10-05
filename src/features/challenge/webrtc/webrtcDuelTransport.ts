import type { DuelTransportConnection } from "../session/duelSessionTransport";
import {
  createDuelDataChannelConnection,
  type RtcDataChannelLike
} from "./duelDataChannel";
import {
  encodeSignalingMessage,
  isAuthorizedPeer,
  SignalingFrameDecoder,
  type IceCandidateDescription,
  type SessionDescription,
  type SignalingMessage,
  type WebRtcSessionAuth
} from "./signalingProtocol";

export interface SignalingSocket {
  send(data: string): void;
  onMessage(handler: (data: string) => void): () => void;
  onClose(handler: () => void): () => void;
  close(): void;
}

type PeerEvent = "icecandidate" | "datachannel" | "connectionstatechange";

export interface PeerConnectionLike {
  connectionState: string;
  localDescription: SessionDescription | null;
  remoteDescription: SessionDescription | null;
  createDataChannel(
    label: string,
    options?: { ordered?: boolean }
  ): RtcDataChannelLike;
  createOffer(): Promise<SessionDescription>;
  createAnswer(): Promise<SessionDescription>;
  setLocalDescription(description: SessionDescription): Promise<void>;
  setRemoteDescription(description: SessionDescription): Promise<void>;
  addIceCandidate(candidate: IceCandidateDescription): Promise<void>;
  addEventListener(type: PeerEvent, handler: (event: any) => void): void;
  removeEventListener(type: PeerEvent, handler: (event: any) => void): void;
  close(): void;
}

export type WebRtcSessionDependencies = {
  createPeerConnection: () => PeerConnectionLike;
  /** Give up when the DataChannel has not opened by then. */
  negotiationTimeoutMs?: number;
};

/**
 * Local-network ICE settles in a few seconds; past this the peer is gone or
 * unreachable, and failing lets the guest retry and frees the host's slot.
 */
export const DEFAULT_NEGOTIATION_TIMEOUT_MS = 20_000;

/** Decides whether the credentials a guest presents open this host's session. */
export type HostAuthorizer = (received: WebRtcSessionAuth) => boolean;

/** An authorizer that accepts exactly one set of QR credentials. */
export function acceptOnly(expected: WebRtcSessionAuth): HostAuthorizer {
  return (received) => isAuthorizedPeer(expected, received);
}

function abortError(): Error {
  const error = new Error("Connection attempt cancelled.");
  error.name = "AbortError";
  return error;
}

function normalizeCandidate(candidate: any): IceCandidateDescription {
  if (typeof candidate?.toJSON === "function") {
    return candidate.toJSON() as IceCandidateDescription;
  }
  return {
    candidate: candidate.candidate,
    sdpMid: candidate.sdpMid ?? null,
    sdpMLineIndex: candidate.sdpMLineIndex ?? null,
    usernameFragment: candidate.usernameFragment ?? null
  };
}

type NegotiationSide =
  | { role: "host"; authorize: HostAuthorizer }
  | { role: "guest"; auth: WebRtcSessionAuth };

function negotiateWebRtcDuel(
  side: NegotiationSide,
  socket: SignalingSocket,
  signal: AbortSignal,
  dependencies: WebRtcSessionDependencies
): Promise<DuelTransportConnection> {
  const { role } = side;
  const peer = dependencies.createPeerConnection();
  const decoder = new SignalingFrameDecoder();

  return new Promise((resolve, reject) => {
    let settled = false;
    let authenticated = false;
    let dataChannel: RtcDataChannelLike | null = null;
    let messageQueue = Promise.resolve();
    // Candidates can overtake the offer/answer they belong to, and WebRTC
    // rejects a candidate before the remote description is set.
    let remoteDescriptionSet = false;
    const pendingCandidates: IceCandidateDescription[] = [];
    const cleanups: Array<() => void> = [];

    const send = (message: SignalingMessage) => {
      socket.send(encodeSignalingMessage(message));
    };

    const finishCleanup = (closePeer: boolean) => {
      for (const cleanup of cleanups.splice(0)) cleanup();
      socket.close();
      if (closePeer) peer.close();
    };

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      finishCleanup(true);
      reject(error);
    };

    const connectChannel = (channel: RtcDataChannelLike) => {
      dataChannel = channel;
      const complete = () => {
        if (settled) return;
        settled = true;
        finishCleanup(false);
        resolve(createDuelDataChannelConnection(channel));
      };
      if (channel.readyState === "open") {
        complete();
      } else {
        channel.onopen = complete;
        channel.onerror = () =>
          fail(new Error("WebRTC DataChannel failed to open."));
        channel.onclose = () =>
          fail(new Error("WebRTC DataChannel closed before opening."));
      }
    };

    const onIceCandidate = (event: any) => {
      if (!authenticated) return;
      if (event.candidate) {
        send({
          type: "ice-candidate",
          candidate: normalizeCandidate(event.candidate)
        });
      } else {
        send({ type: "ice-complete" });
      }
    };
    peer.addEventListener("icecandidate", onIceCandidate);
    cleanups.push(() =>
      peer.removeEventListener("icecandidate", onIceCandidate)
    );

    const onConnectionStateChange = () => {
      if (
        peer.connectionState === "failed" ||
        peer.connectionState === "closed" ||
        peer.connectionState === "disconnected"
      ) {
        fail(new Error("WebRTC peer connection failed."));
      }
    };
    peer.addEventListener("connectionstatechange", onConnectionStateChange);
    cleanups.push(() =>
      peer.removeEventListener("connectionstatechange", onConnectionStateChange)
    );

    if (role === "guest") {
      const onDataChannel = (event: { channel?: RtcDataChannelLike }) => {
        if (!event.channel) {
          fail(new Error("Host did not provide a duel DataChannel."));
          return;
        }
        connectChannel(event.channel);
      };
      peer.addEventListener("datachannel", onDataChannel);
      cleanups.push(() =>
        peer.removeEventListener("datachannel", onDataChannel)
      );
    }

    const applyRemoteDescription = async (description: SessionDescription) => {
      await peer.setRemoteDescription(description);
      remoteDescriptionSet = true;
      for (const candidate of pendingCandidates.splice(0)) {
        await peer.addIceCandidate(candidate);
      }
    };

    const addRemoteCandidate = async (candidate: IceCandidateDescription) => {
      if (!remoteDescriptionSet) {
        pendingCandidates.push(candidate);
        return;
      }
      await peer.addIceCandidate(candidate);
    };

    const handleMessage = async (message: SignalingMessage) => {
      if (message.type === "error") {
        fail(new Error(message.message));
        return;
      }

      if (side.role === "host" && !authenticated) {
        if (
          message.type !== "auth" ||
          !side.authorize({
            matchId: message.matchId,
            challengeToken: message.challengeToken,
            discoveryToken: message.discoveryToken
          })
        ) {
          send({
            type: "error",
            code: "UNAUTHORIZED",
            message: "QR credentials were rejected."
          });
          fail(new Error("QR credentials were rejected."));
          return;
        }
        authenticated = true;
        send({ type: "auth-ok" });
        const channel = peer.createDataChannel("pocket-draw-duel", {
          ordered: true
        });
        connectChannel(channel);
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        send({ type: "offer", sdp: offer.sdp });
        return;
      }

      if (role === "guest" && !authenticated) {
        if (message.type !== "auth-ok") {
          fail(new Error("Host rejected the signaling protocol."));
          return;
        }
        authenticated = true;
        return;
      }

      if (!authenticated) return;

      if (message.type === "offer" && role === "guest") {
        await applyRemoteDescription({ type: "offer", sdp: message.sdp });
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        send({ type: "answer", sdp: answer.sdp });
      } else if (message.type === "answer" && role === "host") {
        await applyRemoteDescription({ type: "answer", sdp: message.sdp });
      } else if (message.type === "ice-candidate") {
        await addRemoteCandidate(message.candidate);
      }
    };

    cleanups.push(
      socket.onMessage((chunk) => {
        try {
          for (const message of decoder.push(chunk)) {
            messageQueue = messageQueue
              .then(() => handleMessage(message))
              .catch((error: unknown) => {
                fail(
                  error instanceof Error
                    ? error
                    : new Error("WebRTC signaling failed.")
                );
              });
          }
        } catch (error) {
          send({
            type: "error",
            code: "PROTOCOL",
            message: "Invalid signaling message."
          });
          fail(
            error instanceof Error
              ? error
              : new Error("Invalid signaling message.")
          );
        }
      })
    );
    cleanups.push(
      socket.onClose(() => {
        // The host can close signaling after its DataChannel opens before
        // the guest receives the channel event. Its answer is already sent.
        if (
          !settled &&
          !(role === "guest" && peer.localDescription?.type === "answer")
        ) {
          fail(new Error("Signaling connection closed too early."));
        }
      })
    );

    const onAbort = () => fail(abortError());
    signal.addEventListener("abort", onAbort, { once: true });
    cleanups.push(() => signal.removeEventListener("abort", onAbort));

    const timeout = setTimeout(
      () => fail(new Error("The duel connection timed out.")),
      dependencies.negotiationTimeoutMs ?? DEFAULT_NEGOTIATION_TIMEOUT_MS
    );
    cleanups.push(() => clearTimeout(timeout));

    if (signal.aborted) {
      onAbort();
    } else if (side.role === "guest") {
      send({ type: "auth", ...side.auth });
    }
  });
}

export function hostWebRtcDuelSession(
  socket: SignalingSocket,
  authorize: HostAuthorizer,
  signal: AbortSignal,
  dependencies: WebRtcSessionDependencies
): Promise<DuelTransportConnection> {
  return negotiateWebRtcDuel(
    { role: "host", authorize },
    socket,
    signal,
    dependencies
  );
}

export function connectWebRtcDuelGuest(
  socket: SignalingSocket,
  auth: WebRtcSessionAuth,
  signal: AbortSignal,
  dependencies: WebRtcSessionDependencies
): Promise<DuelTransportConnection> {
  return negotiateWebRtcDuel(
    { role: "guest", auth },
    socket,
    signal,
    dependencies
  );
}

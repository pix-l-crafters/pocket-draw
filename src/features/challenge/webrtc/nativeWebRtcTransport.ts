import TcpSocket from "react-native-tcp-socket";
import {
  RTCIceCandidate,
  RTCPeerConnection,
  type RTCSessionDescription
} from "react-native-webrtc";

import type { DuelTransportConnection } from "../session/duelSessionTransport";
import type { DuelSessionTransport } from "../session/duelSessionTransport";
import type { RtcDataChannelLike } from "./duelDataChannel";
import type {
  PeerConnectionLike,
  SignalingSocket,
  WebRtcSessionDependencies
} from "./webrtcDuelTransport";
import {
  connectWebRtcDuelGuest,
  hostWebRtcDuelSession
} from "./webrtcDuelTransport";
import type {
  IceCandidateDescription,
  SessionDescription,
  WebRtcSessionAuth
} from "./signalingProtocol";

type NativeSocket = ReturnType<typeof TcpSocket.createConnection>;
type NativePeer = InstanceType<typeof RTCPeerConnection>;
type NativeDataChannel = ReturnType<NativePeer["createDataChannel"]>;
type NativeEventTarget = {
  addEventListener(type: string, handler: (event: any) => void): void;
  removeEventListener(type: string, handler: (event: any) => void): void;
};

function createAbortError(): Error {
  const error = new Error("Connection attempt cancelled.");
  error.name = "AbortError";
  return error;
}

function wrapTcpSocket(socket: NativeSocket): SignalingSocket {
  socket.setEncoding("utf8");
  socket.setNoDelay(true);

  return {
    send(data) {
      socket.write(data, "utf8");
    },
    onMessage(handler) {
      const listener = (data: string | Uint8Array) => handler(String(data));
      socket.on("data", listener);
      return () => socket.off("data", listener);
    },
    onClose(handler) {
      socket.on("close", handler);
      return () => socket.off("close", handler);
    },
    close() {
      if (!socket.destroyed) socket.destroy();
    }
  };
}

function wrapNativeDataChannel(channel: NativeDataChannel): RtcDataChannelLike {
  const events = channel as unknown as NativeEventTarget;
  const wrapped: RtcDataChannelLike = {
    get readyState() {
      return channel.readyState;
    },
    send(data) {
      channel.send(data);
    },
    close() {
      channel.close();
    },
    onopen: null,
    onmessage: null,
    onclose: null,
    onerror: null
  };

  events.addEventListener("message", (event: any) =>
    wrapped.onmessage?.({ data: event.data })
  );
  events.addEventListener("close", () => wrapped.onclose?.());
  events.addEventListener("error", (event: any) => wrapped.onerror?.(event));
  events.addEventListener("open", () => {
    wrapped.onopen?.();
  });
  return wrapped;
}

function normalizeDescription(
  description: RTCSessionDescription | null
): SessionDescription | null {
  if (!description || !description.sdp) return null;
  return {
    type: description.type as "offer" | "answer",
    sdp: description.sdp
  };
}

function createNativePeerConnection(): PeerConnectionLike {
  const peer = new RTCPeerConnection({ iceServers: [] });
  const peerEvents = peer as unknown as NativeEventTarget;
  const channelCache = new WeakMap<object, RtcDataChannelLike>();
  const eventWrappers = new Map<
    string,
    Map<(event: any) => void, (event: any) => void>
  >();

  const wrapChannel = (channel: NativeDataChannel) => {
    const cached = channelCache.get(channel);
    if (cached) return cached;
    const wrapped = wrapNativeDataChannel(channel);
    channelCache.set(channel, wrapped);
    return wrapped;
  };

  return {
    get connectionState() {
      return peer.connectionState;
    },
    get localDescription() {
      return normalizeDescription(peer.localDescription);
    },
    get remoteDescription() {
      return normalizeDescription(peer.remoteDescription);
    },
    createDataChannel(label, options) {
      return wrapChannel(peer.createDataChannel(label, options));
    },
    async createOffer() {
      const description = await peer.createOffer();
      return { type: "offer", sdp: description.sdp };
    },
    async createAnswer() {
      const description = await peer.createAnswer();
      return { type: "answer", sdp: description.sdp };
    },
    setLocalDescription(description) {
      return peer.setLocalDescription(description);
    },
    setRemoteDescription(description) {
      return peer.setRemoteDescription(description);
    },
    addIceCandidate(candidate: IceCandidateDescription) {
      return peer.addIceCandidate(new RTCIceCandidate(candidate));
    },
    addEventListener(type, handler) {
      const wrapped =
        type === "datachannel"
          ? (event: any) => handler({ channel: wrapChannel(event.channel) })
          : handler;
      const handlers = eventWrappers.get(type) ?? new Map();
      handlers.set(handler, wrapped);
      eventWrappers.set(type, handlers);
      peerEvents.addEventListener(type, wrapped);
    },
    removeEventListener(type, handler) {
      const wrapped = eventWrappers.get(type)?.get(handler) ?? handler;
      peerEvents.removeEventListener(type, wrapped);
      eventWrappers.get(type)?.delete(handler);
    },
    close() {
      peer.close();
    }
  };
}

const nativeDependencies: WebRtcSessionDependencies = {
  createPeerConnection: createNativePeerConnection
};

export type WebRtcDuelHost = {
  port: number;
  connection: Promise<DuelTransportConnection>;
  stop: () => void;
};

export async function startNativeWebRtcDuelHost(
  auth: WebRtcSessionAuth,
  options: { port?: number; signal?: AbortSignal } = {}
): Promise<WebRtcDuelHost> {
  if (options.signal?.aborted) throw createAbortError();
  const controller = new AbortController();
  const externalSignal = options.signal;
  const abortFromExternal = () => controller.abort();
  externalSignal?.addEventListener("abort", abortFromExternal, { once: true });

  let activeSocket: NativeSocket | null = null;
  let resolveConnection!: (connection: DuelTransportConnection) => void;
  let rejectConnection!: (error: Error) => void;
  const connection = new Promise<DuelTransportConnection>((resolve, reject) => {
    resolveConnection = resolve;
    rejectConnection = reject;
  });

  const server = TcpSocket.createServer({ noDelay: true }, (socket) => {
    if (activeSocket) {
      socket.destroy();
      return;
    }
    activeSocket = socket;
    server.close();
    void hostWebRtcDuelSession(
      wrapTcpSocket(socket),
      auth,
      controller.signal,
      nativeDependencies
    ).then(resolveConnection, rejectConnection);
  });

  const port = await new Promise<number>((resolve, reject) => {
    const onError = (error: Error) => reject(error);
    const onAbort = () => {
      server.close();
      reject(createAbortError());
    };
    server.once("error", onError);
    controller.signal.addEventListener("abort", onAbort, { once: true });
    server.listen({ port: options.port ?? 0, host: "0.0.0.0" }, () => {
      server.off("error", onError);
      controller.signal.removeEventListener("abort", onAbort);
      const address = server.address();
      if (!address) {
        reject(new Error("Local signaling server did not expose a port."));
        return;
      }
      resolve(address.port);
    });
  });

  const stop = () => {
    controller.abort();
    if (server.listening) server.close();
    if (activeSocket && !activeSocket.destroyed) activeSocket.destroy();
    externalSignal?.removeEventListener("abort", abortFromExternal);
  };
  controller.signal.addEventListener(
    "abort",
    () => {
      if (server.listening) server.close();
      if (activeSocket && !activeSocket.destroyed) activeSocket.destroy();
      rejectConnection(createAbortError());
    },
    { once: true }
  );

  if (controller.signal.aborted) {
    stop();
    throw createAbortError();
  }

  return { port, connection, stop };
}

export function connectNativeWebRtcDuelGuest(
  hostIp: string,
  signalPort: number,
  auth: WebRtcSessionAuth,
  signal: AbortSignal
): Promise<DuelTransportConnection> {
  if (signal.aborted) return Promise.reject(createAbortError());

  return new Promise((resolve, reject) => {
    let connected = false;
    const socket = TcpSocket.createConnection(
      {
        host: hostIp,
        port: signalPort,
        interface: "wifi",
        connectTimeout: 10_000
      },
      () => {
        connected = true;
        cleanupConnectListeners();
        void connectWebRtcDuelGuest(
          wrapTcpSocket(socket),
          auth,
          signal,
          nativeDependencies
        ).then(resolve, reject);
      }
    );

    const onError = (error: Error) => {
      if (!connected) {
        cleanupConnectListeners();
        socket.destroy();
        reject(error);
      }
    };
    const onAbort = () => {
      cleanupConnectListeners();
      socket.destroy();
      reject(createAbortError());
    };
    const cleanupConnectListeners = () => {
      socket.off("error", onError);
      signal.removeEventListener("abort", onAbort);
    };

    socket.on("error", onError);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export function createNativeWebRtcGuestTransport(target: {
  hostIp: string;
  signalPort: number;
  challengeToken: string;
}): DuelSessionTransport {
  return {
    connect(params, signal) {
      return connectNativeWebRtcDuelGuest(
        target.hostIp,
        target.signalPort,
        {
          matchId: params.matchId,
          challengeToken: target.challengeToken,
          discoveryToken: params.discoveryToken
        },
        signal
      );
    }
  };
}
